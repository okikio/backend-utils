-- ============================================================================
-- Migration 004: Users and Profiles
-- Supabase Auth pattern: auth.users separate from public.profiles
-- ============================================================================
-- IMPORTANT: Supabase stores auth data in auth.users (protected schema)
-- We create a public.profiles table that references auth.users(id)
-- ============================================================================


-- ############################################################################
-- SECTION 1: PROFILES TABLE
-- ############################################################################

CREATE TABLE profiles (
    id UUID PRIMARY KEY,  -- Will reference auth.users(id)
    
    -- Identity
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    
    -- Profile content
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    location TEXT,
    website TEXT CHECK (website ~ '^https?://'),
    birth_date DATE,
    
    -- Status
    status_code TEXT NOT NULL DEFAULT 'active',
    
    -- Suspension tracking (temporal pattern)
    suspended_until TIMESTAMPTZ,
    suspension_reason TEXT,
    suspended_by_user_id UUID,
    suspended_at TIMESTAMPTZ,
    
    -- Verification (temporal pattern)
    verified_at TIMESTAMPTZ,
    verified_by_user_id UUID,
    
    -- Subscription
    subscription_tier_code TEXT DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    
    -- Preferences (JSONB for flexibility)
    preferences JSONB DEFAULT '{
        "timezone": "UTC",
        "language": "en",
        "theme": "system",
        "currency": "USD",
        "notifications": {
            "email": true,
            "push": true,
            "marketing": false,
            "newReleases": true,
            "priceDrops": true,
            "commentReplies": true
        },
        "display": {
            "gridSize": "comfortable",
            "showCovers": true,
            "sortDefault": "release_date"
        }
    }'::jsonb,
    
    -- Privacy settings (JSONB for flexibility)
    privacy JSONB DEFAULT '{
        "profile_visibility": "public",
        "show_activity": true,
        "show_collections": true,
        "allow_messages": true,
        "show_email": false
    }'::jsonb,
    
    -- Cached metrics (denormalized for performance)
    items_owned_count INT DEFAULT 0,
    reviews_count INT DEFAULT 0,
    collections_count INT DEFAULT 0,
    followers_count INT DEFAULT 0,
    following_count INT DEFAULT 0,

    -- Neptune integration
    neptune_uri TEXT UNIQUE,                  -- e.g. http://okikio.dev/resource/persons/frank-miller
    is_neptune_entity BOOLEAN NOT NULL DEFAULT FALSE,
    entity_type_code TEXT,                    -- e.g. 'creator', 'character'
    neptune_synced_at TIMESTAMPTZ,
    neptune_last_commit_num BIGINT,
    neptune_metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: enforce semantic clarity for Neptune entities
    CHECK (
      (is_neptune_entity = FALSE AND neptune_uri IS NULL)
      OR
      (is_neptune_entity = TRUE AND neptune_uri IS NOT NULL AND entity_type_code IS NOT NULL)
    )
);


-- ############################################################################
-- SECTION 2: MODERATION LOG
-- ############################################################################

CREATE TABLE moderation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    target_user_id UUID NOT NULL,  -- Will reference auth.users(id)
    moderator_id UUID NOT NULL,    -- Will reference auth.users(id)
    
    action_type TEXT NOT NULL CHECK (
        action_type IN ('suspend', 'unsuspend', 'ban', 'unban', 'warn', 'verify', 'unverify')
    ),
    reason TEXT NOT NULL,
    duration_hours INT CHECK (duration_hours > 0),
    
    internal_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 3: USER PRODUCT STATE
-- ############################################################################
-- Ownership, wishlist, consumption tracking

CREATE TABLE user_product_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,     -- Will reference auth.users(id)
    product_id UUID NOT NULL,  -- Will reference products(id)
    
    -- Ownership
    ownership_type_code TEXT,
    owned_sku_ids UUID[],
    purchased_at TIMESTAMPTZ,
    
    -- Wishlist (temporal pattern)
    wishlisted_at TIMESTAMPTZ,
    wishlist_priority INT CHECK (wishlist_priority BETWEEN 1 AND 5),
    wishlist_notes TEXT,
    
    -- Consumption tracking
    consumption_status_code TEXT DEFAULT 'not_started',
    progress_percentage DECIMAL(5,2) CHECK (progress_percentage BETWEEN 0 AND 100),
    times_consumed INT DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Rating (separate from full review)
    user_rating DECIMAL(3,2) CHECK (user_rating BETWEEN 0 AND 5),
    rated_at TIMESTAMPTZ,
    
    -- Timestamps
    last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Optimistic locking
    version INT DEFAULT 1,
    
    -- Constraint: Can't be wishlisted and owned simultaneously
    CHECK (wishlisted_at IS NULL OR purchased_at IS NULL)
);


-- ############################################################################
-- SECTION 4: NOTIFICATIONS
-- ############################################################################

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- Will reference auth.users(id)
    
    -- Type for application logic routing
    type TEXT NOT NULL, -- 'new_release', 'price_drop', 'comment_reply', etc.
    
    -- Flexible payload for different notification types
    data JSONB NOT NULL,
    
    -- Common fields outside JSONB for efficient queries
    read_at TIMESTAMPTZ,
    action_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);


-- ############################################################################
-- SECTION 5: INDEXES
-- ############################################################################

-- Profiles indexes
CREATE INDEX idx_profiles_id ON profiles(id);
CREATE INDEX idx_profiles_username ON profiles(username) WHERE status_code = 'active';
CREATE INDEX idx_profiles_status ON profiles(status_code);
CREATE INDEX idx_profiles_suspended_by ON profiles(suspended_by_user_id) WHERE suspended_by_user_id IS NOT NULL;
CREATE INDEX idx_profiles_verified_by ON profiles(verified_by_user_id) WHERE verified_by_user_id IS NOT NULL;

-- GIN indexes for JSONB querying
CREATE INDEX idx_profiles_preferences_gin ON profiles USING GIN(preferences);
CREATE INDEX idx_profiles_privacy_gin ON profiles USING GIN(privacy);

-- Neptune indexes
CREATE INDEX idx_profiles_neptune_uri ON profiles(neptune_uri);
CREATE INDEX idx_profiles_entity_type ON profiles(entity_type_code);
CREATE INDEX idx_profiles_is_neptune_entity ON profiles(is_neptune_entity);
CREATE INDEX idx_profiles_neptune_commit ON profiles(neptune_last_commit_num);

-- Moderation log indexes
CREATE INDEX idx_moderation_log_target ON moderation_log(target_user_id, created_at DESC);
CREATE INDEX idx_moderation_log_moderator ON moderation_log(moderator_id);

-- User product state indexes
CREATE INDEX idx_user_product_user ON user_product_state(user_id);
CREATE INDEX idx_user_product_owned ON user_product_state(user_id, ownership_type_code) WHERE purchased_at IS NOT NULL;
CREATE INDEX idx_user_product_wishlist ON user_product_state(user_id, wishlisted_at DESC) WHERE wishlisted_at IS NOT NULL;
CREATE INDEX idx_user_product_consumption ON user_product_state(user_id, consumption_status_code);

-- Notifications indexes
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_data_gin ON notifications USING GIN(data);
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;


-- ############################################################################
-- SECTION 6: UNIQUE CONSTRAINTS
-- ############################################################################

CREATE UNIQUE INDEX idx_user_product_unique ON user_product_state(user_id, product_id);
ALTER TABLE user_product_state ADD CONSTRAINT user_product_unique UNIQUE USING INDEX idx_user_product_unique;


-- ############################################################################
-- SECTION 7: ROW LEVEL SECURITY
-- ############################################################################

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_product_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;


-- ############################################################################
-- SECTION 8: FOREIGN KEYS
-- ############################################################################
-- Added as NOT VALID to avoid long locks, validate in separate migration

-- Profiles FKs
ALTER TABLE profiles 
ADD CONSTRAINT profiles_user_fk 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_status_fk 
FOREIGN KEY (status_code) REFERENCES profile_statuses(code)
NOT VALID;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_subscription_tier_fk 
FOREIGN KEY (subscription_tier_code) REFERENCES subscription_tiers(code)
NOT VALID;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_suspended_by_fk 
FOREIGN KEY (suspended_by_user_id) REFERENCES auth.users(id)
NOT VALID;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_verified_by_fk 
FOREIGN KEY (verified_by_user_id) REFERENCES auth.users(id)
NOT VALID;

-- Moderation log FKs
ALTER TABLE moderation_log 
ADD CONSTRAINT moderation_log_target_fk 
FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE moderation_log 
ADD CONSTRAINT moderation_log_moderator_fk 
FOREIGN KEY (moderator_id) REFERENCES auth.users(id)
NOT VALID;

-- User product state FKs
ALTER TABLE user_product_state 
ADD CONSTRAINT user_product_state_user_fk 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE user_product_state 
ADD CONSTRAINT user_product_state_ownership_fk 
FOREIGN KEY (ownership_type_code) REFERENCES ownership_types(code)
NOT VALID;

ALTER TABLE user_product_state 
ADD CONSTRAINT user_product_state_consumption_fk 
FOREIGN KEY (consumption_status_code) REFERENCES consumption_statuses(code)
NOT VALID;

-- Notifications FK
ALTER TABLE notifications 
ADD CONSTRAINT notifications_user_fk 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
NOT VALID;


-- ############################################################################
-- END OF MIGRATION
-- ############################################################################