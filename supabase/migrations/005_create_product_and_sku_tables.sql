-- ============================================================================
-- Migration 005: Product System
-- Base products, attributes, SKUs, and variants
-- ============================================================================


-- ############################################################################
-- SECTION 1: PRODUCTS TABLE
-- ############################################################################
-- Links to Neptune StoryWorks/Expressions via URIs

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Neptune linkage (RDF URIs from knowledge graph)
    story_work_uri TEXT,
    story_expression_uri TEXT,
    narrative_unit_uri TEXT,
    
    -- Product essentials
    sku TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    
    medium_code TEXT NOT NULL,
    format_code TEXT NOT NULL,
    status_code TEXT NOT NULL DEFAULT 'active',
    
    -- Release tracking (temporal patterns)
    release_date DATE,
    preorder_opens_at TIMESTAMPTZ,
    preorder_closes_at TIMESTAMPTZ,
    
    -- Cached metadata from Neptune
    description TEXT,
    publisher_name TEXT,
    cover_image_url TEXT,
    
    -- Additional images (JSONB array of image objects)
    -- Format: [{"url": "...", "type": "cover|variant|page|promotional", "alt": "..."}]
    images JSONB DEFAULT '[]'::jsonb,
    
    -- Base pricing
    base_price_cents INT NOT NULL,
    currency TEXT DEFAULT 'USD' CHECK (length(currency) = 3),
    
    -- Aggregated metrics (updated via triggers)
    -- DECIMAL(3,2) allows 0.00-9.99, sufficient for 0-5 star ratings
    rating_avg DECIMAL(3,2) CHECK (rating_avg >= 0 AND rating_avg <= 5),
    rating_count INT DEFAULT 0,
    review_count INT DEFAULT 0,
    sales_total INT DEFAULT 0,
    
    -- NOTE: Full-text search handled by Typesense for knowledge graph data
    -- Supabase hybrid search available for basic queries if needed
    
    -- Lifecycle (temporal pattern)
    featured_until TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    
    -- Audit columns
    created_by_user_id UUID,
    updated_by_user_id UUID,
    
    last_synced_from_neptune_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 2: SKUS TABLE
-- ############################################################################
-- Individual sellable variants

CREATE TABLE skus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    
    sku_code TEXT UNIQUE NOT NULL,
    
    -- Pricing
    price_cents INT NOT NULL,
    original_price_cents INT,
    
    -- Inventory
    stock_quantity INT DEFAULT 0,
    low_stock_threshold INT DEFAULT 5,
    backorder_allowed_until TIMESTAMPTZ,
    
    -- Availability window
    available_from TIMESTAMPTZ DEFAULT NOW(),
    available_until TIMESTAMPTZ,
    
    -- Audit columns
    created_by_user_id UUID,
    updated_by_user_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ############################################################################
-- SECTION 3: SKU ATTRIBUTES
-- ############################################################################
-- Link SKUs to their attribute values

CREATE TABLE sku_attributes (
    sku_id UUID NOT NULL,
    attribute_option_id UUID NOT NULL,
    
    PRIMARY KEY (sku_id, attribute_option_id)
);


-- ############################################################################
-- SECTION 4: INDEXES
-- ############################################################################

-- Products indexes
CREATE INDEX idx_products_medium_status ON products(medium_code, status_code) WHERE archived_at IS NULL;
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_featured ON products(featured_until) WHERE featured_until IS NOT NULL;
CREATE INDEX idx_products_release ON products(release_date DESC);

-- Publisher index (for filtering by publisher)
CREATE INDEX idx_products_publisher ON products(publisher_name) WHERE archived_at IS NULL;

-- Neptune entity indexes (for joining with knowledge graph)
CREATE INDEX idx_products_story_work ON products(story_work_uri) WHERE story_work_uri IS NOT NULL;
CREATE INDEX idx_products_story_expression ON products(story_expression_uri) WHERE story_expression_uri IS NOT NULL;

-- SKUs indexes
CREATE INDEX idx_skus_product ON skus(product_id);
CREATE INDEX idx_skus_stock ON skus(stock_quantity) WHERE stock_quantity > 0;
CREATE INDEX idx_skus_available ON skus(available_from, available_until) WHERE available_until IS NULL OR available_until > available_from;

-- SKU attributes indexes
CREATE INDEX idx_sku_attributes_sku ON sku_attributes(sku_id);
CREATE INDEX idx_sku_attributes_option ON sku_attributes(attribute_option_id);


-- ############################################################################
-- SECTION 5: ROW LEVEL SECURITY
-- ############################################################################

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;


-- ############################################################################
-- SECTION 6: FOREIGN KEYS
-- ############################################################################

-- Products FKs
ALTER TABLE products 
ADD CONSTRAINT products_medium_fk 
FOREIGN KEY (medium_code) REFERENCES product_mediums(code)
NOT VALID;

ALTER TABLE products 
ADD CONSTRAINT products_format_fk 
FOREIGN KEY (format_code) REFERENCES product_formats(code)
NOT VALID;

ALTER TABLE products 
ADD CONSTRAINT products_status_fk 
FOREIGN KEY (status_code) REFERENCES product_statuses(code)
NOT VALID;

ALTER TABLE products 
ADD CONSTRAINT products_created_by_fk 
FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id)
NOT VALID;

ALTER TABLE products 
ADD CONSTRAINT products_updated_by_fk 
FOREIGN KEY (updated_by_user_id) REFERENCES auth.users(id)
NOT VALID;

-- SKUs FKs
ALTER TABLE skus 
ADD CONSTRAINT skus_product_fk 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE skus 
ADD CONSTRAINT skus_created_by_fk 
FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id)
NOT VALID;

ALTER TABLE skus 
ADD CONSTRAINT skus_updated_by_fk 
FOREIGN KEY (updated_by_user_id) REFERENCES auth.users(id)
NOT VALID;

-- SKU attributes FKs
ALTER TABLE sku_attributes 
ADD CONSTRAINT sku_attributes_sku_fk 
FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE sku_attributes 
ADD CONSTRAINT sku_attributes_option_fk 
FOREIGN KEY (attribute_option_id) REFERENCES attribute_options(id) ON DELETE CASCADE
NOT VALID;

-- Link user_product_state to products (from previous migration)
ALTER TABLE user_product_state 
ADD CONSTRAINT user_product_state_product_fk 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
NOT VALID;


-- ############################################################################
-- END OF MIGRATION
-- ############################################################################