-- ============================================================================
-- Migration 010: E-Commerce (Carts & Orders)
-- Shopping carts, orders, order items, payment transactions
-- ============================================================================


-- ############################################################################
-- SECTION 1: CARTS
-- ############################################################################

CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    session_id TEXT,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    converted_to_order_id UUID,
    abandoned_at TIMESTAMPTZ,
    
    -- Optimistic locking
    version INT DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Must have either user_id or session_id (guest checkout)
    CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);


-- ############################################################################
-- SECTION 2: CART ITEMS
-- ############################################################################

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price_cents INT NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 3: ORDERS
-- ############################################################################

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    cart_id UUID,
    order_number TEXT UNIQUE NOT NULL,
    status_code TEXT NOT NULL DEFAULT 'pending_payment',
    
    -- Pricing
    subtotal_cents INT NOT NULL,
    tax_cents INT DEFAULT 0,
    shipping_cents INT DEFAULT 0,
    discount_cents INT DEFAULT 0,
    total_cents INT NOT NULL,
    currency TEXT DEFAULT 'USD' CHECK (length(currency) = 3),
    
    -- Payment
    payment_method TEXT,
    payment_provider TEXT,
    payment_provider_id TEXT,
    payment_status TEXT,
    paid_at TIMESTAMPTZ,
    
    -- Shipping
    shipping_address JSONB,
    billing_address JSONB,  -- If different from shipping
    shipping_method TEXT,
    tracking_number TEXT,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Cancellation/Refund
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    refunded_at TIMESTAMPTZ,
    refund_amount_cents INT,
    
    -- Audit columns
    created_by_user_id UUID,  -- Usually same as user_id, but admin can create on behalf
    updated_by_user_id UUID,
    
    -- Optimistic locking
    version INT DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 4: ORDER ITEMS
-- ############################################################################

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price_cents INT NOT NULL,
    subtotal_cents INT NOT NULL,
    
    -- Snapshot at time of purchase
    sku_code TEXT NOT NULL,
    product_title TEXT NOT NULL,
    product_snapshot JSONB,
    attributes_snapshot JSONB,
    
    fulfilled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 5: PAYMENT TRANSACTIONS
-- ############################################################################

CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    payment_provider TEXT NOT NULL,
    provider_transaction_id TEXT,
    amount_cents INT NOT NULL,
    currency TEXT NOT NULL CHECK (length(currency) = 3),
    transaction_type TEXT NOT NULL CHECK (
        transaction_type IN ('charge', 'refund', 'authorization', 'capture')
    ),
    status TEXT NOT NULL CHECK (
        status IN ('pending', 'succeeded', 'failed', 'canceled')
    ),
    failure_code TEXT,
    failure_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 6: ORDER STATUS HISTORY
-- ############################################################################

CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    from_status_code TEXT,
    to_status_code TEXT NOT NULL,
    changed_by_user_id UUID,
    changed_by_system TEXT,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 7: INDEXES
-- ############################################################################

-- Carts indexes
CREATE UNIQUE INDEX idx_carts_user ON carts(user_id) 
WHERE converted_to_order_id IS NULL AND user_id IS NOT NULL;
CREATE INDEX idx_carts_session ON carts(session_id) 
WHERE converted_to_order_id IS NULL AND session_id IS NOT NULL;

-- Cart items indexes
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE UNIQUE INDEX idx_cart_items_unique ON cart_items(cart_id, sku_id);

-- Orders indexes
CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status_code);

-- Order items indexes
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Payment transactions indexes
CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id);

-- Order status history indexes
CREATE INDEX idx_order_status_history_order ON order_status_history(order_id, created_at DESC);
CREATE INDEX idx_order_status_history_changed_by ON order_status_history(changed_by_user_id) 
WHERE changed_by_user_id IS NOT NULL;


-- ############################################################################
-- SECTION 8: CONSTRAINTS
-- ############################################################################

ALTER TABLE cart_items ADD CONSTRAINT cart_items_unique UNIQUE USING INDEX idx_cart_items_unique;


-- ############################################################################
-- SECTION 9: ROW LEVEL SECURITY
-- ############################################################################

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;


-- ############################################################################
-- SECTION 10: FOREIGN KEYS
-- ############################################################################

-- Carts FKs
ALTER TABLE carts 
ADD CONSTRAINT carts_user_fk 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE 
NOT VALID;

-- Cart items FKs
ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_cart_fk 
FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE 
NOT VALID;

ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_sku_fk 
FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE CASCADE 
NOT VALID;

-- Orders FKs
ALTER TABLE orders 
ADD CONSTRAINT orders_user_fk 
FOREIGN KEY (user_id) REFERENCES auth.users(id) 
NOT VALID;

ALTER TABLE orders 
ADD CONSTRAINT orders_cart_fk 
FOREIGN KEY (cart_id) REFERENCES carts(id) 
NOT VALID;

ALTER TABLE orders 
ADD CONSTRAINT orders_status_fk 
FOREIGN KEY (status_code) REFERENCES order_statuses(code) 
NOT VALID;

-- Order items FKs
ALTER TABLE order_items 
ADD CONSTRAINT order_items_order_fk 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE 
NOT VALID;

ALTER TABLE order_items 
ADD CONSTRAINT order_items_sku_fk 
FOREIGN KEY (sku_id) REFERENCES skus(id) 
NOT VALID;

-- Payment transactions FKs
ALTER TABLE payment_transactions 
ADD CONSTRAINT payment_transactions_order_fk 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE 
NOT VALID;

-- Order status history FKs
ALTER TABLE order_status_history 
ADD CONSTRAINT order_status_history_order_fk 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE 
NOT VALID;

ALTER TABLE order_status_history 
ADD CONSTRAINT order_status_history_from_fk 
FOREIGN KEY (from_status_code) REFERENCES order_statuses(code) 
NOT VALID;

ALTER TABLE order_status_history 
ADD CONSTRAINT order_status_history_to_fk 
FOREIGN KEY (to_status_code) REFERENCES order_statuses(code) 
NOT VALID;

ALTER TABLE order_status_history 
ADD CONSTRAINT order_status_history_user_fk 
FOREIGN KEY (changed_by_user_id) REFERENCES auth.users(id) 
NOT VALID;


-- ############################################################################
-- END OF MIGRATION
-- ############################################################################