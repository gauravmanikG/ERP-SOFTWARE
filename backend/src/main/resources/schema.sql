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

-- Seed operation names as transaction types (same list as operation_master)
INSERT INTO transaction_type (type) VALUES
  ('Material Transfer'),
  ('Internal Material Return'),
  ('Rejection Tfd to Burning'),
  ('Rejection tfd to Scrap Yard'),
  ('Recycle Material Issue'),
  ('Material Send for Job work'),
  ('Customer Rejection Receipt'),
  ('Customer Rejection Dismentle & SFG Recover'),
  ('FG Dismantling & SFG Recovery'),
  ('Rework')
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

-- =============================================================================
-- SMS Inventory Module — Item Master
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS sms_inventory;

CREATE TABLE IF NOT EXISTS sms_inventory.item_master (
  id                       BIGSERIAL PRIMARY KEY,
  group_name               VARCHAR(255),
  subgroup                 VARCHAR(255),
  group_code               VARCHAR(255),
  old_code                 VARCHAR(255),
  main_fg_code             VARCHAR(255),
  sms_new_part_no          VARCHAR(255),
  description_size         TEXT,
  fg_outsource             VARCHAR(255),
  sfg_outsource            VARCHAR(255),
  outsource_combo_fg_sfg   VARCHAR(255),
  purchased_uom            VARCHAR(100),
  consumption_uom          VARCHAR(100),
  inner_diameter           VARCHAR(255),
  outer_diameter           VARCHAR(255),
  width                    VARCHAR(255),
  thickness                VARCHAR(255),
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.item_master (
  id                       BIGSERIAL PRIMARY KEY,
  group_name               VARCHAR(255),
  subgroup                 VARCHAR(255),
  group_code               VARCHAR(255),
  old_code                 VARCHAR(255),
  main_fg_code             VARCHAR(255),
  sms_new_part_no          VARCHAR(255),
  description_size         TEXT,
  fg_outsource             VARCHAR(255),
  sfg_outsource            VARCHAR(255),
  outsource_combo_fg_sfg   VARCHAR(255),
  purchased_uom            VARCHAR(100),
  consumption_uom          VARCHAR(100),
  inner_diameter           VARCHAR(255),
  outer_diameter           VARCHAR(255),
  width                    VARCHAR(255),
  thickness                VARCHAR(255),
  segment                  VARCHAR(255),
  region                   VARCHAR(255),
  application              VARCHAR(255),
  ref_no                   VARCHAR(255),
  oem                      VARCHAR(255),
  corteco_no               VARCHAR(255),
  category                 VARCHAR(255),
  image                    TEXT,
  material                 VARCHAR(255),
  color                    VARCHAR(255),
  uom                      VARCHAR(100),
  price                    NUMERIC(15,2),
  type                     VARCHAR(255),
  fitting_position         VARCHAR(255),
  swirl_type               VARCHAR(255),
  file_name                VARCHAR(255),
  domestic_exports         VARCHAR(255),
  cross_reference          VARCHAR(255),
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.item_master
  ADD COLUMN IF NOT EXISTS segment VARCHAR(255),
  ADD COLUMN IF NOT EXISTS region VARCHAR(255),
  ADD COLUMN IF NOT EXISTS application VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ref_no VARCHAR(255),
  ADD COLUMN IF NOT EXISTS oem VARCHAR(255),
  ADD COLUMN IF NOT EXISTS corteco_no VARCHAR(255),
  ADD COLUMN IF NOT EXISTS category VARCHAR(255),
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS material VARCHAR(255),
  ADD COLUMN IF NOT EXISTS color VARCHAR(255),
  ADD COLUMN IF NOT EXISTS uom VARCHAR(100),
  ADD COLUMN IF NOT EXISTS price NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS fitting_position VARCHAR(255),
  ADD COLUMN IF NOT EXISTS swirl_type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS domestic_exports VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cross_reference VARCHAR(255);

ALTER TABLE sms_inventory.item_master
  ADD COLUMN IF NOT EXISTS segment VARCHAR(255),
  ADD COLUMN IF NOT EXISTS region VARCHAR(255),
  ADD COLUMN IF NOT EXISTS application VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ref_no VARCHAR(255),
  ADD COLUMN IF NOT EXISTS oem VARCHAR(255),
  ADD COLUMN IF NOT EXISTS corteco_no VARCHAR(255),
  ADD COLUMN IF NOT EXISTS category VARCHAR(255),
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS material VARCHAR(255),
  ADD COLUMN IF NOT EXISTS color VARCHAR(255),
  ADD COLUMN IF NOT EXISTS uom VARCHAR(100),
  ADD COLUMN IF NOT EXISTS price NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS fitting_position VARCHAR(255),
  ADD COLUMN IF NOT EXISTS swirl_type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS domestic_exports VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cross_reference VARCHAR(255);

-- Table 2: department_master
CREATE TABLE IF NOT EXISTS sms_inventory.department_master (
  id               BIGSERIAL PRIMARY KEY,
  department_name  VARCHAR(255) NOT NULL UNIQUE,
  process_sequence NUMERIC(10, 2) NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.department_master (
  id               BIGSERIAL PRIMARY KEY,
  department_name  VARCHAR(255) NOT NULL UNIQUE,
  process_sequence NUMERIC(10, 2) NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sms_inventory.department_master (department_name, process_sequence) VALUES
  ('Gate', 0),
  ('LASER', 0.1),
  ('T/Room', 1),
  ('Store', 2),
  ('Sand', 3),
  ('Tambling', 4),
  ('Moulding', 5),
  ('Finishing', 6),
  ('CNC', 7),
  ('Burning', 8),
  ('Packing', 9),
  ('Rejection Store', 10)
ON CONFLICT (department_name) DO UPDATE SET process_sequence = EXCLUDED.process_sequence;

INSERT INTO public.department_master (department_name, process_sequence) VALUES
  ('Gate', 0),
  ('LASER', 0.1),
  ('T/Room', 1),
  ('Store', 2),
  ('Sand', 3),
  ('Tambling', 4),
  ('Moulding', 5),
  ('Finishing', 6),
  ('CNC', 7),
  ('Burning', 8),
  ('Packing', 9),
  ('Rejection Store', 10)
ON CONFLICT (department_name) DO UPDATE SET process_sequence = EXCLUDED.process_sequence;

-- Table 3: operation_master
CREATE TABLE IF NOT EXISTS sms_inventory.operation_master (
  id             BIGSERIAL PRIMARY KEY,
  operation_name VARCHAR(255) NOT NULL UNIQUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.operation_master (
  id             BIGSERIAL PRIMARY KEY,
  operation_name VARCHAR(255) NOT NULL UNIQUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sms_inventory.operation_master (operation_name) VALUES
  ('Material Transfer'),
  ('Internal Material Return'),
  ('Rejection Tfd to Burning'),
  ('Rejection tfd to Scrap Yard'),
  ('Recycle Material Issue'),
  ('Material Send for Job work'),
  ('Customer Rejection Receipt'),
  ('Customer Rejection Dismentle & SFG Recover'),
  ('FG Dismantling & SFG Recovery'),
  ('Rework'),
  ('BOM Moulding Receipt')
ON CONFLICT (operation_name) DO NOTHING;

INSERT INTO public.operation_master (operation_name) VALUES
  ('Material Transfer'),
  ('Internal Material Return'),
  ('Rejection Tfd to Burning'),
  ('Rejection tfd to Scrap Yard'),
  ('Recycle Material Issue'),
  ('Material Send for Job work'),
  ('Customer Rejection Receipt'),
  ('Customer Rejection Dismentle & SFG Recover'),
  ('FG Dismantling & SFG Recovery'),
  ('Rework'),
  ('BOM Moulding Receipt')
ON CONFLICT (operation_name) DO NOTHING;

-- Table 4: category_master
CREATE TABLE IF NOT EXISTS sms_inventory.category_master (
  id               BIGSERIAL PRIMARY KEY,
  category_name    VARCHAR(255) NOT NULL UNIQUE,
  bom_consumption VARCHAR(255) DEFAULT '',
  category_code    VARCHAR(100) DEFAULT '',
  short_code       VARCHAR(100) DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.category_master (
  id               BIGSERIAL PRIMARY KEY,
  category_name    VARCHAR(255) NOT NULL UNIQUE,
  bom_consumption VARCHAR(255) DEFAULT '',
  category_code    VARCHAR(100) DEFAULT '',
  short_code       VARCHAR(100) DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sms_inventory.category_master (category_name, bom_consumption, category_code, short_code) VALUES
  ('OUTER METAL SHELL',   '',                   'B01', 'OTSHL'),
  ('INNER METAL SHELL',   '',                   'B02', 'INSHL'),
  ('SPRING',              '',                   'B03', 'Spring'),
  ('MIDDLE METAL SHELL',  '',                   'B04', 'MDLSHL'),
  ('OUTER MOULDED',       'OUTER METAL SHELL', 'M01', 'OMLD'),
  ('INNER MOULDED',       'INNER METAL SHELL', 'M02', 'IMLD'),
  ('MIDDLE MOULDED',      'MIDDLE METAL SHELL', 'M04', 'OTHER'),
  ('FELT',                '',                   'B05', 'FELT'),
  ('PTFE',                '',                   'B06', 'PTFE'),
  ('TPU/PU',              '',                   'B07', 'TPU/PU'),
  ('Brass Washer',        '',                   'B08', 'Brass Washer'),
  ('Silver Washer',       '',                   'B09', 'Silver Washer'),
  ('Big Washer',          '',                   'B10', 'Big Washer'),
  ('Gasket',              '',                   'B11', 'Gasket'),
  ('O-Ring',              '',                   'B12', 'O-Ring'),
  ('O-RING-A',            '',                   '',    ''),
  ('O-RING-B',            '',                   '',    ''),
  ('O-RING-C',            '',                   '',    ''),
  ('O-RING-D',            '',                   '',    ''),
  ('FG',                  '',                   '',    '')
ON CONFLICT (category_name) DO UPDATE SET
  bom_consumption = EXCLUDED.bom_consumption,
  category_code   = EXCLUDED.category_code,
  short_code      = EXCLUDED.short_code;

CREATE TABLE IF NOT EXISTS stock_alert_rule (
  id               BIGSERIAL PRIMARY KEY,
  item_code        VARCHAR(100) NOT NULL,
  category_name    VARCHAR(255) NOT NULL,
  department_name  VARCHAR(255) NOT NULL,
  min_quantity     NUMERIC(15, 2),
  max_quantity     NUMERIC(15, 2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_code, category_name, department_name)
);

CREATE TABLE IF NOT EXISTS stock_alert (
  id                BIGSERIAL PRIMARY KEY,
  rule_id           BIGINT,
  item_code         VARCHAR(100) NOT NULL,
  category_name     VARCHAR(255) NOT NULL,
  department_name   VARCHAR(255) NOT NULL,
  kind              VARCHAR(32) NOT NULL,
  closing_balance   NUMERIC(15, 2) NOT NULL,
  threshold         NUMERIC(15, 2) NOT NULL,
  title             TEXT NOT NULL,
  message           TEXT NOT NULL,
  unread            BOOLEAN NOT NULL DEFAULT TRUE,
  resolved          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.category_master (category_name, bom_consumption, category_code, short_code) VALUES
  ('OUTER METAL SHELL',   '',                   'B01', 'OTSHL'),
  ('INNER METAL SHELL',   '',                   'B02', 'INSHL'),
  ('SPRING',              '',                   'B03', 'Spring'),
  ('MIDDLE METAL SHELL',  '',                   'B04', 'MDLSHL'),
  ('OUTER MOULDED',       'OUTER METAL SHELL', 'M01', 'OMLD'),
  ('INNER MOULDED',       'INNER METAL SHELL', 'M02', 'IMLD'),
  ('MIDDLE MOULDED',      'MIDDLE METAL SHELL', 'M04', 'OTHER'),
  ('FELT',                '',                   'B05', 'FELT'),
  ('PTFE',                '',                   'B06', 'PTFE'),
  ('TPU/PU',              '',                   'B07', 'TPU/PU'),
  ('Brass Washer',        '',                   'B08', 'Brass Washer'),
  ('Silver Washer',       '',                   'B09', 'Silver Washer'),
  ('Big Washer',          '',                   'B10', 'Big Washer'),
  ('Gasket',              '',                   'B11', 'Gasket'),
  ('O-Ring',              '',                   'B12', 'O-Ring'),
  ('O-RING-A',            '',                   '',    ''),
  ('O-RING-B',            '',                   '',    ''),
  ('O-RING-C',            '',                   '',    ''),
  ('O-RING-D',            '',                   '',    ''),
  ('FG',                  '',                   '',    '')
ON CONFLICT (category_name) DO UPDATE SET
  bom_consumption = EXCLUDED.bom_consumption,
  category_code   = EXCLUDED.category_code,
  short_code      = EXCLUDED.short_code;

CREATE TABLE IF NOT EXISTS stock_alert_rule (
  id               BIGSERIAL PRIMARY KEY,
  item_code        VARCHAR(100) NOT NULL,
  category_name    VARCHAR(255) NOT NULL,
  department_name  VARCHAR(255) NOT NULL,
  min_quantity     NUMERIC(15, 2),
  max_quantity     NUMERIC(15, 2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_code, category_name, department_name)
);

CREATE TABLE IF NOT EXISTS stock_alert (
  id                BIGSERIAL PRIMARY KEY,
  rule_id           BIGINT,
  item_code         VARCHAR(100) NOT NULL,
  category_name     VARCHAR(255) NOT NULL,
  department_name   VARCHAR(255) NOT NULL,
  kind              VARCHAR(32) NOT NULL,
  closing_balance   NUMERIC(15, 2) NOT NULL,
  threshold         NUMERIC(15, 2) NOT NULL,
  title             TEXT NOT NULL,
  message           TEXT NOT NULL,
  unread            BOOLEAN NOT NULL DEFAULT TRUE,
  resolved          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_alert_created_at_idx ON stock_alert (created_at DESC);
CREATE INDEX IF NOT EXISTS stock_alert_resolved_unread_idx ON stock_alert (resolved, unread);
CREATE INDEX IF NOT EXISTS stock_alert_item_code_idx ON stock_alert (item_code);
CREATE INDEX IF NOT EXISTS stock_alert_department_idx ON stock_alert (department_name);

-- =============================================================================
-- Moulding BOM Mapping (Moulded Item <-> Metal Shell Item relationship)
-- =============================================================================
CREATE TABLE IF NOT EXISTS moulding_bom_mapping (
  id                  BIGSERIAL PRIMARY KEY,
  moulded_item_id     BIGINT NOT NULL REFERENCES master(id) ON DELETE CASCADE,
  metal_shell_item_id BIGINT NOT NULL REFERENCES master(id) ON DELETE CASCADE,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uk_moulded_metal_shell UNIQUE (moulded_item_id, metal_shell_item_id)
);

CREATE INDEX IF NOT EXISTS moulding_bom_mapping_moulded_idx ON moulding_bom_mapping (moulded_item_id);

-- =============================================================================
-- FG BOM (Finished Goods Bill of Materials) Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS fg_bom (
  id                  BIGSERIAL PRIMARY KEY,
  sms_new_part_no     VARCHAR(100),
  old_code            VARCHAR(100) NOT NULL,
  description         TEXT,
  bom_count           INTEGER DEFAULT 0,
  outer_metal_shell   INTEGER DEFAULT 0,
  inner_metal_shell   INTEGER DEFAULT 0,
  spring              INTEGER DEFAULT 0,
  middle_metal_shell  INTEGER DEFAULT 0,
  outer_moulded       INTEGER DEFAULT 0,
  inner_moulded       INTEGER DEFAULT 0,
  middle_moulded      INTEGER DEFAULT 0,
  felt                INTEGER DEFAULT 0,
  ptfe                INTEGER DEFAULT 0,
  tpu_pu              INTEGER DEFAULT 0,
  brass_washer        INTEGER DEFAULT 0,
  nut                 INTEGER DEFAULT 0,
  plastic             INTEGER DEFAULT 0,
  tooted_disc         INTEGER DEFAULT 0,
  foam                INTEGER DEFAULT 0,
  gasket              INTEGER DEFAULT 0,
  o_ring              INTEGER DEFAULT 0,
  lock_washer         INTEGER DEFAULT 0,
  aluminium_washer    INTEGER DEFAULT 0,
  sfg                 INTEGER DEFAULT 0,
  big_shim_thin       INTEGER DEFAULT 0,
  small_shim_thin     INTEGER DEFAULT 0,
  big_shim_thick      INTEGER DEFAULT 0,
  small_shim_thick    INTEGER DEFAULT 0,
  split_pin           INTEGER DEFAULT 0,
  cotton_pin          INTEGER DEFAULT 0,
  silicon_rubber      INTEGER DEFAULT 0,
  o_ring_moulded      INTEGER DEFAULT 0,
  jali                INTEGER DEFAULT 0,
  CONSTRAINT uk_fg_bom_old_code UNIQUE (old_code)
);

CREATE INDEX IF NOT EXISTS idx_fg_bom_old_code ON fg_bom(old_code);
CREATE INDEX IF NOT EXISTS idx_fg_bom_sms_part ON fg_bom(sms_new_part_no);

-- Seed FG BOM data from Excel specification
INSERT INTO fg_bom (sms_new_part_no, old_code, description, bom_count, outer_metal_shell, inner_metal_shell, spring, middle_metal_shell, outer_moulded, inner_moulded, middle_moulded, felt, ptfe, tpu_pu, brass_washer, nut, plastic, tooted_disc, foam, gasket, o_ring, lock_washer, aluminium_washer, sfg, big_shim_thin, small_shim_thin, big_shim_thick, small_shim_thick, split_pin, cotton_pin, silicon_rubber, o_ring_moulded, jali) VALUES
  ('945-05758', '103', 'HUB OIL SEAL TATA 1210 REAR INNER METAL OD(135x160X13)', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05759', '104', 'Oil Seal-NBR (Size:95x125x13)', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05747', '105', '105X130X13', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05746', '106', '120x145x15', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05754', '110', '150x125x12', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05773', '111', '90X110x10- SINGLE LIP -1 90X110x10- DOUBLE LIP -1 RUBBER RING -1', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05763', '113', 'Pinion Oil Seal TATA 2515, 1312 (TRIPLE LIP) (90x68x13) 68x90x13', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('945-05681', '118', '65x90x15', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05692', '123', '36x54X7', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05698', '191', '945-05745-101-95x130x13-Qty2 945-05744-102-110x140x13-Qty2 WASHER Qty2 GASKET Qty2 BIG SHIMS THIN Qty4 SMALL SHIMS THIN Qty2 BIG SHIMS THICK Qty4 SMALL SHIMS THICK Qty2', 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 101, 4, 2, 4, 2, 0, 0, 0, 0, 0),
  ('945-05695', '192', '945-05747-105-105x130x13-Qty2 945-05746-106-120x145x15-Qty-2 GASKET-Qty2 COTTER PIN-Qty2 WASHER-Qty2 BIG SHIMS THIN-Qty4 SMALL SHIMS THIN-Qty2 BIG SHIMS THICK-Qty4 SMALL SHIMS THICK-Qty2', 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 105, 4, 4, 2, 2, 2, 0, 0, 0, 0),
  ('945-05708', '193', '945-05747-105-105x130x13-Qty2 945-05720-109A-135x170x15-Qty4 945-05721-110A-125x150x12-Qty4 GASKET Qty4 COTTER PIN Qty2 BIG SHIMS THIN Qty4 SMALL SHIMS THIN Qty2 BIG SHIMS THICK Qty4 SMALL SHIMS THICK Qty2', 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 105, 4, 2, 4, 2, 0, 4, 0, 0, 0),
  ('585-05821', '195', '985-05903-202-75x100x10/11-Qty2 985-05835-203-75x95x13-Qty2 985-05909-204-70x90x7-Qty2 GASKET Qty2 WASHER Qty2', 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 203, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('585-05823', '196', '945-05759-104-95x125x13-Qty2 985-05903-202-75x100x10/11-Qty2 985-05912-218-95x125x10-Qty2 GASKET Qty2 WASHER Qty2', 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 202, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-05903', '202', 'OIL SEAL-NBR (Size:75x100x10)', 3, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-05835', '203', '95x75x13', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-05911', '205', 'OIL SEAL-NBR (Size:80-100-10)', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-05912', '218', 'OIL SEAL-NBR (Size:95x125x10)', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05564', '250', '130x162x14', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05486', '251', 'Oil Seal-NBR (Size:130.18x161.93x14.27)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05568', '252', 'Oil Seal-NBR (Size:88.9x130.18x12.7)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05573', '256', '158.75x182.58x15.88', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05582', '257', 'Oil Seal-NBR (Size:158.75x182.58x15.88)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05560', '258', 'Oil Seal-NBR (Size:152.4x171.45x12.7)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05360', '276', '100x120x13/18', 5, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05445', '282', '60X74X10', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05585', '310', 'HUB OIL SEAL REAR INNER 170x202x24', 5, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05381', '311', 'Oil Seal-NBR (Size:25x35x7/10)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05460', '313', 'Oil Seal-NBR (Size:52x68x8)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05383', '314', '105x125x12/16', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05613', '316', 'PINION OIL SEAL KIT RS160 (WITH NUT) 85.5x150x18.5', 7, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05588', '334', '47.62x38.1x4.76', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05399', '336', '60x74x10', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05530', '351', '123X90X24', 5, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05538', '352', 'Oil Seal-NBR (Size:63.5x115.2x10.7)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05529', '353', 'Oil Seal-NBR (Size:100x130x12/14 MRC)', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-05834', '381', 'OIL SEAL-NBR (Size:95-125-13)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-05844', '382', 'OIL SEAL-NBR (Size:85x110x12)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-01848', '444', '75X121X15 MR', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('995-03942', '504', 'OIL SEAL', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05645', '521', 'Oil Seal-NBR (Size:100x125x12)', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05652', '522', 'Oil Seal-NBR (Size:101x131x12 / 16)', 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05648', '523', 'Oil Seal-NBR (Size:125x150x14)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05649', '524', '125x150x13', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-12067', '525', '100X120X13', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05653', '526', '112x87.8x5/7.4', 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05643', '527', 'Oil Seal-NBR (Size:143x113x12 / 16)', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0),
  ('945-05644', '528', '130.6x97.6x5/8.8', 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05812', '531', '152.60x117.20x27', 5, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05813', '532', '125x160x12', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05663', '541', '153.60X108X17', 5, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-12051', '545', '60X82X7', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-06060', '602', '76X54X11.50', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('985-06057', '641', 'OIL SEAL-NBR (Size:40x62x10.5)', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-06058', '642', 'OIL SEAL-REAR HUB OUTER-(Size:72x55x9.5)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-06168', '651', '48x61x8', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('985-06174', '652', 'OIL SEAL-NBR (Size:48x65x10)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-06176', '653', 'OIL SEAL-NBR (Size:42x62x12)', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-06194', '665', '49x35x8', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-06084', '735', '40x55x7', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-06085', '736', 'Hub Oil Seal M&M Maximo Rear Outer(Size:60x32x10)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('555-07872', '776', '55x80x10', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('555-07855', '798', '45x65x18.5', 5, 1, 1, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06353', '1018', 'HUB OIL SEAL REAR (METAL OUTER)-140x110x13', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06356', '1019', 'HUB OIL SEAL REAR (METAL OUTER)-145x120x15', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06361', '1025', 'Oil Seals-NBR (Size:55x80x10)', 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06363', '1048', 'HUB OIL SEAL FRONT WHEEL-75x50x10', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('965-06347', '1170', '56x80x13.5/14.5', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06379', '1208', 'Oil Seals-NBR (Size:44.45x73.76x12.7)', 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06327', '1209', 'Oil Seals-NBR (Size:56x80x11.5)', 4, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06323', '1218', 'Oil Seals- (Size:70x105x15)', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06330', '1236', 'Oil Seals-NBR (Size:80x108.6x15.6)', 7, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06420', '1238', '62x45x10', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06387', '1239', '62x45x9', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06427', '1267', 'Oil Seals-NBR (Size:60x80x10)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06430', '1301', 'Oil Seals-NBR (Size:47.62x69.85x9.53)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06434', '1302', '68.25x39.67 x9.53', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06338', '1304', 'Oil Seals-NBR (Size:50X80X10.5)', 4, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06340', '1307', '85x57.15x11/12', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06341', '1308', '72.2x 45x11', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06435', '1315', 'Oil Seals-NBR (Size:69.85x92.02x14.27)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-07017', '1324', '44.45x68.17x16/19.43', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06437', '1328', 'Oil Seals-NBR (Size:53.98x73.03x12.7)', 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06402', '1333', '100x80x12', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06300', '1352', 'SEAL PTO SHAFT-68x36x12', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06310', '1353', 'AXLE SEAL CASSETTE- (Size : 127-160-15.5/16)', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('965-06326', '1354', 'CASSETTE SEAL AXLE-180x150x14.5/16.5', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06333', '1356', 'Oil Seals-NBR (Size:84X130X17.5)', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06335', '1357', 'Oil Seals-NBR (Size:48X75X14/17)', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06336', '1358', 'Oil Seals-NBR (Size:53.2x78x11/13.5)', 5, 2, 2, 2, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06337', '1359', 'Oil Seals-NBR (Size:45x70x14/17)', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05507', '1379', '130x100x14.75', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05398', '1407', 'Oil Seal-NBR (Size:48x65x 10)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06318', '2164', '130x160x14.5/16.5', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01855', '21124', '35x44x16', 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00902', '30001', '145x175x13', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00885', '30002', '145x175x14', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('599-00011', '30003', '999-00902-30001-145x175x13-Qty1 999-00885-30002-145x175x14-Qty1 999-08235-40043-255X5-Qty1 LOCK WASHER : 88.5X122.5 Qty1 ALUMINIUM WASHER : 45x52x2 Qty1 BRASS WASHER : 24x29x2 Qty1', 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 30001, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00892', '30006', '145x175/205x9/14', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00904', '30009', '95x115x13', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00872', '30012', '115x140x13', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01937', '30013', '25x35x7', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00911', '30014', '52x68x8', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01080', '30015', '56x77x8', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('968-03798', '30023', '100x130x12', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00932', '30028', '42x56x7', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00213', '30031', 'OIL SEAL-ACM (Size:55x75x8/9.2)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00917', '30032', '65x90x13', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00737', '30036', '85x145x12/37', 5, 1, 1, 2, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01387', '30037', '125x152.4x15', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00883', '30040', '85x105x13', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01180', '30049', '145x175x8', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00901', '30051', '145x175x15', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00760', '30055', '30055-160x180x10 With Helix', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00933', '30057', '120x140x13', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00870', '30059', '85x155x12/33', 5, 1, 1, 2, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00899', '30060', '86x100x14', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01181', '30062', '145x175x15', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00918', '30068', 'OIL SEAL-NBR (Size:100x130x13)', 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00903', '30070', '145x175x16', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00859', '30075', '70x100x16/12.5', 7, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00718', '30076', '85x110x12/17', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00867', '30077', '78x104x11', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00935', '30078', '120x150x15', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00873', '30080', '145x175x17/21', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01987', '30082', '105x130x9.5/12', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00888', '30084', '95x115x15.5', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00920', '30086', '75x95x10', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00894', '30088', '100x130x14', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00865', '30093', '75X95X8/9.2', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00779', '30099', '72x105x19', 5, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01520', '30104', '125x148.6/156.4x8.1/9.3', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-02023', '30105', '110x140x11/19 HALF RUBBER', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('998-01446', '30107', '80x110.05x12', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-02002', '30110', '180x205x15', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01900', '30113', '57.5x90/99x13', 4, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-02008', '30119', '80x150x12/20', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-02047', '30128', '168x190.5x30/31.6', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01990', '30136', '90x145x10', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-02006', '30137', '90x151x10/5', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01993', '30138', '110x140x12/21', 2, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-00587', '30139', 'OIL SEAL-FKM (Size:132x172x12.5/14.5)', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1),
  ('999-01884', '30140', '32x40x8', 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01997', '30143', '136x159x13', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('969-02853', '30144', '130x150x13', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-02007', '30147', '80x130.2x12/20', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01882', '30150', '90X151X11/18', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00443', '30152', '105x125x12', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-02009', '30154', '50x65x8', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('969-03301', '30158', '100x120x12', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-02011', '30165', '64.9x90x10/9.5', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-0568', '30212', '55X70X8', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00537', '30214', '135x175x18', 6, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00600', '30215', 'OIL SEAL-NBR (Size:145x175/205x9/14)', 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00687', '30218', '85X150X16.3', 6, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00599', '30219', '132x160x10', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00538', '30220', '139x170x11', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('968-03849', '30221', '65x90x10', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00440', '30226', '105x130x12', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00601', '30228', 'OIL SEAL-FKM+NBR (Size:85x145x12/37)', 6, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00632', '30234', '85x130x10/21', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00576', '30236', '130x100x12', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00580', '30240', '110x130x13', 3, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00535', '30241', '139x175/205x16.3', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00553', '30245', '25x40x15', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00540', '30252', '60x90x8', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00597', '30256', '115x140x12/17', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00602', '30257', '80x135/154x12/18', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00606', '30263', '100x125x13', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01787', '30301', '110x140x15', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00261', '30302', '125x160x15', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01725', '30303', '85x105x13/18 MM', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01759', '30306', '125x150x14', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01766', '30308', '75x100x14', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01798', '30309', 'OIL SEAL-FKM (Size:80x100x12)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01729', '30310', '145x175x13', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('998-01397', '30311', '145x170x15/20', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01741', '30314', '140x170x15', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01703', '30316', '120.65x152.4x22.25', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01739', '30318', '120x140x12', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00539', '30319', '132X172X12', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01706', '30320', '158x188x16', 5, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01708', '30321', '85x153x13/18', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01698', '30322', '155x185x13', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01717', '30323', '145x185x13', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01839', '30325', '80x100x13', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01724', '30326', '135x153x13', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01751', '30328', '44.5x60x7', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01780', '30331', '50x70x9/8', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01722', '30336', '80x100x10', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01764', '30337', '55x75x9', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01721', '30338', '25x35x7', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00131', '30406', '125x160/190x18/20', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00107', '30407', '134x161x16', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00129', '30408', '154x180x12', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00120', '30409', '100x124x12', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00115', '30410', '130x155x12.5/16', 6, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00106', '30411', '166x191x16', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00121', '30412', '100x140/166x16/22', 4, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01045', '30421', '87x182x26', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00124', '30424', '85x140x13', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00161', '30451', '88x123x15', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00335', '30455', '180x200x12', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00288', '30456', '95x130x16', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00214', '30458', '90x120x11', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00286', '30459', '80x100x12', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00221', '30461', '190x160x13', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00321', '30463', '128x144/152.3x11/26', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00308', '30464', '66x92x19', 6, 1, 1, 2, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00301', '30466', '180x200x17', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-02359', '30469', 'Oil Seal-FKM (Size:70x90x10)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01449', '30506', '150x180x15', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01476', '30507', '120X160X15/16', 3, 2, 0, 2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00002', '30508', '28x42x7', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00007', '30509', '68x102x9.5/15', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01551', '30514', '153x171.3x13', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01500', '30517', '95x120x13', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01860', '30519', 'OIL SEAL-PTFE+ACM (Size:180x205x15)', 6, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-03998', '30651', '', 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('998-04234', '30701', '114.3x146.2x24.3', 5, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('998-04553', '30702', '121x160.4x28.5', 6, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('998-11527', '30703', '152.4x171.6x11.1', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01473', '30704', '82.5x101.6x12', 4, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('998-04645', '30706', '107.9x158.9x30.1', 6, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01060', '31005', '138X163X12', 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-11532', '31011', '77X141X11.5/27.5', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00098', '35007', 'Valve Stem: � 9 mm Inner Diameter: 15 mm Outer Diameter: 17.5 mm Height: 13.5mm Material: FPM (fluoride rubber)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00096', '35008', '12.8x16.2', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00095', '35009', 'Valve Stem: � 10 mm Inner Diameter: 12.8 mm Outer Diameter: 16.2 mm Height: 9.5mm Material: FPM (fluoride rubber)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00130', '35011', '85x110x12/16', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00962', '35017', 'Valve Stem: � 12 mm Inner Diameter: 16 mm Outer Diameter: 20 mm Height: 15 mm Material: FPM (fluoride rubber)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00980', '35018', 'Valve Stem: � 9 mm Inner Diameter: 12 mm Outer Diameter: 15.4 mm Height: �11mm Material: FPM (fluoride rubber', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00960', '35019', 'Valve Stem: � 9 mm Inner Diameter: 13.4 mm Outer Diameter: 16.1 mm Height: 15.2mm Material: FPM (fluoride rubber)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00954', '35020', 'Valve Stem: � 8 mm Inner Diameter: 11.6 mm Outer Diameter: 14.8 mm Height: 10.9 mm Material: FPM (fluoride rubber)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01474', '35024', '17X10/14.4X18', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01597', '35026', 'Valve Stem: �10 mm Inner Diameter: 13 mm Outer Diameter: 17.5 mm Height: 10.8mm Material: FPM (fluoride rubber)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01488', '35027', 'Valve Stem: �9 mm Inner Diameter: 12.9 mm Outer Diameter: 16 mm Height: 11.3mm Material: FPM (fluoride rubber)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00956', '35031', 'Valve Stem: � 8 mm Inner Diameter: 12 mm Outer Diameter: 15.4 mm Height: 9.5mm Material: FPM (fluoride rubber)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01893', '35040', '94x145x10', 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01115', '36001', '97.5x157x23', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01025', '36002', '117.5x158x17.8', 6, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01700', '38007', '53x75x7/9', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00975', '38801', '125x150x15/13', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('998-02757', '39501', '15.8x8.5x9', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('998-02758', '39502', 'OIL SEAL- PTFE(Size:154x186x11/20)', 4, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('998-02759', '39503', 'OIL SEAL- PTFE(Size:154x186x11/21', 4, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00574', '39904', 'Valve Stem: � 10 mm Inner Diameter: 13.6 mm Outer Diameter: 18 mm Height: 10 mm Material: FPM (fluoride rubber)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00964', '39906', '?uantity required: 6 Fitting Position: Intake Side Valve Stem: � 9 mm Inner Diameter: 14.6 mm Outer Diameter: 19 mm Height: 15 mm Material: FPM (fluoride rubber) / ?uantity required: 6 Fitting Position: Exhaust Side Valve Stem: � 10 mm Inner Diameter: 14.6 mm Outer Diameter: 19 mm Height: 15 mm Material: FPM (fluoride rubber)''', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('899-01410', '40002', 'ID-144.39, H-6-Qty2 ID-145.5, W-4.5, T-0.15-Qty1', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-00836', '40003', 'O-RING KIT-FKM FKM (Size:Id - 145.17,Height - 3.7 (Qty-2) Id - 140.95,Height - 1.9 (Qty-2))', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0),
  ('899-01419', '40004', '40004-ID-149.59, D-4.80, H-7-Qty2 40004A-ID-153.05, OD-162.70, T-0.17-Qty1', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0),
  ('899-00837', '40021', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-00838', '40022', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-01415', '40023', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-01418', '40024', 'ID 11, T3.0', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-00957', '40036', 'ID: 153, OD: 163, W: 0.15 (METAL SHIM)', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('899-01128', '40037', 'O-RING-FKM (Size:20.9x26.9x3)', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-00991', '40038', 'O-RING KIT-Copper (Size:7x14.9x17.4)', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-08235', '40043', 'ID 255 T5', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-02071', '40054', '40054A-ID-141, H-2.4-Qty1 40054B-ID-143, H-5.8-Qty2 40054C-ID-143, H-5.8-Qty1', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0),
  ('899-02067', '40056', '899-02782-899-02782-ID-35, H-2.4-Qty1 899-02782-899-02850-ID-35, H-1.6-Qty1 899-02782-899-02898-ID-34, H-3-Qty1 899-02782-899-02935-ID-31, H-2.4-Qty1', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0),
  ('999-02024', '40059', '98X112.4X7', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-00567', '40112', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-00585', '40115', 'ID 147.4, OD 153.8, T 0.5 (METAL SHIM)', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-00590', '40116', '40102B-ID-144.20, H-4-Qty2 40116A-ID-137.2, H-4.6-Qty1', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0),
  ('899-01694', '40151', 'O-RING KIT-HNBR FKM (Size:Id - 148, Height - 4 (Qty- 1) Id - 143, Height - 2.5 (Qty- 1))', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-01417', '40152', '40152A-ID- 129.50, OD- 137, HEIGHT-4(QTY-2) 40152B-ID - 124, OD- 129 HEIGHT- 10.80 (QTY-1)', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-01692', '40153', 'Id- 139.50, Od-147.50, Height - 4 (Qty-2) Id- 136 Od- 141.20 Height- 10.8(Qty-1)', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-01846', '40154', 'ID - 3.35, OD- 142.50, HEIGHT- 149.20(QTY-1) ID- 4, OD- 148.50, HEIGHT- 156.50(QTY-1)', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-01702', '40157', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-01720', '40158', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-01704', '40159', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-01801', '40160', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-01769', '40161', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-01738', '40164', 'O-RING KIT-FKM (Size:ID - 32 ID - 25 ID - 34)', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-00097', '40251', 'O-RING KIT-HNBR FKM (Size:Id - 146, Height - 5 (Qty- 2) Id - 146, Height - 5 (Qty- 1))', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-00569', '40301', 'O-RING KIT-FKM (Size:139.4x147.3x3.95)', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-01861', '40304', '40304A-ID - 132,HEIGHT - 2.4 (QTY-1) 40304B-NBR-ID - 128.5,HEIGHT - 5 (QTY-1) 40304C-FKM-ID - 128.5,HEIGHT - 5 (QTY-1)', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-11824', '40401', 'ID - 111.25,T: 2.65, HEIGHT 4- (QTY-1)', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('899-12037', '40451', '40451A-ID - 117.42,HEIGHT 3.5- (QTY-1) 40451B-ID - 117.62,HEIGHT 7.5 - (QTY-1)', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('945-05719', '107A', 'Oil Seal-NBR (Size:110x128x9)', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05720', '109A', '170X135X15', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05734', '109F', 'Oil Seal-NBR (Size:165x192x10)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05740', '109G', '140X114X10/12', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05750', '109R', '170X135X15_R', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05721', '110A', '125x150x12', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-03700', '110AB', '125x150x12', 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('945-05754', '110R', '125x150x12 R', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05617', '115B', '95.3x76.3x14.5', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05688', '122B', '80x58x13', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05668', '190C', '190X165X12', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-05913', '218A', '125X95X12', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-05914', '218B', '95X80X7', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-05919', '218C', 'OIL SEAL-NBR (Size:110x133x13)', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05760', '218D', 'Oil Seal-NBR (Size:100x125x12)', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05583', '256A', 'Oil Seal-NBR (Size:125x140x10)', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('979-06197', '30045A', '90x110x11', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01899', '30101A', '125x148.3x8.1/9.3', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01892', '30101B', '124.8x148.2x8.5/9.7', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01984', '30126A', '140x164x15.5/18', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01981', '30136A', '90x145x15', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00808', '30331N', '50x70x8', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05610', '316B', 'PINION OIL SEAL 85.5x150x18.5', 6, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-05854', '404', '182.58x158.75x12.7', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('998-01802', '50103S', '121x160x28', 3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('998-08168', '50113N', '117.6x152.4x25.4', 5, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('555-07851', '555-07851', '80X46X16.5', 5, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('985-12061', '641A', '62x40x10.5 R', 3, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-12075', '642A', '79.4X63X8', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-06181', '651A', '48X68X8', 3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('985-06182', '652A', '48x70x10', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('935-02842', '7107', '35x47x7', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('935-02542', '7177', '35x50x8/13', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('935-02487', '7183', '15x24x5', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('935-02491', '7211', '28x48x10', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('935-02492', '7212', '35x47x8', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('935-02506', '7214', '33x55x5', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('935-02778', '7230', '20x47x8', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('795-12021', '795-12021', '85.75X90X6.9', 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('799-00839', '799-00839', '139X175X18', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('799-11818', '799-11818', '176x196x16', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-05933', '801', '62X48X11/21', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-05934', '802', '72X40X6.8', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('985-05936', '802A', '50x72x10', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01132', '9001-0860', '28X40X8', 4, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('899-08309', '9001-3173', 'ID-134.45,T-3.8(QTY-2)', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0),
  ('925-00943', '925-00943', '17x29x5', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('925-00952', '925-00952', '41x53.1x8', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('925-02026', '925-02026', '37x49.1x7', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('935-02481', '935-02481', '33x50x6.5/10', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('935-15113', '935-15113', '20x62x6.58', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('935-15114', '935-15114', '33x50x6', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('935-15115', '935-15115', '24x47x7', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('935-15116', '935-15116', '41x60x7', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('935-15117', '935-15117', '24x38x6', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('935-15118', '935-15118', '24x47x7', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('945-05664', '945-05664', '', 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('959-04075', '959-04075', '160X127X15.5/17.5', 4, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('965-00136', '965-00136', '46x70x13/23.5', 3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('965-00829', '965-00829', '60x84x8.5/17', 3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('965-01626', '965-01626', '50x72x10/17', 3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('965-01827', '965-01827', '45x75x14/16', 3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('965-02943', '965-02943', '92x112x16', 3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('965-03086', '965-03086', '170x200x15/16', 4, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('965-11534', '965-11534', '35.75x68.44x26.42', 4, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('968-03749', '968-03749', '65X45X18.5', 5, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('968-03784', '968-03784', '140x165x15', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('969-03318', '969-03318', '50x62x5/7', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('975-15120', '975-15120', '35x55x10', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('975-15121', '975-15121', '50x64x8', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('975-15123', '975-15123', '48x62x8', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('975-15124', '975-15124', '54x76x11/17', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('979-05276', '979-05276', '48x65x10', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('979-05921', '979-05921', '55x80x8', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('979-06574', '979-06574', '75x95x10.5', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('985-05935', '985-05935', '64X50X8', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('985-06088', '985-06088', '39.42x80x6.45/13.5', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-03086', '995-03086', '170x200x14.5/16', 5, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-06349', '995-06349', '140X170X14/16', 4, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('995-08221', '995-08221', 'OIL SEAL TIMING CASE FRONT COVER FKM-57x76x9/11', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('995-08222', '995-08222', 'ASSY CRANKSHAFT REAR END OILSEAL (INTEGRATED) RUBBER FKM-133.30X 158.70/206X10.50/13', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('995-08223', '995-08223', 'Cramkshaft Rear End PTFE INTEGRATED/Cassette type oil seal -133X158.70/206X17/23', 3, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('995-08300', '995-08300', 'Oil Seals- New Holland (Size 30x42x14)', 6, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-08301', '995-08301', '30x44x14', 7, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-08302', '995-08302', '47x65x16.5', 6, 1, 1, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-08303', '995-08303', 'Shaft Seal -(Size 47X65X19)', 6, 1, 1, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('995-08304', '995-08304', '45x60x16/17', 6, 1, 1, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('995-08305', '995-08305', '32x50x14', 6, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('995-08306', '995-08306', 'Combi Seal (Size :30X42X14)', 6, 1, 1, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('996-02505', '996-02505', '48x65x7', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('998-01470', '998-01470', '110x145x10/12', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-00278', '999-00278', '85x110x9/13', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-00279', '999-00279', '65x90x13/14.5', 4, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-00290', '999-00290', '65x100x14', 4, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-00342', '999-00342', '78x100x10', 3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-00491', '999-00491', '25x35x7/10', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-00742', '999-00742', '85x150/169x12/31.5', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-00813', '999-00813', '84x87x4', 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-00959', '999-00959', '163x138x12', 5, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01054', '999-01054', 'OIL SEAL ACTORS-120X150X14.3/20', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-01110', '999-01110', 'Seal Ring-21.2x29.6x6', 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-01131', '999-01131', '68x90x10', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-01164', '999-01164', '117.5x158x12.5', 3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-01168', '999-01168', '120x150x15/20.8 (Half Rubber)', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-01598', '999-01598', '85x130x17/27', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-01687', '999-01687', '160x180x15', 3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-01718', '999-01718', '142x170x15/16', 4, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-01857', '999-01857', '14.2X8/10.8X9', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-01897', '999-01897', '120x150x15', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-02357', '999-02357', '85X105X13 Single lip', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('999-02389', '999-02389', '95x115x13/12', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-03237', '999-03237', '116x151x11', 4, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-03634', '999-03634', '25x38/49x10.5/15', 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-04319', '999-04319', 'ID-216 mm Thickness-2.50', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0),
  ('999-12022', '999-12022', '111.12X152.4X12.7', 3, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
ON CONFLICT (old_code) DO UPDATE SET
  sms_new_part_no = EXCLUDED.sms_new_part_no,
  description = EXCLUDED.description,
  bom_count = EXCLUDED.bom_count,
  outer_metal_shell = EXCLUDED.outer_metal_shell,
  inner_metal_shell = EXCLUDED.inner_metal_shell,
  spring = EXCLUDED.spring,
  middle_metal_shell = EXCLUDED.middle_metal_shell,
  outer_moulded = EXCLUDED.outer_moulded,
  inner_moulded = EXCLUDED.inner_moulded,
  middle_moulded = EXCLUDED.middle_moulded,
  felt = EXCLUDED.felt,
  ptfe = EXCLUDED.ptfe,
  tpu_pu = EXCLUDED.tpu_pu,
  brass_washer = EXCLUDED.brass_washer,
  nut = EXCLUDED.nut,
  plastic = EXCLUDED.plastic,
  tooted_disc = EXCLUDED.tooted_disc,
  foam = EXCLUDED.foam,
  gasket = EXCLUDED.gasket,
  o_ring = EXCLUDED.o_ring,
  lock_washer = EXCLUDED.lock_washer,
  aluminium_washer = EXCLUDED.aluminium_washer,
  sfg = EXCLUDED.sfg,
  big_shim_thin = EXCLUDED.big_shim_thin,
  small_shim_thin = EXCLUDED.small_shim_thin,
  big_shim_thick = EXCLUDED.big_shim_thick,
  small_shim_thick = EXCLUDED.small_shim_thick,
  split_pin = EXCLUDED.split_pin,
  cotton_pin = EXCLUDED.cotton_pin,
  silicon_rubber = EXCLUDED.silicon_rubber,
  o_ring_moulded = EXCLUDED.o_ring_moulded,
  jali = EXCLUDED.jali;

-- Add FG BOM Transfer Receipt operation type
INSERT INTO sms_inventory.operation_master (operation_name) VALUES ('BOM FG Transfer Receipt') ON CONFLICT (operation_name) DO NOTHING;
INSERT INTO public.operation_master (operation_name) VALUES ('BOM FG Transfer Receipt') ON CONFLICT (operation_name) DO NOTHING;
INSERT INTO transaction_type (type) VALUES ('BOM FG Transfer Receipt') ON CONFLICT (type) DO NOTHING;
