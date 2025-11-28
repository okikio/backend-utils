-- ============================================================================
-- Migration 007: Collections
-- User-curated collections of items
-- Uses owner_id for semantic clarity
-- ============================================================================


-- ############################################################################
-- SECTION 1: COLLECTIONS TABLE
-- ############################################################################

CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,  -- Semantic: who owns this collection
    
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    
    collection_type TEXT,
    
    sort_order TEXT DEFAULT 'manual' CHECK (
        sort_order IN ('manual', 'date_added', 'release_date', 'rating', 'alphabetical')
    ),
    
    visibility_code TEXT NOT NULL DEFAULT 'public',
    collaboration_enabled_at TIMESTAMPTZ,
    
    -- Soft delete (temporal pattern)
    deleted_at TIMESTAMPTZ,
    deleted_by_user_id UUID,  -- Keeps user_id suffix: different user ref
    
    -- Cached metrics
    item_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    follower_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: if deleted, must have deleted_by
    CHECK (
        (deleted_at IS NULL AND deleted_by_user_id IS NULL)
        OR
        (deleted_at IS NOT NULL AND deleted_by_user_id IS NOT NULL)
    )
);


-- ############################################################################
-- SECTION 2: COLLECTION ITEMS
-- ############################################################################

CREATE TABLE collection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL,
    
    item_type_code TEXT NOT NULL,
    item_id TEXT NOT NULL,
    
    sort_order INT DEFAULT 0,
    notes TEXT,
    added_by_user_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 3: COLLECTION HISTORY
-- ############################################################################
-- Audit trail for collection changes

CREATE TABLE collection_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL,
    
    -- What changed
    action TEXT NOT NULL CHECK (
        action IN ('created', 'updated', 'deleted', 'restored', 'items_added', 'items_removed')
    ),
    
    -- Who changed it
    changed_by_user_id UUID NOT NULL,
    
    -- Snapshot of state
    snapshot JSONB,
    
    -- Additional context
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 4: INDEXES
-- ############################################################################

-- Collections indexes
CREATE INDEX idx_collections_owner ON collections(owner_id);
CREATE INDEX idx_collections_visibility ON collections(visibility_code) WHERE visibility_code = 'public';
CREATE UNIQUE INDEX idx_collections_slug ON collections(owner_id, slug);

-- Soft delete index (most common query: active collections)
CREATE INDEX idx_collections_active ON collections(owner_id, created_at DESC) WHERE deleted_at IS NULL;

-- Collection items indexes
CREATE INDEX idx_collection_items_collection ON collection_items(collection_id, sort_order);
CREATE INDEX idx_collection_items_item ON collection_items(item_type_code, item_id);
CREATE UNIQUE INDEX idx_collection_items_unique ON collection_items(collection_id, item_type_code, item_id);
CREATE INDEX idx_collection_items_added_by ON collection_items(added_by_user_id) WHERE added_by_user_id IS NOT NULL;

-- Collection history indexes
CREATE INDEX idx_collection_history_collection ON collection_history(collection_id, created_at DESC);
CREATE INDEX idx_collection_history_user ON collection_history(changed_by_user_id, created_at DESC);


-- ############################################################################
-- SECTION 5: CONSTRAINTS
-- ############################################################################

ALTER TABLE collection_items ADD CONSTRAINT collection_items_unique UNIQUE USING INDEX idx_collection_items_unique;


-- ############################################################################
-- SECTION 6: ROW LEVEL SECURITY
-- ############################################################################

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_history ENABLE ROW LEVEL SECURITY;


-- ############################################################################
-- SECTION 7: FOREIGN KEYS
-- ############################################################################

-- Collections FKs
ALTER TABLE collections 
ADD CONSTRAINT collections_owner_fk 
FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE 
NOT VALID;

ALTER TABLE collections 
ADD CONSTRAINT collections_visibility_fk 
FOREIGN KEY (visibility_code) REFERENCES collection_visibilities(code) 
NOT VALID;

ALTER TABLE collections 
ADD CONSTRAINT collections_deleted_by_fk 
FOREIGN KEY (deleted_by_user_id) REFERENCES auth.users(id) 
NOT VALID;

-- Collection items FKs
ALTER TABLE collection_items 
ADD CONSTRAINT collection_items_collection_fk 
FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE 
NOT VALID;

ALTER TABLE collection_items 
ADD CONSTRAINT collection_items_entity_type_fk 
FOREIGN KEY (item_type_code) REFERENCES entity_types(code) 
NOT VALID;

ALTER TABLE collection_items 
ADD CONSTRAINT collection_items_added_by_fk 
FOREIGN KEY (added_by_user_id) REFERENCES auth.users(id) 
NOT VALID;

-- Collection history FKs
ALTER TABLE collection_history 
ADD CONSTRAINT collection_history_collection_fk 
FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE 
NOT VALID;

ALTER TABLE collection_history 
ADD CONSTRAINT collection_history_user_fk 
FOREIGN KEY (changed_by_user_id) REFERENCES auth.users(id) 
NOT VALID;


-- ############################################################################
-- END OF MIGRATION
-- ############################################################################