-- ============================================================================
-- Migration 009: Stripe Billing
-- Stripe customer, product, price, and subscription sync tables
-- ============================================================================


-- ############################################################################
-- SECTION 1: STRIPE CUSTOMERS
-- ############################################################################

CREATE TABLE stripe_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    billing_address JSONB,
    payment_method JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 2: STRIPE PRODUCTS
-- ############################################################################

CREATE TABLE stripe_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_product_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    images TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 3: STRIPE PRICES
-- ############################################################################

CREATE TABLE stripe_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_product_id UUID NOT NULL,
    stripe_price_id TEXT NOT NULL UNIQUE,
    currency TEXT NOT NULL CHECK (length(currency) = 3),
    unit_amount INT,
    recurring_interval TEXT,
    recurring_interval_count INT DEFAULT 1,
    type TEXT NOT NULL CHECK (type IN ('one_time', 'recurring')),
    billing_scheme TEXT CHECK (billing_scheme IN ('per_unit', 'tiered')),
    active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 4: STRIPE SUBSCRIPTIONS
-- ############################################################################

CREATE TABLE stripe_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    stripe_customer_id UUID NOT NULL,
    stripe_product_id UUID NOT NULL,
    stripe_price_id UUID NOT NULL,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (
        status IN ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')
    ),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 5: INDEXES
-- ############################################################################

CREATE INDEX idx_stripe_customers_user ON stripe_customers(user_id);
CREATE INDEX idx_stripe_products_active ON stripe_products(active) WHERE active = TRUE;
CREATE INDEX idx_stripe_prices_product ON stripe_prices(stripe_product_id);
CREATE INDEX idx_stripe_prices_active ON stripe_prices(active) WHERE active = TRUE;
CREATE INDEX idx_stripe_subs_user ON stripe_subscriptions(user_id);
CREATE INDEX idx_stripe_subs_status ON stripe_subscriptions(status);

-- Composite index for active subscriptions by user
CREATE INDEX idx_stripe_subs_user_active ON stripe_subscriptions(user_id, status, current_period_end)
WHERE status IN ('active', 'trialing');


-- ############################################################################
-- SECTION 6: ROW LEVEL SECURITY
-- ############################################################################

ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;


-- ############################################################################
-- SECTION 7: FOREIGN KEYS
-- ############################################################################

ALTER TABLE stripe_customers 
ADD CONSTRAINT stripe_customers_user_fk 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE 
NOT VALID;

ALTER TABLE stripe_prices 
ADD CONSTRAINT stripe_prices_product_fk 
FOREIGN KEY (stripe_product_id) REFERENCES stripe_products(id) ON DELETE CASCADE 
NOT VALID;

ALTER TABLE stripe_subscriptions 
ADD CONSTRAINT stripe_subs_user_fk 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE 
NOT VALID;

ALTER TABLE stripe_subscriptions 
ADD CONSTRAINT stripe_subs_customer_fk 
FOREIGN KEY (stripe_customer_id) REFERENCES stripe_customers(id) 
NOT VALID;

ALTER TABLE stripe_subscriptions 
ADD CONSTRAINT stripe_subs_product_fk 
FOREIGN KEY (stripe_product_id) REFERENCES stripe_products(id) 
NOT VALID;

ALTER TABLE stripe_subscriptions 
ADD CONSTRAINT stripe_subs_price_fk 
FOREIGN KEY (stripe_price_id) REFERENCES stripe_prices(id) 
NOT VALID;


-- ############################################################################
-- END OF MIGRATION
-- ############################################################################