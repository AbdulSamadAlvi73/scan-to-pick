-- Seed Data for Scan-to-Pick Demo Batch
-- Exactly 1 Batch with 8 Lines
-- Products have realistic EAN barcodes and secondary stocked locations

BEGIN;

-- 1. Insert Locations
INSERT INTO locations (id, code, zone) VALUES
    (1, 'A-01-01', 'A'),
    (2, 'A-01-02', 'A'),
    (3, 'A-02-01', 'A'),
    (4, 'B-03-01', 'B'),
    (5, 'B-03-02', 'B'),
    (6, 'B-04-01', 'B'),
    (7, 'C-01-01', 'C'),
    (8, 'C-02-01', 'C'),
    (9, 'B-09-02', 'B'),           -- Alternative location
    (10, 'C-05-03', 'C'),          -- Alternative location
    (11, 'OVERFLOW-A1', 'STORAGE'),-- Alternative location
    (12, 'OVERFLOW-B2', 'STORAGE') -- Alternative location
ON CONFLICT (id) DO UPDATE 
SET code = EXCLUDED.code, zone = EXCLUDED.zone;

SELECT setval('locations_id_seq', (SELECT MAX(id) FROM locations));

-- 2. Insert Products (8 items with distinct 13-digit EANs)
INSERT INTO products (id, sku, name, ean) VALUES
    (1, 'TECH-KB-01', 'Pro Wireless Mechanical Keyboard', '8712345678901'),
    (2, 'TECH-MS-02', 'Ergonomic Vertical Optical Mouse', '8712345678918'),
    (3, 'CBL-USBC-03', 'Heavy-Duty Braided USB-C Cable 2M', '8712345678925'),
    (4, 'CBL-DP-04', 'Ultra-Clear 4K DisplayPort Cable', '8712345678932'),
    (5, 'AUD-HSET-05', 'Noise-Cancelling Over-Ear Headset', '8712345678949'),
    (6, 'ACC-MNT-06', 'MagSafe Magnetic Phone Mount', '8712345678956'),
    (7, 'PWR-CHG-07', '65W GaN Dual-Port Fast Charger', '8712345678963'),
    (8, 'CLN-KIT-08', 'Anti-Static Microfiber Cleaning Kit', '8712345678970')
ON CONFLICT (id) DO UPDATE 
SET sku = EXCLUDED.sku, name = EXCLUDED.name, ean = EXCLUDED.ean;

SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));

-- 3. Insert Product Stock at Locations (including secondary stocked locations)
INSERT INTO product_locations (product_id, location_id, stock_quantity) VALUES
    -- Line 1 Product (Keyboard): In primary A-01-01 and secondary OVERFLOW-A1
    (1, 1, 15),
    (1, 11, 24),
    
    -- Line 2 Product (Mouse): In primary A-01-02 and secondary B-09-02
    (2, 2, 12),
    (2, 9, 8),
    
    -- Line 3 Product (USB-C Cable): In primary A-02-01 and secondary OVERFLOW-B2
    (3, 3, 45),
    (3, 12, 100),
    
    -- Line 4 Product (DisplayPort): Only at primary B-03-01
    (4, 4, 20),
    
    -- Line 5 Product (Headset): In primary B-03-02 and secondary C-05-03
    (5, 5, 8),
    (5, 10, 15),
    
    -- Line 6 Product (Phone Mount): Only at primary B-04-01
    (6, 6, 30),
    
    -- Line 7 Product (Fast Charger): In primary C-01-01 and secondary OVERFLOW-A1
    (7, 7, 14),
    (7, 11, 25),
    
    -- Line 8 Product (Cleaning Kit): Only at primary C-02-01
    (8, 8, 50)
ON CONFLICT (product_id, location_id) DO UPDATE 
SET stock_quantity = EXCLUDED.stock_quantity;

-- 4. Insert Batch
INSERT INTO batches (id, batch_number, status) VALUES
    (1, 'BATCH-2026-001', 'in_progress')
ON CONFLICT (id) DO UPDATE 
SET batch_number = EXCLUDED.batch_number, status = 'in_progress', updated_at = CURRENT_TIMESTAMP;

SELECT setval('batches_id_seq', (SELECT MAX(id) FROM batches));

-- 5. Insert Exactly 8 Batch Lines
DELETE FROM batch_lines WHERE batch_id = 1;

INSERT INTO batch_lines (batch_id, line_number, product_id, assigned_location_id, required_qty, picked_qty, is_completed) VALUES
    (1, 1, 1, 1, 2, 0, false), -- Keyboard at A-01-01 (Qty 2) [Alt: OVERFLOW-A1]
    (1, 2, 2, 2, 1, 0, false), -- Mouse at A-01-02 (Qty 1) [Alt: B-09-02]
    (1, 3, 3, 3, 3, 0, false), -- USB-C at A-02-01 (Qty 3) [Alt: OVERFLOW-B2]
    (1, 4, 4, 4, 1, 0, false), -- DP Cable at B-03-01 (Qty 1)
    (1, 5, 5, 5, 2, 0, false), -- Headset at B-03-02 (Qty 2) [Alt: C-05-03]
    (1, 6, 6, 6, 1, 0, false), -- Mount at B-04-01 (Qty 1)
    (1, 7, 7, 7, 2, 0, false), -- Charger at C-01-01 (Qty 2) [Alt: OVERFLOW-A1]
    (1, 8, 8, 8, 1, 0, false); -- Cleaner at C-02-01 (Qty 1)

COMMIT;
