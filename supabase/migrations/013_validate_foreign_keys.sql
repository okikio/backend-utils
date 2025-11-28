-- ============================================================================
-- Migration 013: Foreign Key Validation
-- Validates all NOT VALID foreign keys after data is loaded
-- ============================================================================
-- RATIONALE: Foreign keys are added with NOT VALID to avoid long locks during
-- initial creation. This migration validates them after all data is loaded.
--
-- Run AFTER seeding data for best results.
-- ============================================================================


-- ############################################################################
-- SECTION 1: PROFILES TABLE FKs
-- ############################################################################

ALTER TABLE profiles VALIDATE CONSTRAINT profiles_user_fk;
ALTER TABLE profiles VALIDATE CONSTRAINT profiles_status_fk;
ALTER TABLE profiles VALIDATE CONSTRAINT profiles_subscription_tier_fk;
ALTER TABLE profiles VALIDATE CONSTRAINT profiles_suspended_by_fk;
ALTER TABLE profiles VALIDATE CONSTRAINT profiles_verified_by_fk;


-- ############################################################################
-- SECTION 2: MODERATION LOG FKs
-- ############################################################################

ALTER TABLE moderation_log VALIDATE CONSTRAINT moderation_log_target_fk;
ALTER TABLE moderation_log VALIDATE CONSTRAINT moderation_log_moderator_fk;


-- ############################################################################
-- SECTION 3: USER PRODUCT STATE FKs
-- ############################################################################

ALTER TABLE user_product_state VALIDATE CONSTRAINT user_product_state_user_fk;
ALTER TABLE user_product_state VALIDATE CONSTRAINT user_product_state_product_fk;
ALTER TABLE user_product_state VALIDATE CONSTRAINT user_product_state_ownership_fk;
ALTER TABLE user_product_state VALIDATE CONSTRAINT user_product_state_consumption_fk;


-- ############################################################################
-- SECTION 4: NOTIFICATIONS FKs
-- ############################################################################

ALTER TABLE notifications VALIDATE CONSTRAINT notifications_user_fk;


-- ############################################################################
-- SECTION 5: PRODUCTS FKs
-- ############################################################################

ALTER TABLE products VALIDATE CONSTRAINT products_medium_fk;
ALTER TABLE products VALIDATE CONSTRAINT products_format_fk;
ALTER TABLE products VALIDATE CONSTRAINT products_status_fk;
ALTER TABLE products VALIDATE CONSTRAINT products_created_by_fk;
ALTER TABLE products VALIDATE CONSTRAINT products_updated_by_fk;


-- ############################################################################
-- SECTION 6: SKUS FKs
-- ############################################################################

ALTER TABLE skus VALIDATE CONSTRAINT skus_product_fk;
ALTER TABLE skus VALIDATE CONSTRAINT skus_created_by_fk;
ALTER TABLE skus VALIDATE CONSTRAINT skus_updated_by_fk;


-- ############################################################################
-- SECTION 7: SKU ATTRIBUTES FKs
-- ############################################################################

ALTER TABLE sku_attributes VALIDATE CONSTRAINT sku_attributes_sku_fk;
ALTER TABLE sku_attributes VALIDATE CONSTRAINT sku_attributes_option_fk;


-- ############################################################################
-- SECTION 8: LIKES FKs
-- ############################################################################

ALTER TABLE likes VALIDATE CONSTRAINT likes_user_fk;
ALTER TABLE likes VALIDATE CONSTRAINT likes_entity_type_fk;


-- ############################################################################
-- SECTION 9: COMMENTS FKs
-- ############################################################################

ALTER TABLE comments VALIDATE CONSTRAINT comments_user_fk;
ALTER TABLE comments VALIDATE CONSTRAINT comments_entity_type_fk;
ALTER TABLE comments VALIDATE CONSTRAINT comments_parent_fk;
ALTER TABLE comments VALIDATE CONSTRAINT comments_root_fk;
ALTER TABLE comments VALIDATE CONSTRAINT comments_moderation_fk;
ALTER TABLE comments VALIDATE CONSTRAINT comments_moderated_by_fk;


-- ############################################################################
-- SECTION 10: REVIEWS FKs
-- ############################################################################

ALTER TABLE reviews VALIDATE CONSTRAINT reviews_user_fk;
ALTER TABLE reviews VALIDATE CONSTRAINT reviews_entity_type_fk;
ALTER TABLE reviews VALIDATE CONSTRAINT reviews_moderation_fk;


-- ############################################################################
-- SECTION 11: REVIEW VOTES FKs
-- ############################################################################

ALTER TABLE review_votes VALIDATE CONSTRAINT review_votes_user_fk;
ALTER TABLE review_votes VALIDATE CONSTRAINT review_votes_review_fk;


-- ############################################################################
-- SECTION 12: COLLECTIONS FKs
-- ############################################################################

ALTER TABLE collections VALIDATE CONSTRAINT collections_owner_fk;
ALTER TABLE collections VALIDATE CONSTRAINT collections_visibility_fk;
ALTER TABLE collections VALIDATE CONSTRAINT collections_deleted_by_fk;


-- ############################################################################
-- SECTION 13: COLLECTION ITEMS FKs
-- ############################################################################

ALTER TABLE collection_items VALIDATE CONSTRAINT collection_items_collection_fk;
ALTER TABLE collection_items VALIDATE CONSTRAINT collection_items_entity_type_fk;
ALTER TABLE collection_items VALIDATE CONSTRAINT collection_items_added_by_fk;


-- ############################################################################
-- SECTION 14: COLLECTION HISTORY FKs
-- ############################################################################

ALTER TABLE collection_history VALIDATE CONSTRAINT collection_history_collection_fk;
ALTER TABLE collection_history VALIDATE CONSTRAINT collection_history_user_fk;


-- ############################################################################
-- SECTION 15: USER FOLLOWS FKs
-- ############################################################################

ALTER TABLE user_follows VALIDATE CONSTRAINT user_follows_user_fk;
ALTER TABLE user_follows VALIDATE CONSTRAINT user_follows_entity_type_fk;


-- ############################################################################
-- SECTION 16: PULL LIST ITEMS FKs
-- ############################################################################

ALTER TABLE pull_list_items VALIDATE CONSTRAINT pull_list_user_fk;
ALTER TABLE pull_list_items VALIDATE CONSTRAINT pull_list_product_fk;
ALTER TABLE pull_list_items VALIDATE CONSTRAINT pull_list_sku_fk;
ALTER TABLE pull_list_items VALIDATE CONSTRAINT pull_list_follow_fk;
ALTER TABLE pull_list_items VALIDATE CONSTRAINT pull_list_status_fk;


-- ############################################################################
-- SECTION 17: CHARACTER APPEARANCES FKs
-- ############################################################################

ALTER TABLE character_appearances VALIDATE CONSTRAINT character_appearances_product_fk;
ALTER TABLE character_appearances VALIDATE CONSTRAINT character_appearances_role_fk;


-- ############################################################################
-- SECTION 18: USER CHARACTER TRACKING FKs
-- ############################################################################

ALTER TABLE user_character_tracking VALIDATE CONSTRAINT user_character_tracking_user_fk;


-- ############################################################################
-- SECTION 19: STRIPE TABLES FKs
-- ############################################################################

ALTER TABLE stripe_customers VALIDATE CONSTRAINT stripe_customers_user_fk;
ALTER TABLE stripe_prices VALIDATE CONSTRAINT stripe_prices_product_fk;
ALTER TABLE stripe_subscriptions VALIDATE CONSTRAINT stripe_subs_user_fk;
ALTER TABLE stripe_subscriptions VALIDATE CONSTRAINT stripe_subs_customer_fk;
ALTER TABLE stripe_subscriptions VALIDATE CONSTRAINT stripe_subs_product_fk;
ALTER TABLE stripe_subscriptions VALIDATE CONSTRAINT stripe_subs_price_fk;


-- ############################################################################
-- SECTION 20: CARTS FKs
-- ############################################################################

ALTER TABLE carts VALIDATE CONSTRAINT carts_user_fk;


-- ############################################################################
-- SECTION 21: CART ITEMS FKs
-- ############################################################################

ALTER TABLE cart_items VALIDATE CONSTRAINT cart_items_cart_fk;
ALTER TABLE cart_items VALIDATE CONSTRAINT cart_items_sku_fk;


-- ############################################################################
-- SECTION 22: ORDERS FKs
-- ############################################################################

ALTER TABLE orders VALIDATE CONSTRAINT orders_user_fk;
ALTER TABLE orders VALIDATE CONSTRAINT orders_cart_fk;
ALTER TABLE orders VALIDATE CONSTRAINT orders_status_fk;


-- ############################################################################
-- SECTION 23: ORDER ITEMS FKs
-- ############################################################################

ALTER TABLE order_items VALIDATE CONSTRAINT order_items_order_fk;
ALTER TABLE order_items VALIDATE CONSTRAINT order_items_sku_fk;


-- ############################################################################
-- SECTION 24: PAYMENT TRANSACTIONS FKs
-- ############################################################################

ALTER TABLE payment_transactions VALIDATE CONSTRAINT payment_transactions_order_fk;


-- ############################################################################
-- SECTION 25: ORDER STATUS HISTORY FKs
-- ############################################################################

ALTER TABLE order_status_history VALIDATE CONSTRAINT order_status_history_order_fk;
ALTER TABLE order_status_history VALIDATE CONSTRAINT order_status_history_from_fk;
ALTER TABLE order_status_history VALIDATE CONSTRAINT order_status_history_to_fk;
ALTER TABLE order_status_history VALIDATE CONSTRAINT order_status_history_user_fk;


-- ############################################################################
-- SECTION 26: INVENTORY TABLES FKs
-- ############################################################################

ALTER TABLE inventory_transactions VALIDATE CONSTRAINT inventory_transactions_sku_fk;
ALTER TABLE inventory_transactions VALIDATE CONSTRAINT inventory_transactions_order_fk;
ALTER TABLE inventory_transactions VALIDATE CONSTRAINT inventory_transactions_order_item_fk;
ALTER TABLE inventory_transactions VALIDATE CONSTRAINT inventory_transactions_user_fk;

ALTER TABLE inventory_reservations VALIDATE CONSTRAINT inventory_reservations_sku_fk;
ALTER TABLE inventory_reservations VALIDATE CONSTRAINT inventory_reservations_cart_fk;
ALTER TABLE inventory_reservations VALIDATE CONSTRAINT inventory_reservations_order_fk;


-- ############################################################################
-- SECTION 27: POST-VALIDATION ANALYZE
-- ############################################################################
-- Run ANALYZE to update statistics after validation

ANALYZE profiles;
ANALYZE moderation_log;
ANALYZE user_product_state;
ANALYZE notifications;
ANALYZE products;
ANALYZE skus;
ANALYZE sku_attributes;
ANALYZE likes;
ANALYZE comments;
ANALYZE reviews;
ANALYZE review_votes;
ANALYZE collections;
ANALYZE collection_items;
ANALYZE collection_history;
ANALYZE user_follows;
ANALYZE pull_list_items;
ANALYZE character_appearances;
ANALYZE user_character_tracking;
ANALYZE stripe_customers;
ANALYZE stripe_products;
ANALYZE stripe_prices;
ANALYZE stripe_subscriptions;
ANALYZE carts;
ANALYZE cart_items;
ANALYZE orders;
ANALYZE order_items;
ANALYZE payment_transactions;
ANALYZE order_status_history;
ANALYZE inventory_transactions;
ANALYZE inventory_reservations;
ANALYZE neptune_sync_events;
ANALYZE neptune_sync_cursors;


-- ############################################################################
-- END OF MIGRATION
-- ############################################################################