-- ============================================================================
-- Seed Data: Test Data Only
-- 
-- NOTE: All reference/enum-like data is now seeded in migrations:
-- - entity_types, product_mediums, product_formats, etc. → 002_create_reference_tables.sql
-- - pull_list_statuses, character_role_types → 002_create_reference_tables.sql (consolidated)
--
-- This file contains only test data for development/testing:
-- - Sample users/profiles (creators)
-- - Sample products/SKUs
-- - Sample collections
-- - Sample likes, follows
--
-- IMPORTANT: Run migrations 001-014 BEFORE running this seed file!
-- ============================================================================

-- ============================================================================
-- SAMPLE CREATORS → auth.users → profiles
-- ============================================================================
-- NOTE: entity_type_code uses 'person' (from entity_types), NOT 'creator'
-- Creator is a ROLE of a person, not a separate entity type

WITH creators AS (
  SELECT * FROM (VALUES
    ('frank-miller','Frank Miller','frank-miller@creators.local',
      'Frank Miller is an American comic book writer, penciller, inker, and film director known for his dark, film noir-style comic book stories and graphic novels.',
      '1957-01-27','American','http://frankmillerink.com',
      'http://okikio.dev/resource/persons/frank-miller'),
    ('alan-moore','Alan Moore','alan-moore@creators.local',
      'Alan Moore is an English writer known primarily for his work in comic books including Watchmen, V for Vendetta, and Swamp Thing.',
      '1953-11-18','British',NULL,
      'http://okikio.dev/resource/persons/alan-moore'),
    ('neil-gaiman','Neil Gaiman','neil-gaiman@creators.local',
      'Neil Gaiman is an English author best known for The Sandman comic series.',
      '1960-11-10','British-American','http://neilgaiman.com',
      'http://okikio.dev/resource/persons/neil-gaiman'),
    ('brian-k-vaughan','Brian K. Vaughan','brian-k-vaughan@creators.local',
      'Brian K. Vaughan is an American comic book and television writer.',
      '1976-07-17','American','http://www.panelsyndicate.com',
      'http://okikio.dev/resource/persons/brian-k-vaughan'),
    ('grant-morrison','Grant Morrison','grant-morrison@creators.local',
      'Grant Morrison is a Scottish comic book writer known for nonlinear narratives.',
      '1960-01-31','Scottish','http://www.grant-morrison.com',
      'http://okikio.dev/resource/persons/grant-morrison'),
    ('jim-lee','Jim Lee','jim-lee@creators.local',
      'Jim Lee is a Korean-American comic book artist and publisher.',
      '1964-08-11','Korean-American','http://jimlee.com',
      'http://okikio.dev/resource/persons/jim-lee'),
    ('todd-mcfarlane','Todd McFarlane','todd-mcfarlane@creators.local',
      'Todd McFarlane is a Canadian comic book creator and entrepreneur.',
      '1961-03-16','Canadian-American','http://www.spawn.com',
      'http://okikio.dev/resource/persons/todd-mcfarlane'),
    ('gail-simone','Gail Simone','gail-simone@creators.local',
      'Gail Simone is an American writer known for Birds of Prey and Batgirl.',
      '1974-07-29','American',NULL,
      'http://okikio.dev/resource/persons/gail-simone'),
    ('mark-waid','Mark Waid','mark-waid@creators.local',
      'Mark Waid is an American comic book writer known for The Flash and Kingdom Come.',
      '1962-03-21','American','http://www.thrillbent.com',
      'http://okikio.dev/resource/persons/mark-waid'),
    ('kelly-sue-deconnick','Kelly Sue DeConnick','kelly-sue-deconnick@creators.local',
      'Kelly Sue DeConnick is an American comic book writer.',
      '1970-07-01','American','http://kellysue.com',
      'http://okikio.dev/resource/persons/kelly-sue-deconnick')
  ) AS t(slug, full_name, email, bio, birth_date, nationality, website, neptune_uri)
),

-- 1) Insert users only if the email doesn't exist yet.
ins_users AS (
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated','authenticated',
    c.email,
    extensions.crypt('password123', extensions.gen_salt('bf')),  -- dev-only password
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', c.full_name, 'slug', c.slug),
    NOW(), NOW(),
    '', '', '', ''
  FROM creators c
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = c.email)
  RETURNING id, email
),

-- 2) Work with both newly inserted and pre-existing users for these emails.
all_users AS (
  SELECT id, email FROM ins_users
  UNION ALL
  SELECT u.id, u.email
  FROM auth.users u
  JOIN creators c ON c.email = u.email
)

-- 3) Enrich the auto-created profiles (created by auth→profiles trigger).
-- NOTE: entity_type_code = 'person' (NOT 'creator')
-- The fact that they are creators is metadata, not a type distinction
UPDATE public.profiles p
SET
  username            = CASE
                          WHEN p.username IS NULL OR p.username = ''
                          THEN split_part(au.email, '@', 1)
                          ELSE p.username
                        END,
  display_name        = c.full_name,
  bio                 = c.bio,
  website             = c.website,
  birth_date          = c.birth_date::date,
  location            = c.nationality,

  -- Neptune fields
  is_neptune_entity   = TRUE,
  entity_type_code    = 'person',  -- FIXED: was 'creator'
  neptune_uri         = c.neptune_uri,
  neptune_synced_at   = NOW(),
  neptune_last_commit_num = NULL,
  neptune_metadata    = jsonb_build_object(
                          'source', 'seed',
                          'slug',   c.slug,
                          'email',  c.email,
                          'role',   'creator'  -- Role metadata, not entity type
                        ),

  updated_at          = NOW()
FROM creators c
JOIN all_users au ON au.email = c.email
WHERE p.id = au.id;

-- ============================================================================
-- ENSURE IDENTITIES EXIST
-- ============================================================================
-- (Run separately to avoid CTE issues with UPDATE)

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  u.email,
  NOW(), NOW(), NOW()
FROM auth.users u
WHERE u.email LIKE '%@creators.local'
AND NOT EXISTS (
  SELECT 1
  FROM auth.identities i
  WHERE i.provider = 'email'
    AND i.provider_id = u.email
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SAMPLE PRODUCTS
-- ============================================================================

INSERT INTO products (
    id, sku, title, slug, medium_code, format_code, status_code,
    release_date, description, publisher_name, base_price_cents,
    story_work_uri
) VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        'BATMAN-2024-001',
        'Batman #1 (2024)',
        'batman-2024-1',
        'comic_issue',
        'physical',
        'active',
        '2024-01-10',
        'The Dark Knight returns in an all-new ongoing series!',
        'DC Comics',
        499,
        'http://okikio.dev/resource/story-works/batman'
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'SUPERMAN-2024-001',
        'Superman #1 (2024)',
        'superman-2024-1',
        'comic_issue',
        'physical',
        'active',
        '2024-01-17',
        'A new era for the Man of Steel begins here!',
        'DC Comics',
        499,
        'http://okikio.dev/resource/story-works/superman'
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'XMEN-2024-001',
        'X-Men #1 (2024)',
        'x-men-2024-1',
        'comic_issue',
        'physical',
        'active',
        '2024-02-07',
        'The X-Men assemble for a new era!',
        'Marvel Comics',
        499,
        'http://okikio.dev/resource/story-works/x-men'
    ),
    (
        'a0000000-0000-0000-0000-000000000004',
        'SANDMAN-TPB-001',
        'The Sandman Vol. 1: Preludes & Nocturnes',
        'sandman-vol-1-preludes-nocturnes',
        'comic_collection',
        'physical',
        'active',
        '1991-05-01',
        'Neil Gaiman''s masterpiece begins here.',
        'DC Comics/Vertigo',
        1999,
        'http://okikio.dev/resource/story-works/sandman'
    ),
    (
        'a0000000-0000-0000-0000-000000000005',
        'WATCHMEN-TPB-001',
        'Watchmen (Complete Edition)',
        'watchmen-complete',
        'graphic_novel',
        'physical',
        'active',
        '1987-01-01',
        'Alan Moore and Dave Gibbons'' landmark series.',
        'DC Comics',
        2499,
        'http://okikio.dev/resource/story-works/watchmen'
    ),
    (
        'a0000000-0000-0000-0000-000000000006',
        'DAREDEVIL-2024-001',
        'Daredevil #1 (2024)',
        'daredevil-2024-1',
        'comic_issue',
        'physical',
        'active',
        '2024-03-06',
        'The Man Without Fear returns!',
        'Marvel Comics',
        499,
        'http://okikio.dev/resource/story-works/daredevil'
    ),
    (
        'a0000000-0000-0000-0000-000000000007',
        'SINCITY-TPB-001',
        'Sin City: The Hard Goodbye',
        'sin-city-hard-goodbye',
        'graphic_novel',
        'physical',
        'active',
        '1992-01-01',
        'Frank Miller''s noir masterpiece.',
        'Dark Horse',
        1799,
        'http://okikio.dev/resource/story-works/sin-city'
    )
ON CONFLICT (sku) DO NOTHING;

-- ============================================================================
-- SAMPLE SKUS
-- ============================================================================

INSERT INTO skus (id, product_id, sku_code, price_cents, stock_quantity) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'BATMAN-2024-001-A', 499, 100),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'BATMAN-2024-001-B', 599, 50),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'SUPERMAN-2024-001-A', 499, 100),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'XMEN-2024-001-A', 499, 100),
    ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 'SANDMAN-TPB-001-SC', 1999, 50),
    ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000005', 'WATCHMEN-TPB-001-SC', 2499, 75),
    ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000006', 'DAREDEVIL-2024-001-A', 499, 100),
    ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000007', 'SINCITY-TPB-001-SC', 1799, 60)
ON CONFLICT (sku_code) DO NOTHING;

-- ============================================================================
-- SAMPLE COLLECTIONS, LIKES, AND FOLLOWS
-- ============================================================================

DO $$
DECLARE
    v_user_1 UUID;  -- Frank Miller
    v_user_2 UUID;  -- Alan Moore
    v_user_3 UUID;  -- Neil Gaiman
    v_user_4 UUID;  -- Brian K. Vaughan
    v_user_5 UUID;  -- Grant Morrison
    v_coll_1 UUID;
    v_coll_2 UUID;
    v_coll_3 UUID;
BEGIN
    -- Get user IDs
    SELECT id INTO v_user_1 FROM auth.users WHERE email = 'frank-miller@creators.local';
    SELECT id INTO v_user_2 FROM auth.users WHERE email = 'alan-moore@creators.local';
    SELECT id INTO v_user_3 FROM auth.users WHERE email = 'neil-gaiman@creators.local';
    SELECT id INTO v_user_4 FROM auth.users WHERE email = 'brian-k-vaughan@creators.local';
    SELECT id INTO v_user_5 FROM auth.users WHERE email = 'grant-morrison@creators.local';
    
    IF v_user_1 IS NULL THEN
        RAISE NOTICE 'Skipping social seed - users not found. Run the creators seed first.';
        RETURN;
    END IF;
    
    -- ========================================================================
    -- COLLECTIONS (note: owner_id, not user_id)
    -- ========================================================================
    
    INSERT INTO collections (id, owner_id, name, slug, description, visibility_code, collection_type)
    VALUES
        (gen_random_uuid(), v_user_1, 'Batman Reading Order', 'batman-reading-order', 
         'The definitive Batman reading order from Year One to present', 'public', 'reading_order'),
        (gen_random_uuid(), v_user_1, 'Best Indie Comics 2024', 'best-indie-2024',
         'My favorite independent comics this year', 'public', 'curated'),
        (gen_random_uuid(), v_user_2, 'Essential Watchmen', 'essential-watchmen',
         'Everything Watchmen related', 'public', 'curated'),
        (gen_random_uuid(), v_user_3, 'Sandman Universe', 'sandman-universe',
         'Complete guide to The Sandman and its spinoffs', 'public', 'reading_order'),
        (gen_random_uuid(), v_user_4, 'Great First Issues', 'great-first-issues',
         'Comics with amazing debut issues', 'public', 'curated')
    ON CONFLICT DO NOTHING;
    
    -- Get collection IDs
    SELECT id INTO v_coll_1 FROM collections WHERE slug = 'batman-reading-order' AND owner_id = v_user_1;
    SELECT id INTO v_coll_2 FROM collections WHERE slug = 'best-indie-2024' AND owner_id = v_user_1;
    SELECT id INTO v_coll_3 FROM collections WHERE slug = 'essential-watchmen' AND owner_id = v_user_2;
    
    -- ========================================================================
    -- COLLECTION ITEMS
    -- ========================================================================
    
    IF v_coll_1 IS NOT NULL THEN
        INSERT INTO collection_items (collection_id, item_type_code, item_id, sort_order, added_by_user_id)
        VALUES
            (v_coll_1, 'product', 'a0000000-0000-0000-0000-000000000001', 1, v_user_1),
            (v_coll_3, 'product', 'a0000000-0000-0000-0000-000000000005', 1, v_user_2)
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- ========================================================================
    -- LIKES
    -- ========================================================================
    
    -- Users liking collections
    IF v_coll_1 IS NOT NULL THEN
        INSERT INTO likes (user_id, target_type_code, target_id)
        VALUES 
            (v_user_2, 'collection', v_coll_1::text),
            (v_user_3, 'collection', v_coll_1::text),
            (v_user_4, 'collection', v_coll_1::text),
            (v_user_3, 'collection', v_coll_2::text),
            (v_user_1, 'collection', v_coll_3::text)
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Users liking Neptune entities (story works, characters)
    INSERT INTO likes (user_id, target_type_code, target_id)
    VALUES 
        -- Frank Miller likes
        (v_user_1, 'story_work', 'http://okikio.dev/resource/story-works/batman'),
        (v_user_1, 'story_work', 'http://okikio.dev/resource/story-works/daredevil'),
        (v_user_1, 'story_work', 'http://okikio.dev/resource/story-works/sin-city'),
        (v_user_1, 'character', 'http://okikio.dev/resource/characters/batman'),
        (v_user_1, 'character', 'http://okikio.dev/resource/characters/daredevil'),
        (v_user_1, 'character', 'http://okikio.dev/resource/characters/elektra'),
        
        -- Alan Moore likes
        (v_user_2, 'story_work', 'http://okikio.dev/resource/story-works/watchmen'),
        (v_user_2, 'story_work', 'http://okikio.dev/resource/story-works/swamp-thing'),
        (v_user_2, 'story_work', 'http://okikio.dev/resource/story-works/v-for-vendetta'),
        (v_user_2, 'character', 'http://okikio.dev/resource/characters/john-constantine'),
        
        -- Neil Gaiman likes
        (v_user_3, 'story_work', 'http://okikio.dev/resource/story-works/sandman'),
        (v_user_3, 'character', 'http://okikio.dev/resource/characters/morpheus'),
        (v_user_3, 'character', 'http://okikio.dev/resource/characters/death'),
        
        -- Brian K. Vaughan likes
        (v_user_4, 'story_work', 'http://okikio.dev/resource/story-works/saga'),
        (v_user_4, 'story_work', 'http://okikio.dev/resource/story-works/y-the-last-man'),
        
        -- Grant Morrison likes
        (v_user_5, 'story_work', 'http://okikio.dev/resource/story-works/doom-patrol'),
        (v_user_5, 'story_work', 'http://okikio.dev/resource/story-works/animal-man'),
        (v_user_5, 'character', 'http://okikio.dev/resource/characters/batman')
    ON CONFLICT DO NOTHING;
    
    -- Users liking other users
    INSERT INTO likes (user_id, target_type_code, target_id)
    VALUES
        (v_user_2, 'user', v_user_1::text),
        (v_user_3, 'user', v_user_1::text),
        (v_user_3, 'user', v_user_2::text),
        (v_user_4, 'user', v_user_2::text),
        (v_user_5, 'user', v_user_1::text),
        (v_user_5, 'user', v_user_2::text)
    ON CONFLICT DO NOTHING;
    
    -- ========================================================================
    -- USER_FOLLOWS
    -- NOTE: 'creator' type changed to 'person' (matches entity_types)
    -- NOTE: 'publisher' type changed to 'org' (matches entity_types)
    -- ========================================================================
    
    -- Frank Miller follows
    INSERT INTO user_follows (user_id, target_type_code, target_id, preferences)
    VALUES
        (v_user_1, 'story_work', 'http://okikio.dev/resource/story-works/batman',
         '{"auto_pull": true, "formats": ["single_issue"], "variant_types": ["main", "open_order"], "notifications": {"new_issue": true, "price_drop": true}, "pull_quantity": 1}'::jsonb),
        (v_user_1, 'story_work', 'http://okikio.dev/resource/story-works/daredevil',
         '{"auto_pull": true, "formats": ["single_issue", "hardcover"], "notifications": {"new_issue": true, "new_format": true}, "pull_quantity": 2}'::jsonb),
        (v_user_1, 'character', 'http://okikio.dev/resource/characters/daredevil',
         '{"notifications": {"new_appearance": true}}'::jsonb),
        (v_user_1, 'character', 'http://okikio.dev/resource/characters/elektra',
         '{"notifications": {"new_appearance": true}}'::jsonb),
        -- FIXED: 'publisher' → 'org'
        (v_user_1, 'org', 'http://okikio.dev/resource/orgs/dark-horse',
         '{"notifications": {"new_issue": true}}'::jsonb)
    ON CONFLICT DO NOTHING;
    
    -- Alan Moore follows
    INSERT INTO user_follows (user_id, target_type_code, target_id, preferences)
    VALUES
        (v_user_2, 'story_work', 'http://okikio.dev/resource/story-works/swamp-thing',
         '{"auto_pull": true, "formats": ["single_issue", "trade_paperback"], "notifications": {"new_issue": true}, "pull_quantity": 1}'::jsonb),
        (v_user_2, 'character', 'http://okikio.dev/resource/characters/swamp-thing',
         '{"notifications": {"new_appearance": true}}'::jsonb),
        (v_user_2, 'character', 'http://okikio.dev/resource/characters/john-constantine',
         '{"notifications": {"new_appearance": true}}'::jsonb),
        (v_user_2, 'user', v_user_1::text,
         '{"notifications": {"new_post": true, "new_collection": false}}'::jsonb)
    ON CONFLICT DO NOTHING;
    
    -- Neil Gaiman follows
    INSERT INTO user_follows (user_id, target_type_code, target_id, preferences)
    VALUES
        (v_user_3, 'story_work', 'http://okikio.dev/resource/story-works/sandman',
         '{"auto_pull": false, "formats": ["trade_paperback", "hardcover"], "notifications": {"new_format": true}, "pull_quantity": 1}'::jsonb),
        (v_user_3, 'character', 'http://okikio.dev/resource/characters/morpheus',
         '{"notifications": {"new_appearance": true}}'::jsonb),
        (v_user_3, 'character', 'http://okikio.dev/resource/characters/death',
         '{"notifications": {"new_appearance": true}}'::jsonb),
        (v_user_3, 'user', v_user_1::text,
         '{"notifications": {"new_post": true, "new_collection": true}}'::jsonb),
        (v_user_3, 'user', v_user_2::text,
         '{"notifications": {"new_post": true, "new_collection": true}}'::jsonb)
    ON CONFLICT DO NOTHING;
    
    -- Brian K. Vaughan follows
    INSERT INTO user_follows (user_id, target_type_code, target_id, preferences)
    VALUES
        (v_user_4, 'story_work', 'http://okikio.dev/resource/story-works/saga',
         '{"auto_pull": true, "formats": ["single_issue"], "notifications": {"new_issue": true}, "pull_quantity": 1}'::jsonb),
        -- FIXED: 'creator' → 'person'
        (v_user_4, 'person', 'http://okikio.dev/resource/persons/frank-miller',
         '{"notifications": {"new_work": true}}'::jsonb),
        (v_user_4, 'person', 'http://okikio.dev/resource/persons/alan-moore',
         '{"notifications": {"new_work": true}}'::jsonb)
    ON CONFLICT DO NOTHING;
    
    -- Grant Morrison follows
    INSERT INTO user_follows (user_id, target_type_code, target_id, preferences)
    VALUES
        (v_user_5, 'story_work', 'http://okikio.dev/resource/story-works/doom-patrol',
         '{"auto_pull": true, "formats": ["single_issue", "trade_paperback"], "notifications": {"new_issue": true, "new_format": true}, "pull_quantity": 1}'::jsonb),
        (v_user_5, 'story_work', 'http://okikio.dev/resource/story-works/animal-man',
         '{"auto_pull": false, "formats": ["trade_paperback"], "notifications": {"new_format": true}, "pull_quantity": 1}'::jsonb),
        (v_user_5, 'character', 'http://okikio.dev/resource/characters/batman',
         '{"notifications": {"new_appearance": true}}'::jsonb),
        (v_user_5, 'user', v_user_1::text,
         '{"notifications": {"new_post": true, "new_collection": true}}'::jsonb),
        (v_user_5, 'user', v_user_2::text,
         '{"notifications": {"new_post": true, "new_collection": true}}'::jsonb),
        (v_user_5, 'user', v_user_3::text,
         '{"notifications": {"new_post": true, "new_collection": true}}'::jsonb)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Seed data created successfully!';
    
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify entity types (should be seeded by migration)
SELECT code, display_name, is_neptune_entity 
FROM entity_types 
WHERE code IN ('user', 'org', 'collection', 'product', 'story_work', 'character', 'person')
ORDER BY sort_order;

-- Verify users created
SELECT p.username, p.display_name, p.entity_type_code, p.neptune_uri
FROM profiles p
WHERE p.is_neptune_entity = TRUE
ORDER BY p.created_at;

-- Verify products created
SELECT title, sku, publisher_name, base_price_cents
FROM products
ORDER BY release_date;

-- Verify collections created (note: owner_id)
SELECT c.name, c.slug, p.display_name as owner
FROM collections c
JOIN profiles p ON c.owner_id = p.id
ORDER BY c.created_at;

-- Verify likes summary
SELECT 
    target_type_code,
    COUNT(*) as count
FROM likes
GROUP BY target_type_code
ORDER BY count DESC;

-- Verify follows summary
SELECT 
    target_type_code,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE (preferences->>'auto_pull')::boolean = true) as auto_pull_count
FROM user_follows
GROUP BY target_type_code
ORDER BY count DESC;