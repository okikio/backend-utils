-- ============================================================================
-- Migration 002: Reference/Lookup Tables
-- ============================================================================
-- Replaces PostgreSQL ENUMs with extensible reference tables (best practice)
-- 
-- This migration contains ALL enum-like lookup tables for the platform:
--   • Product domain (mediums, formats, statuses, attributes)
--   • User domain (profile statuses, subscription tiers)
--   • UGC/Social domain (moderation, visibility, entity types)
--   • E-commerce domain (order statuses)
--   • Consumer domain (ownership, consumption, pull list statuses)
--   • Narrative domain (character roles)
--
-- Seed data is included inline using ON CONFLICT DO UPDATE for idempotency.
-- ============================================================================


-- ############################################################################
-- SECTION 1: TABLE DEFINITIONS
-- ############################################################################

-- ============================================================================
-- PRODUCT DOMAIN
-- ============================================================================

-- Product mediums (comics, films, games, books, music, collectibles)
CREATE TABLE product_mediums (
    code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- 'comics', 'film', 'games', 'music', 'books', 'collectibles'
    sort_order INT NOT NULL DEFAULT 0,
    active_since TIMESTAMPTZ DEFAULT NOW(),
    deprecated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product formats (physical, digital, streaming, etc.)
CREATE TABLE product_formats (
    code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    requires_shipping BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    active_since TIMESTAMPTZ DEFAULT NOW(),
    deprecated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product statuses (active, coming_soon, discontinued, etc.)
CREATE TABLE product_statuses (
    code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    is_available_for_purchase BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attributes system (size, color, condition, edition, etc.)
CREATE TABLE attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    
    input_type TEXT NOT NULL CHECK (
        input_type IN ('select', 'multiselect', 'text', 'number', 'color', 'date')
    ),
    
    -- Scope to specific mediums (JSONB array for flexibility)
    applicable_to_mediums JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attribute options (predefined values for select/multiselect attributes)
CREATE TABLE attribute_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attribute_id UUID NOT NULL,
    
    value TEXT NOT NULL,
    display_value TEXT NOT NULL,
    hex_color TEXT CHECK (hex_color ~ '^#[0-9A-Fa-f]{6}$'),
    sort_order INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(attribute_id, value)
);

-- ============================================================================
-- USER DOMAIN
-- ============================================================================

-- Profile statuses
CREATE TABLE profile_statuses (
    code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    can_login BOOLEAN NOT NULL DEFAULT TRUE,
    requires_moderation BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription tiers
CREATE TABLE subscription_tiers (
    code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    price_cents INT,
    features JSONB,
    sort_order INT NOT NULL DEFAULT 0,
    active_since TIMESTAMPTZ DEFAULT NOW(),
    deprecated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- UGC/SOCIAL DOMAIN
-- ============================================================================

-- Moderation statuses (for comments, reviews, etc.)
CREATE TABLE moderation_statuses (
    code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    requires_review BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collection visibilities
CREATE TABLE collection_visibilities (
    code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ECOMMERCE DOMAIN
-- ============================================================================

-- Order statuses
CREATE TABLE order_statuses (
    code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    customer_visible TEXT,
    is_cancellable BOOLEAN NOT NULL DEFAULT TRUE,
    is_refundable BOOLEAN NOT NULL DEFAULT FALSE,
    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CONSUMER/USER INTERACTION DOMAIN
-- ============================================================================

-- Ownership types (owned_physical, owned_digital, rented, borrowed)
CREATE TABLE ownership_types (
    code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consumption statuses (want_to_start, in_progress, completed, dropped)
CREATE TABLE consumption_statuses (
    code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    implies_ownership BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pull list statuses (pending, reserved, purchased, skipped, cancelled)
-- Moved from follows migration for consolidation
CREATE TABLE pull_list_statuses (
    code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    is_cancellable BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NARRATIVE/KNOWLEDGE GRAPH DOMAIN
-- ============================================================================

-- Entity types (for polymorphic relationships like likes, comments, follows)
-- Links to both Neptune entities AND PostgreSQL tables
CREATE TABLE entity_types (
    code TEXT PRIMARY KEY,               -- 'story_work', 'person', 'product', ...
    display_name TEXT NOT NULL,          -- 'Story Work', 'Person', 'Product', ...
    description TEXT,                    -- optional human-readable docs
    is_neptune_entity BOOLEAN NOT NULL DEFAULT FALSE,
    ontology_class_iri TEXT,             -- e.g. 'http://okikio.dev/ontology/narrative#StoryWork'
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Character role types (for character_appearances table)
-- Moved from follows migration for consolidation
CREATE TABLE character_role_types (
    code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    include_in_stats_by_default BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 2: INDEXES
-- ############################################################################

-- Foreign key indexes (for attribute_options)
CREATE INDEX idx_attribute_options_attribute 
ON attribute_options(attribute_id, sort_order);


-- ############################################################################
-- SECTION 3: ROW LEVEL SECURITY
-- ############################################################################

-- Enable RLS on all lookup tables (public read access)
ALTER TABLE product_mediums ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribute_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_visibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pull_list_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_role_types ENABLE ROW LEVEL SECURITY;

-- Public read policies for all lookup tables
CREATE POLICY "Public read access" ON product_mediums FOR SELECT USING (true);
CREATE POLICY "Public read access" ON product_formats FOR SELECT USING (true);
CREATE POLICY "Public read access" ON product_statuses FOR SELECT USING (true);
CREATE POLICY "Public read access" ON attributes FOR SELECT USING (true);
CREATE POLICY "Public read access" ON attribute_options FOR SELECT USING (true);
CREATE POLICY "Public read access" ON profile_statuses FOR SELECT USING (true);
CREATE POLICY "Public read access" ON subscription_tiers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON moderation_statuses FOR SELECT USING (true);
CREATE POLICY "Public read access" ON collection_visibilities FOR SELECT USING (true);
CREATE POLICY "Public read access" ON order_statuses FOR SELECT USING (true);
CREATE POLICY "Public read access" ON ownership_types FOR SELECT USING (true);
CREATE POLICY "Public read access" ON consumption_statuses FOR SELECT USING (true);
CREATE POLICY "Public read access" ON pull_list_statuses FOR SELECT USING (true);
CREATE POLICY "Public read access" ON entity_types FOR SELECT USING (true);
CREATE POLICY "Public read access" ON character_role_types FOR SELECT USING (true);


-- ############################################################################
-- SECTION 4: FOREIGN KEYS
-- ############################################################################

-- Add FK for attribute_options (less critical, can add normally)
ALTER TABLE attribute_options 
ADD CONSTRAINT attribute_options_attribute_fk 
FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE;


-- ############################################################################
-- SECTION 5: SEED DATA
-- All enum-like data is seeded here with ON CONFLICT DO UPDATE for idempotency
-- ############################################################################

-- ============================================================================
-- 5.1 PRODUCT DOMAIN SEED DATA
-- ============================================================================

-- Product Mediums
INSERT INTO product_mediums (code, display_name, category, sort_order) VALUES
    -- Comics
    ('comic_issue', 'Comic Issue', 'comics', 10),
    ('comic_collection', 'Comic Collection', 'comics', 20),
    ('graphic_novel', 'Graphic Novel', 'comics', 30),
    ('manga_volume', 'Manga Volume', 'comics', 40),
    ('manhwa_volume', 'Manhwa Volume', 'comics', 50),
    ('manhua_volume', 'Manhua Volume', 'comics', 60),
    ('webtoon', 'Webtoon', 'comics', 70),
    
    -- Film/TV
    ('film_physical', 'Film (Physical)', 'film', 100),
    ('film_digital', 'Film (Digital)', 'film', 110),
    ('tv_series_physical', 'TV Series (Physical)', 'film', 120),
    ('tv_series_digital', 'TV Series (Digital)', 'film', 130),
    ('anime_physical', 'Anime (Physical)', 'film', 140),
    ('anime_digital', 'Anime (Digital)', 'film', 150),
    
    -- Games
    ('video_game_physical', 'Video Game (Physical)', 'games', 200),
    ('video_game_digital', 'Video Game (Digital)', 'games', 210),
    
    -- Books
    ('novel', 'Novel', 'books', 300),
    ('audiobook', 'Audiobook', 'books', 310),
    ('light_novel', 'Light Novel', 'books', 320),
    
    -- Music
    ('vinyl_record', 'Vinyl Record', 'music', 400),
    ('cd', 'CD', 'music', 410),
    ('digital_music', 'Digital Music', 'music', 420),
    
    -- Collectibles
    ('poster', 'Poster', 'collectibles', 500),
    ('art_print', 'Art Print', 'collectibles', 510),
    ('figure', 'Figure', 'collectibles', 520),
    ('statue', 'Statue', 'collectibles', 530),
    ('plush', 'Plush', 'collectibles', 540),
    ('apparel', 'Apparel', 'collectibles', 550),
    ('accessory', 'Accessory', 'collectibles', 560),
    ('merchandise', 'General Merchandise', 'collectibles', 570)
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

-- Product Formats
INSERT INTO product_formats (code, display_name, requires_shipping, sort_order) VALUES
    ('physical', 'Physical', TRUE, 10),
    ('digital', 'Digital', FALSE, 20),
    ('streaming_access', 'Streaming Access', FALSE, 30),
    ('rental', 'Rental', FALSE, 40),
    ('subscription', 'Subscription', FALSE, 50)
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    requires_shipping = EXCLUDED.requires_shipping,
    sort_order = EXCLUDED.sort_order;

-- Product Statuses
INSERT INTO product_statuses (code, display_name, is_available_for_purchase, sort_order) VALUES
    ('active', 'Active', TRUE, 10),
    ('coming_soon', 'Coming Soon', TRUE, 20),
    ('preorder', 'Pre-order', TRUE, 30),
    ('discontinued', 'Discontinued', FALSE, 40),
    ('out_of_print', 'Out of Print', FALSE, 50),
    ('archived', 'Archived', FALSE, 60)
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_available_for_purchase = EXCLUDED.is_available_for_purchase,
    sort_order = EXCLUDED.sort_order;

-- Attributes (for product variants)
INSERT INTO attributes (code, display_name, input_type, applicable_to_mediums) VALUES
    ('size', 'Size', 'select', '["apparel", "poster", "art_print"]'::jsonb),
    ('color', 'Color', 'select', '["apparel", "figure", "plush", "accessory"]'::jsonb),
    ('condition', 'Condition', 'select', '["comic_issue", "comic_collection", "graphic_novel", "manga_volume", "film_physical", "video_game_physical", "vinyl_record", "cd"]'::jsonb),
    ('edition', 'Edition', 'select', '["comic_issue", "comic_collection", "graphic_novel"]'::jsonb),
    ('variant', 'Variant Cover', 'select', '["comic_issue"]'::jsonb),
    ('grading', 'Professional Grading', 'select', '["comic_issue", "comic_collection"]'::jsonb),
    ('signed', 'Signed', 'select', '["comic_issue", "comic_collection", "poster", "art_print"]'::jsonb),
    ('scale', 'Scale', 'select', '["figure", "statue"]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    input_type = EXCLUDED.input_type,
    applicable_to_mediums = EXCLUDED.applicable_to_mediums;

-- ============================================================================
-- 5.2 USER DOMAIN SEED DATA
-- ============================================================================

-- Profile Statuses
INSERT INTO profile_statuses (code, display_name, can_login, requires_moderation, sort_order) VALUES
    ('active', 'Active', TRUE, FALSE, 10),
    ('pending_verification', 'Pending Verification', TRUE, FALSE, 20),
    ('suspended', 'Suspended', FALSE, TRUE, 30),
    ('deactivated', 'Deactivated', FALSE, FALSE, 40),
    ('banned', 'Banned', FALSE, TRUE, 50)
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    can_login = EXCLUDED.can_login,
    requires_moderation = EXCLUDED.requires_moderation,
    sort_order = EXCLUDED.sort_order;

-- Subscription Tiers
INSERT INTO subscription_tiers (code, display_name, price_cents, features, sort_order) VALUES
    ('free', 'Free', 0, 
        '{"max_collections": 5, "max_wishlist": 100, "storage_mb": 100}'::jsonb, 10),
    ('plus', 'Plus', 499, 
        '{"max_collections": 25, "max_wishlist": 500, "storage_mb": 1000, "early_access": true}'::jsonb, 20),
    ('premium', 'Premium', 999, 
        '{"max_collections": -1, "max_wishlist": -1, "storage_mb": 10000, "early_access": true, "ad_free": true}'::jsonb, 30),
    ('creator', 'Creator', 1999, 
        '{"max_collections": -1, "max_wishlist": -1, "storage_mb": 50000, "early_access": true, "ad_free": true, "analytics": true, "api_access": true}'::jsonb, 40)
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    price_cents = EXCLUDED.price_cents,
    features = EXCLUDED.features,
    sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 5.3 UGC/SOCIAL DOMAIN SEED DATA
-- ============================================================================

-- Moderation Statuses
INSERT INTO moderation_statuses (code, display_name, is_visible, requires_review, sort_order) VALUES
    ('approved', 'Approved', TRUE, FALSE, 10),
    ('pending', 'Pending', FALSE, TRUE, 20),
    ('flagged', 'Flagged', TRUE, TRUE, 30),
    ('removed', 'Removed', FALSE, FALSE, 40),
    ('spam', 'Spam', FALSE, FALSE, 50)
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_visible = EXCLUDED.is_visible,
    requires_review = EXCLUDED.requires_review,
    sort_order = EXCLUDED.sort_order;

-- Collection Visibilities
INSERT INTO collection_visibilities (code, display_name, is_public, sort_order) VALUES
    ('public', 'Public', TRUE, 10),
    ('unlisted', 'Unlisted (Anyone with link)', FALSE, 20),
    ('friends_only', 'Friends Only', FALSE, 30),
    ('private', 'Private', FALSE, 40)
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_public = EXCLUDED.is_public,
    sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 5.4 ECOMMERCE DOMAIN SEED DATA
-- ============================================================================

-- Order Statuses
INSERT INTO order_statuses (code, display_name, customer_visible, is_cancellable, is_refundable, is_final, sort_order) VALUES
    ('cart', 'Shopping Cart', 'Cart', TRUE, FALSE, FALSE, 10),
    ('pending_payment', 'Awaiting Payment', 'Pending Payment', TRUE, FALSE, FALSE, 20),
    ('payment_processing', 'Processing Payment', 'Processing', FALSE, FALSE, FALSE, 30),
    ('paid', 'Payment Confirmed', 'Paid', TRUE, TRUE, FALSE, 40),
    ('processing', 'Order Processing', 'Processing', TRUE, TRUE, FALSE, 50),
    ('partially_shipped', 'Partially Shipped', 'Partially Shipped', FALSE, TRUE, FALSE, 60),
    ('shipped', 'Shipped', 'Shipped', FALSE, TRUE, FALSE, 70),
    ('partially_delivered', 'Partially Delivered', 'Partially Delivered', FALSE, TRUE, FALSE, 80),
    ('delivered', 'Delivered', 'Delivered', FALSE, TRUE, TRUE, 90),
    ('cancelled', 'Cancelled', 'Cancelled', FALSE, FALSE, TRUE, 100),
    ('refund_requested', 'Refund In Progress', 'Refund Requested', FALSE, FALSE, FALSE, 110),
    ('refunded', 'Refunded', 'Refunded', FALSE, FALSE, TRUE, 120)
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    customer_visible = EXCLUDED.customer_visible,
    is_cancellable = EXCLUDED.is_cancellable,
    is_refundable = EXCLUDED.is_refundable,
    is_final = EXCLUDED.is_final,
    sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 5.5 CONSUMER DOMAIN SEED DATA
-- ============================================================================

-- Ownership Types
INSERT INTO ownership_types (code, display_name, sort_order) VALUES
    ('not_owned', 'Not Owned', 10),
    ('owned_physical', 'Owned (Physical)', 20),
    ('owned_digital', 'Owned (Digital)', 30),
    ('owned_both', 'Owned (Physical & Digital)', 40),
    ('rented', 'Rented', 50),
    ('borrowed', 'Borrowed', 60)
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    sort_order = EXCLUDED.sort_order;

-- Consumption Statuses
INSERT INTO consumption_statuses (code, display_name, implies_ownership, sort_order) VALUES
    ('not_started', 'Not Started', FALSE, 10),
    ('want_to_start', 'Want to Start', FALSE, 20),
    ('in_progress', 'In Progress', TRUE, 30),
    ('on_hold', 'On Hold', TRUE, 40),
    ('completed', 'Completed', TRUE, 50),
    ('dropped', 'Dropped', FALSE, 60),
    ('rewatching', 'Re-watching/Re-reading', TRUE, 70)
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    implies_ownership = EXCLUDED.implies_ownership,
    sort_order = EXCLUDED.sort_order;

-- Pull List Statuses
INSERT INTO pull_list_statuses (code, display_name, is_final, is_cancellable, sort_order) VALUES
    ('pending', 'Pending Release', FALSE, TRUE, 10),
    ('reserved', 'Reserved in Cart', FALSE, TRUE, 20),
    ('purchased', 'Purchased', TRUE, FALSE, 30),
    ('skipped', 'Skipped This Week', TRUE, FALSE, 40),
    ('cancelled', 'Cancelled', TRUE, FALSE, 50)
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_final = EXCLUDED.is_final,
    is_cancellable = EXCLUDED.is_cancellable,
    sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 5.6 NARRATIVE/KNOWLEDGE GRAPH DOMAIN SEED DATA
-- ============================================================================

-- Entity Types
-- Central registry for polymorphic relationships (likes, comments, follows)
-- Bridges Neptune knowledge graph entities with Supabase tables
INSERT INTO entity_types (
  code,
  display_name,
  description,
  is_neptune_entity,
  sort_order,
  ontology_class_iri
) VALUES
  -- ==========================================================================
  -- Neptune / KG-driven narrative entities (is_neptune_entity = TRUE)
  -- These flow FROM Neptune → Supabase for discovery/linking
  -- ==========================================================================
  ('story_work', 'Story Work (Series)', 
   'A complete narrative work like a comic series, manga, or book series',
   TRUE, 10, 'http://okikio.dev/ontology/narrative#StoryWork'),
  
  ('story_expression', 'Story Expression (Issue)', 
   'A specific expression of a story work (e.g., single issue, chapter)',
   TRUE, 20, 'http://okikio.dev/ontology/narrative#StoryExpression'),
  
  ('narrative_unit', 'Narrative Unit (Arc)', 
   'A story arc or narrative segment within a larger work',
   TRUE, 30, 'http://okikio.dev/ontology/narrative#NarrativeUnit'),
  
  ('character', 'Character', 
   'A fictional character appearing in narrative works',
   TRUE, 40, 'http://okikio.dev/ontology/narrative#Character'),
  
  ('person', 'Person', 
   'A real person (creator, writer, artist, actor, etc.)',
   TRUE, 50, 'http://okikio.dev/ontology/narrative#Person'),
  
  ('org', 'Organization', 
   'A company or organization (publisher, studio, etc.)',
   TRUE, 60, 'http://okikio.dev/ontology/narrative#Org'),
  
  ('group', 'Group / Team', 
   'A fictional team or group (Avengers, X-Men, etc.)',
   TRUE, 70, 'http://okikio.dev/ontology/narrative#Group'),
  
  ('franchise', 'Franchise', 
   'A media franchise spanning multiple works',
   TRUE, 80, 'http://okikio.dev/ontology/narrative#Franchise'),
  
  ('universe', 'Universe', 
   'A fictional universe or continuity (Marvel 616, DC Main, etc.)',
   TRUE, 90, 'http://okikio.dev/ontology/narrative#Universe'),
  
  ('manifestation', 'Manifestation', 
   'A specific physical/digital manifestation (trade paperback, deluxe edition)',
   TRUE, 100, 'http://okikio.dev/ontology/narrative#Manifestation'),
  
  ('item', 'Item (Physical Copy)', 
   'A specific physical copy with unique attributes (signed, graded)',
   TRUE, 110, 'http://okikio.dev/ontology/narrative#Item'),
  
  -- ==========================================================================
  -- Supabase-primary entities (is_neptune_entity = FALSE)
  -- These are Supabase-native with optional Neptune sync
  -- ==========================================================================
  ('user', 'User', 
   'Platform user (Supabase auth.users is source of truth)',
   FALSE, 190, NULL),
  
  ('product', 'Product', 
   'E-commerce product in catalog',
   FALSE, 200, NULL),
  
  ('collection', 'Collection', 
   'User-curated collection of items',
   FALSE, 210, NULL),
  
  ('review', 'Review', 
   'User-written review',
   FALSE, 220, NULL),
  
  ('comment', 'Comment', 
   'User comment on any entity',
   FALSE, 230, NULL)

ON CONFLICT (code) DO UPDATE SET
  display_name       = EXCLUDED.display_name,
  description        = EXCLUDED.description,
  is_neptune_entity  = EXCLUDED.is_neptune_entity,
  sort_order         = EXCLUDED.sort_order,
  ontology_class_iri = EXCLUDED.ontology_class_iri;

-- Character Role Types
INSERT INTO character_role_types (code, display_name, description, include_in_stats_by_default, sort_order) VALUES
    ('main', 'Main Character', 'Primary protagonist or antagonist', TRUE, 10),
    ('supporting', 'Supporting Character', 'Important recurring character', TRUE, 20),
    ('cameo', 'Cameo Appearance', 'Brief appearance, often fan service', FALSE, 30),
    ('mention', 'Mentioned Only', 'Character referenced but not shown', FALSE, 40),
    ('flashback', 'Flashback', 'Appearance in flashback sequence', FALSE, 50),
    ('illusion', 'Illusion/Construct', 'Not the real character (clone, illusion, etc.)', FALSE, 60)
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    include_in_stats_by_default = EXCLUDED.include_in_stats_by_default,
    sort_order = EXCLUDED.sort_order;


-- ############################################################################
-- END OF MIGRATION
-- ############################################################################
-- 
-- Summary of tables created:
--   15 reference tables total
--   
-- Product Domain (5):
--   • product_mediums, product_formats, product_statuses
--   • attributes, attribute_options
--   
-- User Domain (2):
--   • profile_statuses, subscription_tiers
--   
-- UGC/Social Domain (2):
--   • moderation_statuses, collection_visibilities
--   
-- E-commerce Domain (1):
--   • order_statuses
--   
-- Consumer Domain (3):
--   • ownership_types, consumption_statuses, pull_list_statuses
--   
-- Narrative Domain (2):
--   • entity_types, character_role_types
-- ############################################################################