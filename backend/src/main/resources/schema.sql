-- Spring Boot runs this automatically on every startup (spring.sql.init.mode=always
-- in application.properties). Safe to re-run — everything is IF NOT EXISTS.
-- You can also run it by hand with psql if you prefer.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

CREATE TABLE IF NOT EXISTS companies (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Company Information
  company_code             TEXT NOT NULL,
  company_name             TEXT NOT NULL,
  legal_name                TEXT DEFAULT '',
  short_name                TEXT DEFAULT '',
  business_type              TEXT DEFAULT 'Manufacturing',
  industry                  TEXT DEFAULT '',
  logo                      TEXT DEFAULT '',        -- base64 data URL of the uploaded logo
  status                    TEXT DEFAULT 'Active',

  -- Legal Information
  pan_no                    TEXT DEFAULT '',
  gstin                     TEXT DEFAULT '',
  cin_llpin                 TEXT DEFAULT '',
  tan                       TEXT DEFAULT '',
  msme_registration         TEXT DEFAULT '',
  factory_license_no        TEXT DEFAULT '',
  iec                       TEXT DEFAULT '',
  pf_establishment_code     TEXT DEFAULT '',
  esi_code                  TEXT DEFAULT '',
  professional_tax_no       TEXT DEFAULT '',
  pollution_certificate_no  TEXT DEFAULT '',

  -- Address Details
  registered_office         TEXT DEFAULT '',
  factory_address           TEXT DEFAULT '',
  branch_address             TEXT DEFAULT '',
  city                      TEXT DEFAULT '',
  state                     TEXT DEFAULT '',
  country                   TEXT DEFAULT 'India',
  pin_code                  TEXT DEFAULT '',

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS companies_search_idx
  ON companies USING gin (to_tsvector('simple', company_name || ' ' || company_code));

-- =============================================================================
-- ERP Inventory / Transaction Management Module
-- =============================================================================

-- 1. Department Table
CREATE TABLE IF NOT EXISTS department (
  id   BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

-- Seed initial departments if empty
INSERT INTO department (name) VALUES
  ('Production'),
  ('Maintenance'),
  ('Quality Control'),
  ('Stores'),
  ('Administration')
ON CONFLICT (name) DO NOTHING;

-- 2. Transaction Type Table
CREATE TABLE IF NOT EXISTS transaction_type (
  id   BIGSERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL UNIQUE
);

-- Seed initial transaction types if empty
INSERT INTO transaction_type (type) VALUES
  ('ISSUE'),
  ('RECEIPT'),
  ('REVERSE')
ON CONFLICT (type) DO NOTHING;

-- 3. Master Table (Material Master)
CREATE TABLE IF NOT EXISTS master (
  id                  BIGSERIAL PRIMARY KEY,
  code                VARCHAR(100) NOT NULL UNIQUE,
  description         VARCHAR(255) NOT NULL,
  category            VARCHAR(100) NOT NULL DEFAULT 'General',
  unit_of_measurement VARCHAR(50) NOT NULL,
  opening_balance     NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
  store_name          VARCHAR(100) NOT NULL
);

ALTER TABLE master ADD COLUMN IF NOT EXISTS category VARCHAR(100) NOT NULL DEFAULT 'General';

-- Seed initial material master data if empty
INSERT INTO master (code, description, category, unit_of_measurement, opening_balance, store_name) VALUES
  ('MAT-001', 'Steel Sheet',         'Raw Material', 'KG',  5000, 'Main Store'),
  ('MAT-002', 'Stainless Steel Rod', 'Raw Material', 'KG',  2500, 'Main Store'),
  ('MAT-003', 'Bearing 6205',        'Spare Parts',  'PCS', 150,  'Maintenance Store'),
  ('MAT-004', 'Lubricating Oil',     'Consumables',  'LTR', 500,  'Maintenance Store'),
  ('MAT-005', 'Welding Electrode',   'Consumables',  'KG',  300,  'Production Store')
ON CONFLICT (code) DO UPDATE SET category = EXCLUDED.category;

-- 4. Inventory Transaction Table
CREATE TABLE IF NOT EXISTS inventory_transaction (
  id                      BIGSERIAL PRIMARY KEY,
  transaction_number      VARCHAR(50) NOT NULL,
  slip_number             VARCHAR(100),
  transaction_type_id     BIGINT NOT NULL REFERENCES transaction_type(id),
  master_id               BIGINT NOT NULL REFERENCES master(id),
  from_department_id      BIGINT NOT NULL REFERENCES department(id),
  to_department_id        BIGINT REFERENCES department(id),
  quantity                NUMERIC(15, 2) NOT NULL CHECK (quantity > 0),
  transaction_date        TIMESTAMPTZ NOT NULL DEFAULT now(),
  remarks                 TEXT,
  reversed_transaction_id BIGINT REFERENCES inventory_transaction(id)
);

-- Migration steps for existing database instances
ALTER TABLE inventory_transaction DROP CONSTRAINT IF EXISTS inventory_transaction_slip_number_key;
ALTER TABLE inventory_transaction ADD COLUMN IF NOT EXISTS transaction_number VARCHAR(50);
UPDATE inventory_transaction SET transaction_number = slip_number WHERE transaction_number IS NULL;
ALTER TABLE inventory_transaction ALTER COLUMN slip_number DROP NOT NULL;
ALTER TABLE inventory_transaction ADD COLUMN IF NOT EXISTS from_department_id BIGINT REFERENCES department(id);
ALTER TABLE inventory_transaction ADD COLUMN IF NOT EXISTS to_department_id BIGINT REFERENCES department(id);

CREATE INDEX IF NOT EXISTS idx_inv_tx_transaction_number ON inventory_transaction(transaction_number);
CREATE INDEX IF NOT EXISTS idx_inv_tx_slip_number ON inventory_transaction(slip_number);
CREATE INDEX IF NOT EXISTS idx_inv_tx_master_id ON inventory_transaction(master_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_type_id ON inventory_transaction(transaction_type_id);

CREATE INDEX IF NOT EXISTS idx_inv_tx_type_id ON inventory_transaction(transaction_type_id);

