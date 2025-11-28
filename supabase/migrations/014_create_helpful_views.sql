-- ============================================================================
-- Migration 014: Helpful Views
-- Create views for common query patterns to simplify application code
-- ============================================================================
-- Uses owner_id for collections (semantic naming)
-- ============================================================================


-- ############################################################################
-- SECTION 1: COLLECTION VIEWS
-- ############################################################################

-- Active collections (excludes soft-deleted)
CREATE VIEW active_collections AS
SELECT * FROM collections
WHERE deleted_at IS NULL;

-- Collections with computed item counts
CREATE VIEW collections_with_counts AS
SELECT 
    c.*,
    COUNT(ci.id) as actual_item_count
FROM collections c
LEFT JOIN collection_items ci ON c.id = ci.collection_id
WHERE c.deleted_at IS NULL
GROUP BY c.id;

-- User collections with owner profile info
CREATE VIEW user_collections AS
SELECT 
    c.*,
    p.username as owner_username,
    p.display_name as owner_display_name,
    p.avatar_url as owner_avatar_url
FROM collections c
JOIN profiles p ON c.owner_id = p.id
WHERE c.deleted_at IS NULL;


-- ############################################################################
-- SECTION 2: USER PRODUCT STATE VIEWS
-- ############################################################################

-- User owned products
CREATE VIEW user_owned_products AS
SELECT 
    ups.user_id,
    p.*,
    ups.ownership_type_code,
    ups.purchased_at
FROM user_product_state ups
JOIN products p ON ups.product_id = p.id
WHERE ups.purchased_at IS NOT NULL
AND p.archived_at IS NULL;

-- User wishlist
CREATE VIEW user_wishlist AS
SELECT 
    ups.user_id,
    p.*,
    ups.wishlisted_at,
    ups.wishlist_priority,
    ups.wishlist_notes
FROM user_product_state ups
JOIN products p ON ups.product_id = p.id
WHERE ups.wishlisted_at IS NOT NULL
AND ups.purchased_at IS NULL
AND p.archived_at IS NULL
ORDER BY ups.wishlist_priority DESC, ups.wishlisted_at DESC;


-- ############################################################################
-- SECTION 3: PRODUCT VIEWS
-- ############################################################################

-- Products with aggregated statistics
CREATE VIEW products_with_stats AS
SELECT 
    p.*,
    COUNT(DISTINCT ups.user_id) FILTER (WHERE ups.purchased_at IS NOT NULL) as owners_count,
    COUNT(DISTINCT ups.user_id) FILTER (WHERE ups.wishlisted_at IS NOT NULL AND ups.purchased_at IS NULL) as wishlist_count,
    AVG(r.rating) FILTER (WHERE r.deleted_at IS NULL AND r.moderation_status_code = 'approved') as computed_avg_rating,
    COUNT(DISTINCT r.id) FILTER (WHERE r.deleted_at IS NULL AND r.moderation_status_code = 'approved') as computed_review_count
FROM products p
LEFT JOIN user_product_state ups ON p.id = ups.product_id
LEFT JOIN reviews r ON p.id::text = r.target_id AND r.target_type_code = 'product'
WHERE p.archived_at IS NULL
GROUP BY p.id;

-- Available products (currently purchasable)
CREATE VIEW available_products AS
SELECT p.*
FROM products p
JOIN product_statuses ps ON p.status_code = ps.code
WHERE p.archived_at IS NULL
AND ps.is_available_for_purchase = TRUE
AND (p.featured_until IS NULL OR p.featured_until > NOW());

-- In-stock SKUs
CREATE VIEW in_stock_skus AS
SELECT 
    s.*,
    p.title as product_title,
    p.slug as product_slug
FROM skus s
JOIN products p ON s.product_id = p.id
WHERE (s.stock_quantity > 0 OR s.backorder_allowed_until > NOW())
AND (s.available_until IS NULL OR s.available_until > NOW())
AND p.archived_at IS NULL;


-- ############################################################################
-- SECTION 4: UGC VIEWS
-- ############################################################################

-- Active comments with reply counts
CREATE VIEW active_comments_with_replies AS
SELECT 
    c.*,
    COUNT(replies.id) as actual_reply_count
FROM comments c
LEFT JOIN comments replies ON c.id = replies.parent_comment_id 
    AND replies.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id;

-- Approved reviews with vote counts
CREATE VIEW approved_reviews AS
SELECT 
    r.*,
    COUNT(rv.user_id) FILTER (WHERE rv.is_helpful = TRUE) as computed_helpful_count,
    COUNT(rv.user_id) FILTER (WHERE rv.is_helpful = FALSE) as computed_unhelpful_count
FROM reviews r
LEFT JOIN review_votes rv ON r.id = rv.review_id
WHERE r.deleted_at IS NULL
AND r.moderation_status_code = 'approved'
GROUP BY r.id;


-- ############################################################################
-- SECTION 5: ORDER VIEWS
-- ############################################################################

-- Active orders by user (non-cancelled, non-completed)
CREATE VIEW active_orders_by_user AS
SELECT 
    o.*,
    COUNT(oi.id) as item_count,
    STRING_AGG(DISTINCT oi.product_title, ', ') as product_titles
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.cancelled_at IS NULL
AND o.delivered_at IS NULL
GROUP BY o.id;


-- ############################################################################
-- SECTION 6: NEPTUNE SYNC VIEWS
-- ############################################################################

-- Pending sync events summary
CREATE VIEW neptune_sync_pending_summary AS
SELECT 
    direction,
    entity_type,
    COUNT(*) as pending_count,
    MIN(created_at) as oldest_pending,
    MAX(created_at) as newest_pending
FROM neptune_sync_events
WHERE sync_status = 'pending'
GROUP BY direction, entity_type
ORDER BY pending_count DESC;

-- Failed sync events (retryable)
CREATE VIEW neptune_sync_retryable AS
SELECT *
FROM neptune_sync_events
WHERE sync_status = 'failed'
AND retry_count < max_retries
AND (next_retry_at IS NULL OR next_retry_at <= NOW())
ORDER BY created_at ASC;

-- Sync cursor status
CREATE VIEW neptune_sync_cursor_status AS
SELECT 
    id,
    entity_type,
    direction,
    sync_type,
    last_synced_at,
    last_commit_num,
    consecutive_errors,
    last_error,
    is_active
FROM neptune_sync_cursors
ORDER BY entity_type, direction;


-- ############################################################################
-- COMMENTS
-- ############################################################################
-- These views are read-only representations.
-- They cannot be used for INSERT, UPDATE, or DELETE operations.
-- They are designed to simplify SELECT queries in your application.
-- Always use the base tables for write operations.
-- ############################################################################


-- ############################################################################
-- END OF MIGRATION
-- ############################################################################