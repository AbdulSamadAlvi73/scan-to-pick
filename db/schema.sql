-- Scan-to-Pick Database Schema for Loopin / SYNC FULFILLMENT
-- Target: PostgreSQL 14+ (Supabase, Neon, or local PostgreSQL)

-- 1. Batches table
CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    batch_number VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Warehouse Locations table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    zone VARCHAR(20) NOT NULL DEFAULT 'MAIN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products table with unique EAN-13 barcodes
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    ean VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Product Stock at Locations (Inventory)
-- Allows checking stock availability at primary and alternative warehouse locations
CREATE TABLE IF NOT EXISTS product_locations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, location_id)
);

-- 5. Batch Lines table
-- Stores the assigned location, required quantity, and real picked progress
CREATE TABLE IF NOT EXISTS batch_lines (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    assigned_location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    required_qty INTEGER NOT NULL CHECK (required_qty > 0),
    picked_qty INTEGER NOT NULL DEFAULT 0 CHECK (picked_qty >= 0 AND picked_qty <= required_qty),
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, line_number)
);

-- Helpful indexes for high-frequency scanner queries
CREATE INDEX IF NOT EXISTS idx_batch_lines_batch_completion ON batch_lines(batch_id, is_completed, line_number);
CREATE INDEX IF NOT EXISTS idx_products_ean ON products(ean);
CREATE INDEX IF NOT EXISTS idx_product_locations_lookup ON product_locations(product_id, location_id);
