-- ============================================================================
-- Migration 011: Inventory Management
-- Inventory transactions and reservations for stock management
-- ============================================================================
-- NOTE: neptune_sync_events has been moved to 003_create_neptune_bridge.sql
-- ============================================================================


-- ############################################################################
-- SECTION 1: INVENTORY TRANSACTIONS
-- ############################################################################

CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_id UUID NOT NULL,
    quantity_change INT NOT NULL,
    quantity_before INT NOT NULL,
    quantity_after INT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (
        transaction_type IN (
            'purchase', 
            'sale', 
            'return', 
            'adjustment', 
            'damage', 
            'loss', 
            'restock', 
            'reserve', 
            'release_reserve'
        )
    ),
    order_id UUID,
    order_item_id UUID,
    reason TEXT,
    notes TEXT,
    performed_by_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 2: INVENTORY RESERVATIONS
-- ############################################################################

CREATE TABLE inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_id UUID NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    cart_id UUID,
    order_id UUID,
    reserved_until TIMESTAMPTZ NOT NULL,
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Must have either cart_id or order_id (not both)
    CHECK (
        (cart_id IS NOT NULL AND order_id IS NULL) 
        OR 
        (cart_id IS NULL AND order_id IS NOT NULL)
    )
);


-- ############################################################################
-- SECTION 3: INDEXES
-- ############################################################################

-- Inventory transactions indexes
CREATE INDEX idx_inventory_transactions_sku ON inventory_transactions(sku_id, created_at DESC);
CREATE INDEX idx_inventory_transactions_performed_by ON inventory_transactions(performed_by_user_id, created_at DESC)
WHERE performed_by_user_id IS NOT NULL;

-- Inventory reservations indexes
CREATE INDEX idx_inventory_reservations_sku ON inventory_reservations(sku_id);
CREATE INDEX idx_inventory_reservations_cart ON inventory_reservations(cart_id) 
WHERE released_at IS NULL;
CREATE INDEX idx_inventory_reservations_order ON inventory_reservations(order_id) 
WHERE released_at IS NULL;
CREATE INDEX idx_inventory_reservations_expired ON inventory_reservations(reserved_until) 
WHERE released_at IS NULL;


-- ############################################################################
-- SECTION 4: FOREIGN KEYS
-- ############################################################################

ALTER TABLE inventory_transactions 
ADD CONSTRAINT inventory_transactions_sku_fk 
FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE CASCADE 
NOT VALID;

ALTER TABLE inventory_transactions 
ADD CONSTRAINT inventory_transactions_order_fk 
FOREIGN KEY (order_id) REFERENCES orders(id) 
NOT VALID;

ALTER TABLE inventory_transactions 
ADD CONSTRAINT inventory_transactions_order_item_fk 
FOREIGN KEY (order_item_id) REFERENCES order_items(id) 
NOT VALID;

ALTER TABLE inventory_transactions 
ADD CONSTRAINT inventory_transactions_user_fk 
FOREIGN KEY (performed_by_user_id) REFERENCES auth.users(id) 
NOT VALID;

ALTER TABLE inventory_reservations 
ADD CONSTRAINT inventory_reservations_sku_fk 
FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE CASCADE 
NOT VALID;

ALTER TABLE inventory_reservations 
ADD CONSTRAINT inventory_reservations_cart_fk 
FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE 
NOT VALID;

ALTER TABLE inventory_reservations 
ADD CONSTRAINT inventory_reservations_order_fk 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE 
NOT VALID;


-- ############################################################################
-- END OF MIGRATION
-- ############################################################################