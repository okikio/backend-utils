-- ============================================================================
-- Migration 006: User Generated Content
-- Likes, comments (NO LTREE!), reviews (polymorphic - works with Neptune & products)
-- ============================================================================


-- ############################################################################
-- SECTION 1: LIKES TABLE
-- ############################################################################
-- Lightweight, high-volume table for like interactions

CREATE TABLE likes (
    user_id UUID NOT NULL,
    
    -- Polymorphic target (Neptune URI or Supabase UUID)
    -- Format validation delegated to application layer
    -- entity_types.is_neptune_entity indicates expected format
    target_type_code TEXT NOT NULL,
    target_id TEXT NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Composite primary key (no separate id column needed)
    PRIMARY KEY (user_id, target_type_code, target_id)
);


-- ############################################################################
-- SECTION 2: COMMENTS TABLE
-- ############################################################################
-- Simple adjacency list - NO LTREE!
-- RATIONALE: LTREE is overkill for a simple comment section use case
--   • Shallow threads (3-5 levels max)
--   • High write volume
--   • Simple query pattern ("show replies")
--   • Adjacency + CTEs performs better for our scale

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Polymorphic target
    target_type_code TEXT NOT NULL,
    target_id TEXT NOT NULL,
    
    -- Simple threading (adjacency list)
    parent_comment_id UUID,  -- NULL = root comment
    root_comment_id UUID,    -- Denormalized for quick root queries
    depth INT DEFAULT 0,      -- Denormalized for depth limiting
    
    -- Content
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
    content_html TEXT,  -- Sanitized HTML from app
    
    -- Lifecycle (temporal pattern)
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,  -- Soft delete
    
    -- Moderation
    moderation_status_code TEXT NOT NULL DEFAULT 'approved',
    moderated_by_user_id UUID,
    moderated_at TIMESTAMPTZ,
    moderation_reason TEXT,
    
    -- Cached metrics (updated via triggers)
    like_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: Can't be both root and have parent
    CHECK (
        (parent_comment_id IS NULL AND root_comment_id IS NULL)
        OR
        (parent_comment_id IS NOT NULL AND root_comment_id IS NOT NULL)
    )
);


-- ############################################################################
-- SECTION 3: REVIEWS TABLE
-- ############################################################################
-- Comprehensive, lower-volume than likes/comments

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Polymorphic target
    target_type_code TEXT NOT NULL,
    target_id TEXT NOT NULL,
    
    rating DECIMAL(3,2) NOT NULL CHECK (rating BETWEEN 0 AND 5),
    title TEXT,
    content TEXT NOT NULL CHECK (char_length(content) >= 50),
    content_html TEXT,
    
    -- Metadata (temporal pattern)
    spoiler_marked_at TIMESTAMPTZ,
    purchase_verified_at TIMESTAMPTZ,
    
    -- Lifecycle
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    featured_until TIMESTAMPTZ,
    
    -- Moderation
    moderation_status_code TEXT NOT NULL DEFAULT 'approved',
    
    -- Cached metrics
    helpful_count INT DEFAULT 0,
    unhelpful_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 4: REVIEW VOTES
-- ############################################################################
-- Helpful/unhelpful voting on reviews

CREATE TABLE review_votes (
    user_id UUID NOT NULL,
    review_id UUID NOT NULL,
    is_helpful BOOLEAN NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (user_id, review_id)
);


-- ############################################################################
-- SECTION 5: INDEXES
-- ############################################################################

-- Likes indexes
CREATE INDEX idx_likes_user_created ON likes(user_id, created_at DESC);
CREATE INDEX idx_likes_target ON likes(target_type_code, target_id);

-- Comments indexes (optimized for thread queries)
CREATE INDEX idx_comments_user ON comments(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_target ON comments(target_type_code, target_id, created_at DESC) WHERE deleted_at IS NULL;

-- CRITICAL: For fetching thread replies
CREATE INDEX idx_comments_root ON comments(root_comment_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent ON comments(parent_comment_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_comments_moderation ON comments(moderation_status_code, created_at DESC) WHERE moderation_status_code != 'approved';
CREATE INDEX idx_comments_moderated_by ON comments(moderated_by_user_id) WHERE moderated_by_user_id IS NOT NULL;

-- Reviews indexes
CREATE INDEX idx_reviews_user ON reviews(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_reviews_target ON reviews(target_type_code, target_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_reviews_rating ON reviews(target_type_code, target_id, rating DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_reviews_helpful ON reviews(helpful_count DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_reviews_featured ON reviews(featured_until) WHERE featured_until IS NOT NULL AND deleted_at IS NULL;

-- Review votes indexes
CREATE INDEX idx_review_votes_review ON review_votes(review_id);
CREATE INDEX idx_review_votes_user ON review_votes(user_id);


-- ############################################################################
-- SECTION 6: UNIQUE CONSTRAINTS
-- ############################################################################

-- One review per user/target
CREATE UNIQUE INDEX idx_reviews_unique ON reviews(user_id, target_type_code, target_id);
ALTER TABLE reviews ADD CONSTRAINT reviews_unique UNIQUE USING INDEX idx_reviews_unique;


-- ############################################################################
-- SECTION 7: ROW LEVEL SECURITY
-- ############################################################################

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;


-- ############################################################################
-- SECTION 8: FOREIGN KEYS
-- ############################################################################

-- Likes FKs
ALTER TABLE likes 
ADD CONSTRAINT likes_user_fk 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE likes 
ADD CONSTRAINT likes_entity_type_fk 
FOREIGN KEY (target_type_code) REFERENCES entity_types(code)
NOT VALID;

-- Comments FKs
ALTER TABLE comments 
ADD CONSTRAINT comments_user_fk 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE comments 
ADD CONSTRAINT comments_entity_type_fk 
FOREIGN KEY (target_type_code) REFERENCES entity_types(code)
NOT VALID;

ALTER TABLE comments 
ADD CONSTRAINT comments_parent_fk 
FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE comments 
ADD CONSTRAINT comments_root_fk 
FOREIGN KEY (root_comment_id) REFERENCES comments(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE comments 
ADD CONSTRAINT comments_moderation_fk 
FOREIGN KEY (moderation_status_code) REFERENCES moderation_statuses(code)
NOT VALID;

ALTER TABLE comments 
ADD CONSTRAINT comments_moderated_by_fk 
FOREIGN KEY (moderated_by_user_id) REFERENCES auth.users(id)
NOT VALID;

-- Reviews FKs
ALTER TABLE reviews 
ADD CONSTRAINT reviews_user_fk 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE reviews 
ADD CONSTRAINT reviews_entity_type_fk 
FOREIGN KEY (target_type_code) REFERENCES entity_types(code)
NOT VALID;

ALTER TABLE reviews 
ADD CONSTRAINT reviews_moderation_fk 
FOREIGN KEY (moderation_status_code) REFERENCES moderation_statuses(code)
NOT VALID;

-- Review votes FKs
ALTER TABLE review_votes 
ADD CONSTRAINT review_votes_user_fk 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE review_votes 
ADD CONSTRAINT review_votes_review_fk 
FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
NOT VALID;


-- ############################################################################
-- END OF MIGRATION
-- ############################################################################