-- ============================================================================
-- Migration 003: Neptune Knowledge Graph Bridge
-- ============================================================================
-- Infrastructure for bidirectional sync between Neptune (Knowledge Graph) 
-- and Supabase (PostgreSQL).
--
-- Data Flow:
--   Neptune → Supabase: Narrative entities (story_work, character, person, etc.)
--   Supabase → Neptune: User activity aggregates (likes, follows, reviews)
--
-- This migration creates:
--   • neptune_sync_events: Event log for all sync operations
--   • Helper functions for sync status management
--   • Indexes optimized for sync queue processing
-- ============================================================================


-- ############################################################################
-- SECTION 1: SYNC EVENT LOG
-- ############################################################################

-- Neptune sync events table
-- Records all sync operations between Neptune and PostgreSQL
CREATE TABLE neptune_sync_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What entity is being synced
    entity_type TEXT NOT NULL,              -- 'story_work', 'character', 'user_activity', etc.
    entity_uri TEXT NOT NULL,               -- Neptune URI (http://okikio.dev/resource/...)
    
    -- Operation details
    operation TEXT NOT NULL CHECK (
        operation IN ('create', 'update', 'delete')
    ),
    
    -- Sync direction
    direction TEXT NOT NULL CHECK (
        direction IN ('neptune_to_postgres', 'postgres_to_neptune', 'bidirectional')
    ),
    
    -- PostgreSQL side reference (when applicable)
    postgres_table TEXT,                    -- 'products', 'profiles', 'user_product_state', etc.
    postgres_id UUID,                       -- PK of the affected row
    
    -- Sync status lifecycle: pending → synced/failed/skipped
    sync_status TEXT DEFAULT 'pending' CHECK (
        sync_status IN ('pending', 'in_progress', 'synced', 'failed', 'skipped')
    ),
    
    -- Error handling
    error_message TEXT,
    error_code TEXT,                        -- Categorized error code for retry logic
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    
    -- Payload for the sync operation
    payload JSONB,                          -- Entity data being synced
    
    -- Commit tracking for Neptune versioning
    neptune_commit_num BIGINT,              -- Neptune commit number for ordering
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,                 -- When processing began
    synced_at TIMESTAMPTZ,                  -- When successfully completed
    
    -- Idempotency key to prevent duplicate processing
    idempotency_key TEXT UNIQUE
);

-- ============================================================================
-- SECTION 2: SYNC CURSOR TRACKING
-- ============================================================================

-- Track sync cursors for incremental sync operations
CREATE TABLE neptune_sync_cursors (
    id TEXT PRIMARY KEY,                    -- Cursor identifier (e.g., 'story_works_full', 'user_activity_daily')
    
    -- Position tracking
    last_commit_num BIGINT,                 -- Last Neptune commit number processed
    last_synced_uri TEXT,                   -- Last entity URI processed (for pagination)
    last_synced_at TIMESTAMPTZ,
    
    -- Sync metadata
    sync_type TEXT NOT NULL CHECK (
        sync_type IN ('full', 'incremental', 'backfill')
    ),
    entity_type TEXT NOT NULL,              -- 'story_work', 'character', etc.
    direction TEXT NOT NULL CHECK (
        direction IN ('neptune_to_postgres', 'postgres_to_neptune')
    ),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_error TEXT,
    consecutive_errors INT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 3: INDEXES
-- ############################################################################

-- Primary query: fetch pending sync events for processing
CREATE INDEX idx_neptune_sync_pending 
ON neptune_sync_events(sync_status, created_at ASC) 
WHERE sync_status IN ('pending', 'in_progress');

-- Retry queue: events that failed but can be retried
CREATE INDEX idx_neptune_sync_retry 
ON neptune_sync_events(next_retry_at, retry_count) 
WHERE sync_status = 'failed' 
AND retry_count < max_retries;

-- Entity lookup: find sync history for a specific entity
CREATE INDEX idx_neptune_sync_entity 
ON neptune_sync_events(entity_type, entity_uri, created_at DESC);

-- PostgreSQL side lookup: find sync events for a specific row
CREATE INDEX idx_neptune_sync_postgres 
ON neptune_sync_events(postgres_table, postgres_id, created_at DESC)
WHERE postgres_id IS NOT NULL;

-- Direction-based queries
CREATE INDEX idx_neptune_sync_direction 
ON neptune_sync_events(direction, sync_status, created_at DESC);

-- Commit number ordering for Neptune replay
CREATE INDEX idx_neptune_sync_commit 
ON neptune_sync_events(neptune_commit_num) 
WHERE neptune_commit_num IS NOT NULL;

-- Cursor lookup
CREATE INDEX idx_neptune_sync_cursors_active 
ON neptune_sync_cursors(entity_type, direction, is_active) 
WHERE is_active = TRUE;


-- ############################################################################
-- SECTION 4: ROW LEVEL SECURITY
-- ############################################################################

ALTER TABLE neptune_sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE neptune_sync_cursors ENABLE ROW LEVEL SECURITY;

-- Sync tables are internal - only service role should access
-- No public policies; access via service role or Edge Functions only


-- ############################################################################
-- SECTION 5: HELPER FUNCTIONS
-- ############################################################################

-- Function to enqueue a sync event
CREATE OR REPLACE FUNCTION enqueue_neptune_sync(
    p_entity_type TEXT,
    p_entity_uri TEXT,
    p_operation TEXT,
    p_direction TEXT,
    p_payload JSONB DEFAULT NULL,
    p_postgres_table TEXT DEFAULT NULL,
    p_postgres_id UUID DEFAULT NULL,
    p_neptune_commit_num BIGINT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
    v_event_id UUID;
    v_idempotency_key TEXT;
BEGIN
    -- Generate idempotency key from entity + operation + commit
    v_idempotency_key := p_entity_uri || ':' || p_operation || ':' || COALESCE(p_neptune_commit_num::text, extract(epoch from now())::text);
    
    INSERT INTO public.neptune_sync_events (
        entity_type,
        entity_uri,
        operation,
        direction,
        payload,
        postgres_table,
        postgres_id,
        neptune_commit_num,
        idempotency_key
    ) VALUES (
        p_entity_type,
        p_entity_uri,
        p_operation,
        p_direction,
        p_payload,
        p_postgres_table,
        p_postgres_id,
        p_neptune_commit_num,
        v_idempotency_key
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;

-- Function to claim and lock sync events for processing
CREATE OR REPLACE FUNCTION claim_neptune_sync_batch(
    p_batch_size INT DEFAULT 10,
    p_direction TEXT DEFAULT NULL
)
RETURNS SETOF neptune_sync_events
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH claimed AS (
        SELECT id
        FROM public.neptune_sync_events
        WHERE sync_status = 'pending'
        AND (p_direction IS NULL OR direction = p_direction)
        ORDER BY created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.neptune_sync_events e
    SET 
        sync_status = 'in_progress',
        started_at = NOW()
    FROM claimed c
    WHERE e.id = c.id
    RETURNING e.*;
END;
$$;

-- Function to mark sync event as completed
CREATE OR REPLACE FUNCTION complete_neptune_sync(
    p_event_id UUID,
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL,
    p_error_code TEXT DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
    v_retry_count INT;
    v_max_retries INT;
BEGIN
    IF p_success THEN
        UPDATE public.neptune_sync_events
        SET 
            sync_status = 'synced',
            synced_at = NOW(),
            error_message = NULL,
            error_code = NULL
        WHERE id = p_event_id;
    ELSE
        -- Get current retry state
        SELECT retry_count, max_retries 
        INTO v_retry_count, v_max_retries
        FROM public.neptune_sync_events
        WHERE id = p_event_id;
        
        UPDATE public.neptune_sync_events
        SET 
            sync_status = 'failed',
            error_message = p_error_message,
            error_code = p_error_code,
            retry_count = v_retry_count + 1,
            next_retry_at = CASE 
                WHEN v_retry_count + 1 < v_max_retries 
                THEN NOW() + (interval '1 minute' * power(2, v_retry_count + 1))  -- Exponential backoff
                ELSE NULL
            END
        WHERE id = p_event_id;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Function to reset failed events for retry
CREATE OR REPLACE FUNCTION reset_failed_neptune_syncs()
RETURNS INT
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT;
BEGIN
    WITH reset AS (
        UPDATE public.neptune_sync_events
        SET sync_status = 'pending'
        WHERE sync_status = 'failed'
        AND retry_count < max_retries
        AND next_retry_at <= NOW()
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_count FROM reset;
    
    RETURN v_count;
END;
$$;

-- Function to update sync cursor
CREATE OR REPLACE FUNCTION update_neptune_sync_cursor(
    p_cursor_id TEXT,
    p_last_commit_num BIGINT DEFAULT NULL,
    p_last_synced_uri TEXT DEFAULT NULL,
    p_error TEXT DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.neptune_sync_cursors
    SET 
        last_commit_num = COALESCE(p_last_commit_num, last_commit_num),
        last_synced_uri = COALESCE(p_last_synced_uri, last_synced_uri),
        last_synced_at = CASE WHEN p_error IS NULL THEN NOW() ELSE last_synced_at END,
        last_error = p_error,
        consecutive_errors = CASE 
            WHEN p_error IS NULL THEN 0 
            ELSE consecutive_errors + 1 
        END,
        updated_at = NOW()
    WHERE id = p_cursor_id;
END;
$$;

-- Function to get sync stats
CREATE OR REPLACE FUNCTION get_neptune_sync_stats()
RETURNS TABLE (
    direction TEXT,
    status TEXT,
    count BIGINT,
    oldest_pending TIMESTAMPTZ,
    newest_synced TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.direction,
        e.sync_status as status,
        COUNT(*) as count,
        MIN(e.created_at) FILTER (WHERE e.sync_status = 'pending') as oldest_pending,
        MAX(e.synced_at) FILTER (WHERE e.sync_status = 'synced') as newest_synced
    FROM public.neptune_sync_events e
    GROUP BY e.direction, e.sync_status
    ORDER BY e.direction, e.sync_status;
END;
$$;


-- ############################################################################
-- SECTION 6: SEED DATA
-- ############################################################################

-- Initialize default sync cursors
INSERT INTO neptune_sync_cursors (id, sync_type, entity_type, direction) VALUES
    ('story_works_incremental', 'incremental', 'story_work', 'neptune_to_postgres'),
    ('characters_incremental', 'incremental', 'character', 'neptune_to_postgres'),
    ('persons_incremental', 'incremental', 'person', 'neptune_to_postgres'),
    ('user_activity_incremental', 'incremental', 'user_activity', 'postgres_to_neptune')
ON CONFLICT (id) DO NOTHING;


-- ############################################################################
-- END OF MIGRATION
-- ############################################################################
--
-- Tables created:
--   • neptune_sync_events: Event log for all sync operations
--   • neptune_sync_cursors: Track sync position for incremental syncs
--
-- Functions created:
--   • enqueue_neptune_sync(): Add new sync event to queue
--   • claim_neptune_sync_batch(): Lock and retrieve events for processing
--   • complete_neptune_sync(): Mark event as success/failure
--   • reset_failed_neptune_syncs(): Reset failed events for retry
--   • update_neptune_sync_cursor(): Update cursor position
--   • get_neptune_sync_stats(): Get sync queue statistics
--
-- Usage patterns:
--
--   1. Neptune → PostgreSQL (narrative entities):
--      Edge Function polls Neptune SPARQL endpoint, enqueues events,
--      processes batch, updates products/profiles with Neptune URIs
--
--   2. PostgreSQL → Neptune (user activity):
--      Trigger or cron job aggregates likes/follows/reviews,
--      enqueues events, Edge Function pushes to Neptune for recommendations
--
-- ############################################################################