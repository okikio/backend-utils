-- ============================================================================
-- Migration 008: Follows and Pull Lists (League of Comic Geeks Style)
-- ============================================================================
-- Enables users to follow Neptune entities (series, creators, characters)
-- with automated pull list generation and character tracking
--
-- NOTE: Reference tables (pull_list_statuses, character_role_types) are now
-- in 002_create_reference_tables.sql for consolidation
-- ============================================================================


-- ############################################################################
-- SECTION 1: USER FOLLOWS (Polymorphic)
-- ############################################################################
-- Users can follow Neptune entities (story works, creators, characters, publishers)
-- or other Supabase users for social features

CREATE TABLE user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Polymorphic target
    -- For Neptune entities: stores URI (http://okikio.dev/resource/...)
    -- For Supabase users: stores UUID
    target_type_code TEXT NOT NULL,
    target_id TEXT NOT NULL,
    
    -- Follow preferences (JSONB for flexibility)
    -- Simple follows (users): preferences = {}
    -- Rich follows (series): preferences has auto_pull, notifications, formats
    preferences JSONB DEFAULT '{
        "auto_pull": true,
        "formats": ["single_issue"],
        "variant_types": ["main", "open_order"],
        "notifications": {
            "new_issue": true,
            "new_format": true,
            "variant_release": true,
            "reprint": false,
            "price_drop": true
        },
        "pull_quantity": 1
    }'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Soft delete for history tracking
    unfollowed_at TIMESTAMPTZ,
    
    -- Mute: follow but suppress notifications (still auto-pull if enabled)
    muted_at TIMESTAMPTZ,
    
    -- Enforce unique follows per user/target combination
    CONSTRAINT unique_follow UNIQUE (user_id, target_type_code, target_id)
    
    -- NOTE: Format validation (UUID vs URI) delegated to application layer
    -- entity_types.is_neptune_entity indicates expected format:
    --   is_neptune_entity = TRUE  → target_id is URI (http://...)
    --   is_neptune_entity = FALSE → target_id is UUID
);


-- ############################################################################
-- SECTION 2: PULL LIST ITEMS
-- ############################################################################
-- Automatically populated from follows when new products release
-- Users can also manually add items

CREATE TABLE pull_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    sku_id UUID,  -- Specific variant/format (optional, can be selected later)
    
    -- Source tracking
    added_by TEXT NOT NULL CHECK (
        added_by IN (
            'user_manual',
            'series_follow',
            'creator_follow',
            'publisher_follow',
            'character_follow',
            'recommendation'
        )
    ),
    follow_id UUID,  -- Links back to user_follows if auto-added
    
    -- Pull details
    quantity INT DEFAULT 1 CHECK (quantity > 0),
    release_week DATE NOT NULL,  -- Week this releases (for grouping "This Week's Pulls")
    
    -- Status lifecycle: pending → reserved → purchased/skipped/cancelled
    status_code TEXT NOT NULL DEFAULT 'pending',
    
    -- Retailer integration (League of Comic Geeks feature)
    sent_to_retailer_at TIMESTAMPTZ,
    retailer_confirmed_at TIMESTAMPTZ,
    retailer_id UUID,  -- Future: link to comic shop
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Soft delete (removed from list but keep history)
    removed_at TIMESTAMPTZ,
    
    -- Constraint: One pull per user/product/week combination
    CONSTRAINT unique_pull_list_item UNIQUE (user_id, product_id, release_week)
);


-- ############################################################################
-- SECTION 3: CHARACTER APPEARANCES
-- ############################################################################
-- Links products to Neptune character URIs with appearance metadata
-- Enables "How many Spider-Man comics do I own?" queries

CREATE TABLE character_appearances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    
    -- Links to Neptune Character URI
    character_uri TEXT NOT NULL,
    
    -- Appearance details (FK to character_role_types)
    role_type TEXT NOT NULL,
    
    -- Persona tracking (same character, different identity)
    -- Example: Dick Grayson as "Robin" vs "Nightwing"
    persona TEXT,
    
    -- Story ID (for products with multiple stories like TPBs)
    story_id TEXT,
    
    -- Granular metadata (optional)
    page_count INT CHECK (page_count > 0),
    panel_count INT CHECK (panel_count > 0),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 4: USER CHARACTER TRACKING PREFERENCES
-- ############################################################################
-- Per-user settings for how to count character appearances
-- League of Comic Geeks has similar Pro features

CREATE TABLE user_character_tracking (
    user_id UUID PRIMARY KEY,
    
    preferences JSONB DEFAULT '{
        "counting_method": "by_comic",
        "count_unique_only": false,
        "role_types": ["main", "supporting", "cameo"],
        "separate_personas": true,
        "include_reprints": true,
        "include_flashbacks": false,
        "include_mentions": false
    }'::jsonb,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 5: INDEXES
-- ############################################################################

-- User follows indexes
CREATE INDEX idx_user_follows_user ON user_follows(user_id, target_type_code, created_at DESC) 
WHERE unfollowed_at IS NULL;
CREATE INDEX idx_user_follows_target ON user_follows(target_type_code, target_id) 
WHERE unfollowed_at IS NULL;

-- Index for looking up followers of a specific user (for friends_only checks)
CREATE INDEX idx_user_follows_target_user ON user_follows(target_type_code, target_id) 
WHERE target_type_code = 'user' AND unfollowed_at IS NULL;

-- GIN index for JSONB preferences queries
CREATE INDEX idx_user_follows_preferences_gin ON user_follows USING GIN(preferences);

-- Partial index for auto-pull follows (most frequent query)
CREATE INDEX idx_user_follows_auto_pull ON user_follows(target_type_code, target_id) 
WHERE (preferences->>'auto_pull')::boolean = true AND unfollowed_at IS NULL;

-- Pull list indexes (exclude soft-deleted items)
CREATE INDEX idx_pull_list_user_week ON pull_list_items(user_id, release_week DESC) 
WHERE status_code IN ('pending', 'reserved') AND removed_at IS NULL;
CREATE INDEX idx_pull_list_user_status ON pull_list_items(user_id, status_code, created_at DESC)
WHERE removed_at IS NULL;
CREATE INDEX idx_pull_list_follow ON pull_list_items(follow_id) 
WHERE follow_id IS NOT NULL AND removed_at IS NULL;
CREATE INDEX idx_pull_list_release_week ON pull_list_items(release_week, status_code)
WHERE removed_at IS NULL;
CREATE INDEX idx_pull_list_product ON pull_list_items(product_id);

-- Character appearances indexes
CREATE INDEX idx_character_appearances_product ON character_appearances(product_id);
CREATE INDEX idx_character_appearances_character ON character_appearances(character_uri, role_type);
CREATE INDEX idx_character_appearances_story ON character_appearances(story_id) WHERE story_id IS NOT NULL;
CREATE INDEX idx_character_appearances_persona ON character_appearances(character_uri, persona) WHERE persona IS NOT NULL;


-- ############################################################################
-- SECTION 6: ROW LEVEL SECURITY
-- ############################################################################

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE pull_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_appearances ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_character_tracking ENABLE ROW LEVEL SECURITY;


-- ############################################################################
-- SECTION 7: FOREIGN KEYS
-- ############################################################################

-- User follows FKs
ALTER TABLE user_follows 
ADD CONSTRAINT user_follows_user_fk 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE user_follows 
ADD CONSTRAINT user_follows_entity_type_fk 
FOREIGN KEY (target_type_code) REFERENCES entity_types(code)
NOT VALID;

-- Pull list items FKs
ALTER TABLE pull_list_items 
ADD CONSTRAINT pull_list_user_fk 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE pull_list_items 
ADD CONSTRAINT pull_list_product_fk 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE pull_list_items 
ADD CONSTRAINT pull_list_sku_fk 
FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE SET NULL
NOT VALID;

ALTER TABLE pull_list_items 
ADD CONSTRAINT pull_list_follow_fk 
FOREIGN KEY (follow_id) REFERENCES user_follows(id) ON DELETE SET NULL
NOT VALID;

ALTER TABLE pull_list_items 
ADD CONSTRAINT pull_list_status_fk 
FOREIGN KEY (status_code) REFERENCES pull_list_statuses(code)
NOT VALID;

-- Character appearances FKs
ALTER TABLE character_appearances 
ADD CONSTRAINT character_appearances_product_fk 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE character_appearances 
ADD CONSTRAINT character_appearances_role_fk 
FOREIGN KEY (role_type) REFERENCES character_role_types(code)
NOT VALID;

-- Character tracking preferences FK
ALTER TABLE user_character_tracking 
ADD CONSTRAINT user_character_tracking_user_fk 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
NOT VALID;


-- ############################################################################
-- END OF MIGRATION
-- ############################################################################