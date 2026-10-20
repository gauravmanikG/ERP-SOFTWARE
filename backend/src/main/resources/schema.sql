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
  ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50),
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
  ADD COLUMN IF NOT EXISTS cross_reference VARCHAR(255),
  ADD COLUMN IF NOT EXISTS drawing_image TEXT,
  ADD COLUMN IF NOT EXISTS safety_lead_time NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS procurement_lead_time NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS total_lead_time NUMERIC(10,2);

ALTER TABLE sms_inventory.item_master
  ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50),
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
  ADD COLUMN IF NOT EXISTS cross_reference VARCHAR(255),
  ADD COLUMN IF NOT EXISTS drawing_image TEXT,
  ADD COLUMN IF NOT EXISTS safety_lead_time NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS procurement_lead_time NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS total_lead_time NUMERIC(10,2);

-- Table 2: department_master
CREATE TABLE IF NOT EXISTS sms_inventory.department_master (
  id               BIGSERIAL PRIMARY KEY,
  dept_code        VARCHAR(50),
  dept_number      INT,
  department_name  VARCHAR(255) NOT NULL UNIQUE,
  process_sequence NUMERIC(10, 2) NOT NULL,
  category         VARCHAR(100),
  status           VARCHAR(50) DEFAULT 'ACTIVE',
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.department_master (
  id               BIGSERIAL PRIMARY KEY,
  dept_code        VARCHAR(50),
  dept_number      INT,
  department_name  VARCHAR(255) NOT NULL UNIQUE,
  process_sequence NUMERIC(10, 2) NOT NULL,
  category         VARCHAR(100),
  status           VARCHAR(50) DEFAULT 'ACTIVE',
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.department_master ADD COLUMN IF NOT EXISTS dept_code VARCHAR(50);
ALTER TABLE public.department_master ADD COLUMN IF NOT EXISTS dept_number INT;
ALTER TABLE public.department_master ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE public.department_master ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
ALTER TABLE public.department_master ADD COLUMN IF NOT EXISTS notes TEXT;

-- Remove 'Gaurav' department and its references from everywhere
DELETE FROM inventory_transaction WHERE from_department_id IN (SELECT id FROM department WHERE LOWER(name) = 'gaurav') OR to_department_id IN (SELECT id FROM department WHERE LOWER(name) = 'gaurav');
DELETE FROM department WHERE LOWER(name) = 'gaurav';
DELETE FROM public.department_master WHERE LOWER(department_name) = 'gaurav';
DELETE FROM opening_balance WHERE LOWER(department_name) = 'gaurav';

INSERT INTO department (name) VALUES
  ('Store'),
  ('Power Press Die Making'),
  ('Power Press Rubber Die Making'),
  ('Power Press Circle Cutting'),
  ('LASER'),
  ('CNC'),
  ('Moulding'),
  ('Finishing'),
  ('Tambling'),
  ('Sand'),
  ('Burning'),
  ('T/Room'),
  ('Packing'),
  ('FG STORE'),
  ('Dispatch'),
  ('Rejection Store'),
  ('Rework-Burning'),
  ('Gate')
ON CONFLICT (name) DO NOTHING;

INSERT INTO sms_inventory.department_master (dept_code, dept_number, department_name, process_sequence, category, status) VALUES
  ('DPT-001', 1, 'Store', 1.0, 'Material Store', 'ACTIVE'),
  ('DPT-002', 2, 'Power Press Die Making', 2.0, 'Process', 'ACTIVE'),
  ('DPT-003', 3, 'Power Press Rubber Die Making', 3.0, 'Process', 'ACTIVE'),
  ('DPT-004', 4, 'Power Press Circle Cutting', 4.0, 'Process', 'ACTIVE'),
  ('DPT-005', 5, 'LASER', 5.0, 'Process', 'ACTIVE'),
  ('DPT-006', 6, 'CNC', 6.0, 'Process', 'ACTIVE'),
  ('DPT-007', 7, 'Moulding', 7.0, 'Process', 'ACTIVE'),
  ('DPT-008', 8, 'Finishing', 8.0, 'Process', 'ACTIVE'),
  ('DPT-009', 9, 'Tambling', 9.0, 'Process', 'ACTIVE'),
  ('DPT-010', 10, 'Sand', 10.0, 'Process', 'ACTIVE'),
  ('DPT-011', 11, 'Burning', 11.0, 'Process', 'ACTIVE'),
  ('DPT-012', 12, 'T/Room', 12.0, 'Process', 'ACTIVE'),
  ('DPT-013', 13, 'Packing', 13.0, 'Process', 'ACTIVE'),
  ('DPT-014', 14, 'FG STORE', 14.0, 'Finished Goods Store', 'ACTIVE'),
  ('DPT-015', 15, 'Dispatch', 15.0, 'Outward', 'ACTIVE'),
  ('DPT-016', 16, 'Rejection Store', 16.0, 'Rejection', 'ACTIVE'),
  ('DPT-017', 17, 'Rework-Burning', 17.0, 'Rework', 'ACTIVE'),
  ('DPT-018', 18, 'Gate', 18.0, 'Movement/Control', 'ACTIVE')
ON CONFLICT (department_name) DO UPDATE SET 
  dept_code = EXCLUDED.dept_code,
  dept_number = EXCLUDED.dept_number,
  process_sequence = EXCLUDED.process_sequence,
  category = EXCLUDED.category,
  status = EXCLUDED.status;

INSERT INTO public.department_master (dept_code, dept_number, department_name, process_sequence, category, status) VALUES
  ('DPT-001', 1, 'Store', 1.0, 'Material Store', 'ACTIVE'),
  ('DPT-002', 2, 'Power Press Die Making', 2.0, 'Process', 'ACTIVE'),
  ('DPT-003', 3, 'Power Press Rubber Die Making', 3.0, 'Process', 'ACTIVE'),
  ('DPT-004', 4, 'Power Press Circle Cutting', 4.0, 'Process', 'ACTIVE'),
  ('DPT-005', 5, 'LASER', 5.0, 'Process', 'ACTIVE'),
  ('DPT-006', 6, 'CNC', 6.0, 'Process', 'ACTIVE'),
  ('DPT-007', 7, 'Moulding', 7.0, 'Process', 'ACTIVE'),
  ('DPT-008', 8, 'Finishing', 8.0, 'Process', 'ACTIVE'),
  ('DPT-009', 9, 'Tambling', 9.0, 'Process', 'ACTIVE'),
  ('DPT-010', 10, 'Sand', 10.0, 'Process', 'ACTIVE'),
  ('DPT-011', 11, 'Burning', 11.0, 'Process', 'ACTIVE'),
  ('DPT-012', 12, 'T/Room', 12.0, 'Process', 'ACTIVE'),
  ('DPT-013', 13, 'Packing', 13.0, 'Process', 'ACTIVE'),
  ('DPT-014', 14, 'FG STORE', 14.0, 'Finished Goods Store', 'ACTIVE'),
  ('DPT-015', 15, 'Dispatch', 15.0, 'Outward', 'ACTIVE'),
  ('DPT-016', 16, 'Rejection Store', 16.0, 'Rejection', 'ACTIVE'),
  ('DPT-017', 17, 'Rework-Burning', 17.0, 'Rework', 'ACTIVE'),
  ('DPT-018', 18, 'Gate', 18.0, 'Movement/Control', 'ACTIVE')
ON CONFLICT (department_name) DO UPDATE SET 
  dept_code = EXCLUDED.dept_code,
  dept_number = EXCLUDED.dept_number,
  process_sequence = EXCLUDED.process_sequence,
  category = EXCLUDED.category,
  status = EXCLUDED.status;

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
  ('FG',                  '',                   '',    ''),
  ('Spare Parts',         '',                   '',    ''),
  ('Consumables',         '',                   '',    ''),
  ('Raw Material',        '',                   '',    ''),
  ('Bought-Out Parts 🛠',  '',                   '',    '')
ON CONFLICT (category_name) DO UPDATE SET
  bom_consumption = EXCLUDED.bom_consumption,
  category_code   = EXCLUDED.category_code,
  short_code      = EXCLUDED.short_code;

-- =============================================================================
-- Supplier / Vendor Master Schema (Book 3 & Book 5 matched attributes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.supplier_master (
    id BIGSERIAL PRIMARY KEY,
    supplier_id VARCHAR(50) NOT NULL UNIQUE,
    supplier_code VARCHAR(50) NOT NULL UNIQUE,
    supplier_name VARCHAR(255) NOT NULL,
    company_id VARCHAR(50) NOT NULL DEFAULT 'COMP-001',
    supplier_type VARCHAR(50) DEFAULT 'MATERIAL',
    gstin VARCHAR(50),
    pan VARCHAR(30),
    udyam_no VARCHAR(50),
    msme_category VARCHAR(50) DEFAULT 'NOT_MSME',
    gst_registration_type VARCHAR(50) NOT NULL DEFAULT 'REGISTERED',
    tds_section_id VARCHAR(50) DEFAULT 'TDS-194C',
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    payment_terms_id VARCHAR(50) DEFAULT 'PT-30',
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    state_code VARCHAR(10),
    pincode VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM'
);

CREATE INDEX IF NOT EXISTS idx_supplier_code ON public.supplier_master(supplier_code);
CREATE INDEX IF NOT EXISTS idx_supplier_name ON public.supplier_master(supplier_name);
CREATE INDEX IF NOT EXISTS idx_supplier_gstin ON public.supplier_master(gstin);
CREATE INDEX IF NOT EXISTS idx_supplier_state ON public.supplier_master(state);

-- =============================================================================
-- Customer Master Schema (Book 3 & Book 5 matched attributes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.customer_master (
    id BIGSERIAL PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL UNIQUE,
    customer_code VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    company_id VARCHAR(50) NOT NULL DEFAULT 'COMP-001',
    customer_type VARCHAR(50) DEFAULT 'OEM',
    gstin VARCHAR(50),
    pan VARCHAR(30),
    udyam_no VARCHAR(50),
    msme_category VARCHAR(50) DEFAULT 'NOT_MSME',
    gst_registration_type VARCHAR(50) NOT NULL DEFAULT 'REGISTERED',
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    payment_terms_id VARCHAR(50) DEFAULT 'PT-30',
    credit_limit NUMERIC(15,2) DEFAULT 500000.00,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    state_code VARCHAR(10),
    pincode VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM'
);

CREATE INDEX IF NOT EXISTS idx_customer_code ON public.customer_master(customer_code);
CREATE INDEX IF NOT EXISTS idx_customer_name ON public.customer_master(customer_name);
CREATE INDEX IF NOT EXISTS idx_customer_gstin ON public.customer_master(gstin);

-- =============================================================================
-- Maintenance Module — Machine Master
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.machine_master (
    id              BIGSERIAL PRIMARY KEY,
    s_no            INT,
    machine_no      VARCHAR(50) NOT NULL,
    description     VARCHAR(255) NOT NULL,
    department      VARCHAR(100),
    location        VARCHAR(150),
    specification   TEXT,
    capacity        VARCHAR(150),
    make            VARCHAR(255),
    remarks         TEXT,
    category        VARCHAR(100) DEFAULT 'General',
    status          VARCHAR(50) DEFAULT 'ACTIVE',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_machine_master_no ON public.machine_master(machine_no);
CREATE INDEX IF NOT EXISTS idx_machine_master_dept ON public.machine_master(department);
CREATE INDEX IF NOT EXISTS idx_machine_master_status ON public.machine_master(status);
CREATE INDEX IF NOT EXISTS idx_customer_state ON public.customer_master(state);

-- =============================================================================
-- Purchase Module — Vendor Quotation Management
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vendor_quotations (
    id                      BIGSERIAL PRIMARY KEY,
    quotation_number        VARCHAR(50) NOT NULL UNIQUE,
    vendor_id               BIGINT,
    vendor_code             VARCHAR(50) NOT NULL,
    vendor_name             VARCHAR(255) NOT NULL,
    vendor_ref_no           VARCHAR(100),
    quotation_date          DATE NOT NULL,
    valid_until             DATE NOT NULL,
    contact_person          VARCHAR(255),
    payment_terms           VARCHAR(100) DEFAULT 'Net 30 Days',
    delivery_time           VARCHAR(100) DEFAULT '7-10 Days',
    delivery_location       VARCHAR(255) DEFAULT 'SMS Main Stores, Faridabad',
    subtotal_amount         NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_amount              NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    delivery_charges        NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    other_charges           NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    final_amount            NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status                  VARCHAR(50) NOT NULL DEFAULT 'Draft',
    selection_justification TEXT,
    notes                   TEXT,
    document_name           VARCHAR(255),
    document_url            TEXT,
    revision_number         INT NOT NULL DEFAULT 1,
    is_latest               BOOLEAN NOT NULL DEFAULT TRUE,
    parent_quotation_id     BIGINT,
    pr_id                   BIGINT,
    pr_number               VARCHAR(50),
    created_by              VARCHAR(100) NOT NULL DEFAULT 'Purchase Officer',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by              VARCHAR(100) NOT NULL DEFAULT 'Purchase Officer',
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by             VARCHAR(100),
    approved_at             TIMESTAMPTZ,
    evaluation_notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_vquot_num ON public.vendor_quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_vquot_vcode ON public.vendor_quotations(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vquot_status ON public.vendor_quotations(status);
CREATE INDEX IF NOT EXISTS idx_vquot_date ON public.vendor_quotations(quotation_date);
CREATE INDEX IF NOT EXISTS idx_vquot_valid ON public.vendor_quotations(valid_until);
CREATE INDEX IF NOT EXISTS idx_vquot_pr ON public.vendor_quotations(pr_number);

CREATE TABLE IF NOT EXISTS public.vendor_quotation_items (
    id                  BIGSERIAL PRIMARY KEY,
    quotation_id        BIGINT NOT NULL REFERENCES public.vendor_quotations(id) ON DELETE CASCADE,
    pr_item_id          BIGINT,
    item_id             BIGINT,
    item_code           VARCHAR(100) NOT NULL,
    item_description    TEXT NOT NULL,
    uom                 VARCHAR(50) NOT NULL DEFAULT 'PCS',
    quoted_quantity     NUMERIC(15, 2) NOT NULL DEFAULT 1.00,
    unit_rate           NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_percent    NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_amount     NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_type            VARCHAR(50) NOT NULL DEFAULT 'GST 18%',
    tax_percent         NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    tax_amount          NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    additional_charges  NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    line_total          NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    effective_unit_cost NUMERIC(15, 4) NOT NULL DEFAULT 0.00,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vquot_items_qid ON public.vendor_quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_vquot_items_code ON public.vendor_quotation_items(item_code);

CREATE TABLE IF NOT EXISTS public.vendor_quotation_history (
    id              BIGSERIAL PRIMARY KEY,
    quotation_id    BIGINT NOT NULL REFERENCES public.vendor_quotations(id) ON DELETE CASCADE,
    action          VARCHAR(50) NOT NULL,
    action_by       VARCHAR(100) NOT NULL,
    action_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    comments        TEXT,
    details_json    TEXT
);

CREATE INDEX IF NOT EXISTS idx_vquot_hist_qid ON public.vendor_quotation_history(quotation_id);

CREATE TABLE IF NOT EXISTS public.vendor_quotation_comments (
    id              BIGSERIAL PRIMARY KEY,
    quotation_id    BIGINT NOT NULL REFERENCES public.vendor_quotations(id) ON DELETE CASCADE,
    author          VARCHAR(100) NOT NULL,
    comment         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vquot_comm_qid ON public.vendor_quotation_comments(quotation_id);

-- =============================================================================
-- Purchase Module — Purchase Requisitions (PR)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
    id                  BIGSERIAL PRIMARY KEY,
    pr_number           VARCHAR(50) NOT NULL UNIQUE,
    pr_date             DATE NOT NULL,
    required_date       DATE,
    requisitioner       VARCHAR(100),
    department          VARCHAR(100),
    store               VARCHAR(100),
    preferred_vendor    VARCHAR(255),
    priority            VARCHAR(50) DEFAULT 'Normal',
    requirement_type    VARCHAR(100),
    procurement_method  VARCHAR(100) DEFAULT 'Competitive Quotation',
    purpose             TEXT,
    remarks             TEXT,
    status              VARCHAR(50) NOT NULL DEFAULT 'Draft',
    created_by          VARCHAR(100),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by         VARCHAR(100),
    approved_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pr_num ON public.purchase_requisitions(pr_number);
CREATE INDEX IF NOT EXISTS idx_pr_status ON public.purchase_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_pr_dept ON public.purchase_requisitions(department);

CREATE TABLE IF NOT EXISTS public.purchase_requisition_items (
    id              BIGSERIAL PRIMARY KEY,
    pr_id           BIGINT NOT NULL REFERENCES public.purchase_requisitions(id) ON DELETE CASCADE,
    pr_number       VARCHAR(50) NOT NULL,
    item_code       VARCHAR(100) NOT NULL,
    item_name       VARCHAR(255),
    description     TEXT,
    uom             VARCHAR(50) NOT NULL DEFAULT 'PCS',
    req_qty         NUMERIC(15, 2) NOT NULL DEFAULT 1.00,
    ordered_qty     NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    remaining_qty   NUMERIC(15, 2) NOT NULL DEFAULT 1.00,
    est_rate        NUMERIC(15, 2) DEFAULT 0.00,
    est_total       NUMERIC(15, 2) DEFAULT 0.00,
    remarks         TEXT,
    category        VARCHAR(255) DEFAULT 'FG',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.purchase_requisition_items ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT 'FG';
ALTER TABLE public.vendor_quotation_items ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT 'FG';

CREATE INDEX IF NOT EXISTS idx_pr_items_prid ON public.purchase_requisition_items(pr_id);
CREATE INDEX IF NOT EXISTS idx_pr_items_prnum ON public.purchase_requisition_items(pr_number);
CREATE INDEX IF NOT EXISTS idx_pr_items_code ON public.purchase_requisition_items(item_code);

-- =============================================================================
-- Purchase Module — Purchase Proposals (PO Processing / Approval)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_proposals (
    id                      VARCHAR(100) PRIMARY KEY,
    proposal_number         VARCHAR(50) NOT NULL UNIQUE,
    pr_number               VARCHAR(50),
    pr_date                 VARCHAR(50),
    department              VARCHAR(100),
    requested_by            VARCHAR(100),
    required_by_date        VARCHAR(50),
    priority                VARCHAR(50),
    purpose                 TEXT,
    remarks                 TEXT,
    status                  VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    source_quotation_number VARCHAR(50),
    source_quotation_id     BIGINT,
    grand_gross             NUMERIC(15, 2) DEFAULT 0.00,
    grand_discount          NUMERIC(15, 2) DEFAULT 0.00,
    grand_taxable           NUMERIC(15, 2) DEFAULT 0.00,
    grand_tax               NUMERIC(15, 2) DEFAULT 0.00,
    grand_delivery          NUMERIC(15, 2) DEFAULT 0.00,
    grand_other_charges     NUMERIC(15, 2) DEFAULT 0.00,
    grand_round_off         NUMERIC(15, 2) DEFAULT 0.00,
    grand_total             NUMERIC(15, 2) DEFAULT 0.00,
    created_by              VARCHAR(100),
    created_at              VARCHAR(100),
    approved_by             VARCHAR(100),
    approved_at             VARCHAR(100),
    rejection_reason        TEXT,
    changes_requested_by    VARCHAR(100),
    changes_comments        TEXT,
    details_json            TEXT,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prop_num ON public.purchase_proposals(proposal_number);
CREATE INDEX IF NOT EXISTS idx_prop_pr ON public.purchase_proposals(pr_number);
CREATE INDEX IF NOT EXISTS idx_prop_status ON public.purchase_proposals(status);

-- =============================================================================
-- Purchase Module — Purchase Orders (PO Register)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id                      VARCHAR(100) PRIMARY KEY,
    po_number               VARCHAR(50) NOT NULL UNIQUE,
    po_date                 VARCHAR(50) NOT NULL,
    proposal_number         VARCHAR(50),
    pr_number               VARCHAR(50),
    pr_date                 VARCHAR(50),
    department              VARCHAR(100),
    requested_by            VARCHAR(100),
    vendor_code             VARCHAR(50) NOT NULL,
    vendor_name             VARCHAR(255) NOT NULL,
    vendor_gstin            VARCHAR(50),
    vendor_pan              VARCHAR(50),
    contact_person          VARCHAR(100),
    phone                   VARCHAR(50),
    email                   VARCHAR(100),
    billing_address         TEXT,
    shipping_address        TEXT,
    payment_terms           VARCHAR(100),
    delivery_date           VARCHAR(50),
    delivery_location       VARCHAR(255),
    status                  VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    items_gross             NUMERIC(15, 2) DEFAULT 0.00,
    total_discount          NUMERIC(15, 2) DEFAULT 0.00,
    taxable_amount          NUMERIC(15, 2) DEFAULT 0.00,
    total_tax               NUMERIC(15, 2) DEFAULT 0.00,
    delivery_charges        NUMERIC(15, 2) DEFAULT 0.00,
    other_charges           NUMERIC(15, 2) DEFAULT 0.00,
    round_off               NUMERIC(15, 2) DEFAULT 0.00,
    grand_total             NUMERIC(15, 2) DEFAULT 0.00,
    remarks                 TEXT,
    approved_by             VARCHAR(100),
    approved_at             VARCHAR(100),
    source_quotation_number VARCHAR(50),
    source_quotation_id     BIGINT,
    details_json            TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_num ON public.purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_po_pr ON public.purchase_orders(pr_number);
CREATE INDEX IF NOT EXISTS idx_po_quote ON public.purchase_orders(source_quotation_number);
CREATE INDEX IF NOT EXISTS idx_po_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_vendor ON public.purchase_orders(vendor_code);

-- =============================================================================
-- Purchase Module — Goods Receipt Note (GRN & Material Inward Register)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.goods_receipt_notes (
    id                      BIGSERIAL PRIMARY KEY,
    grn_number              VARCHAR(50) NOT NULL UNIQUE,
    grn_date                DATE NOT NULL,
    po_number               VARCHAR(50) NOT NULL,
    po_date                 VARCHAR(50),
    pr_number               VARCHAR(50),
    vendor_code             VARCHAR(50) NOT NULL,
    vendor_name             VARCHAR(255) NOT NULL,
    vendor_gstin            VARCHAR(50),
    vendor_challan_no       VARCHAR(100) NOT NULL,
    vendor_challan_date     DATE,
    vendor_invoice_no       VARCHAR(100),
    vendor_invoice_date     DATE,
    transporter_name        VARCHAR(150),
    vehicle_number          VARCHAR(50),
    store_location          VARCHAR(150) NOT NULL,
    received_by             VARCHAR(100) NOT NULL,
    inspected_by            VARCHAR(100),
    status                  VARCHAR(50) NOT NULL DEFAULT 'POSTED',
    total_ordered_qty       NUMERIC(15, 2) DEFAULT 0.00,
    total_challan_qty       NUMERIC(15, 2) DEFAULT 0.00,
    total_received_qty      NUMERIC(15, 2) DEFAULT 0.00,
    total_accepted_qty      NUMERIC(15, 2) DEFAULT 0.00,
    total_rejected_qty      NUMERIC(15, 2) DEFAULT 0.00,
    total_pending_qty       NUMERIC(15, 2) DEFAULT 0.00,
    total_value             NUMERIC(15, 2) DEFAULT 0.00,
    remarks                 TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100) NOT NULL,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by              VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_grn_num ON public.goods_receipt_notes(grn_number);
CREATE INDEX IF NOT EXISTS idx_grn_po ON public.goods_receipt_notes(po_number);
CREATE INDEX IF NOT EXISTS idx_grn_vendor ON public.goods_receipt_notes(vendor_code);
CREATE INDEX IF NOT EXISTS idx_grn_status ON public.goods_receipt_notes(status);

CREATE TABLE IF NOT EXISTS public.goods_receipt_note_items (
    id                      BIGSERIAL PRIMARY KEY,
    grn_id                  BIGINT NOT NULL REFERENCES public.goods_receipt_notes(id) ON DELETE CASCADE,
    grn_number              VARCHAR(50) NOT NULL,
    po_number               VARCHAR(50) NOT NULL,
    item_code               VARCHAR(100) NOT NULL,
    item_name               VARCHAR(255) NOT NULL,
    description             TEXT,
    category                VARCHAR(100),
    uom                     VARCHAR(50) DEFAULT 'PCS',
    po_ordered_qty          NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    prior_received_qty      NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    balance_expected_qty    NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    challan_qty             NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    received_qty            NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    accepted_qty            NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    rejected_qty            NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    pending_inspection_qty  NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    rejection_reason        VARCHAR(255),
    storage_bin             VARCHAR(100),
    unit_rate               NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_percent             NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    item_total              NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    remarks                 TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grni_grn_id ON public.goods_receipt_note_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_grni_po ON public.goods_receipt_note_items(po_number);
CREATE INDEX IF NOT EXISTS idx_grni_item ON public.goods_receipt_note_items(item_code);

-- =============================================================================
-- Purchase Module — Request For Quotation (RFQ & Vendor Enquiry)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rfq_headers (
    id                      BIGSERIAL PRIMARY KEY,
    rfq_number              VARCHAR(50) NOT NULL UNIQUE,
    rfq_date                DATE NOT NULL,
    due_date                DATE NOT NULL,
    pr_number               VARCHAR(50) NOT NULL,
    pr_date                 VARCHAR(50),
    department              VARCHAR(100),
    title                   VARCHAR(255) NOT NULL,
    status                  VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    selected_vendors_json   TEXT,
    delivery_location       VARCHAR(255),
    payment_terms           VARCHAR(100),
    terms_conditions        TEXT,
    remarks                 TEXT,
    created_by              VARCHAR(100) NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rfq_num ON public.rfq_headers(rfq_number);
CREATE INDEX IF NOT EXISTS idx_rfq_pr ON public.rfq_headers(pr_number);
CREATE INDEX IF NOT EXISTS idx_rfq_status ON public.rfq_headers(status);

CREATE TABLE IF NOT EXISTS public.rfq_items (
    id                      BIGSERIAL PRIMARY KEY,
    rfq_id                  BIGINT NOT NULL REFERENCES public.rfq_headers(id) ON DELETE CASCADE,
    rfq_number              VARCHAR(50) NOT NULL,
    pr_number               VARCHAR(50),
    item_code               VARCHAR(100) NOT NULL,
    item_name               VARCHAR(255) NOT NULL,
    description             TEXT,
    category                VARCHAR(100),
    uom                     VARCHAR(50) DEFAULT 'PCS',
    required_qty            NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    target_date             DATE,
    remarks                 TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rfqi_rfq_id ON public.rfq_items(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfqi_pr ON public.rfq_items(pr_number);
CREATE INDEX IF NOT EXISTS idx_rfqi_item ON public.rfq_items(item_code);

-- =============================================================================
-- Purchase Module — PR Clubbing & Consolidation Module
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pr_clubbing_batches (
    id                  BIGSERIAL PRIMARY KEY,
    batch_number        VARCHAR(50) NOT NULL UNIQUE,
    batch_name          VARCHAR(255) NOT NULL,
    status              VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    total_items_count   INT DEFAULT 0,
    total_clubbed_qty   NUMERIC(15, 2) DEFAULT 0,
    purchased_qty       NUMERIC(15, 2) DEFAULT 0,
    remaining_qty       NUMERIC(15, 2) DEFAULT 0,
    notes               TEXT,
    created_by          VARCHAR(100) DEFAULT 'Purchase Officer',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_club_batch_num ON public.pr_clubbing_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_club_batch_status ON public.pr_clubbing_batches(status);

CREATE TABLE IF NOT EXISTS public.pr_clubbing_batch_items (
    id                  BIGSERIAL PRIMARY KEY,
    batch_id            BIGINT NOT NULL REFERENCES public.pr_clubbing_batches(id) ON DELETE CASCADE,
    batch_number        VARCHAR(50) NOT NULL,
    item_code           VARCHAR(100) NOT NULL,
    item_name           VARCHAR(255),
    description         TEXT,
    category            VARCHAR(100),
    uom                 VARCHAR(50) NOT NULL DEFAULT 'PCS',
    total_clubbed_qty   NUMERIC(15, 2) NOT NULL DEFAULT 0,
    purchased_qty       NUMERIC(15, 2) NOT NULL DEFAULT 0,
    remaining_qty       NUMERIC(15, 2) NOT NULL DEFAULT 0,
    est_rate            NUMERIC(15, 2) DEFAULT 0,
    status              VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_club_items_batchid ON public.pr_clubbing_batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_club_items_code ON public.pr_clubbing_batch_items(item_code);

CREATE TABLE IF NOT EXISTS public.pr_clubbing_allocations (
    id                  BIGSERIAL PRIMARY KEY,
    batch_id            BIGINT NOT NULL REFERENCES public.pr_clubbing_batches(id) ON DELETE CASCADE,
    batch_item_id       BIGINT NOT NULL REFERENCES public.pr_clubbing_batch_items(id) ON DELETE CASCADE,
    pr_id               BIGINT NOT NULL,
    pr_number           VARCHAR(50) NOT NULL,
    pr_item_id          BIGINT NOT NULL REFERENCES public.purchase_requisition_items(id) ON DELETE CASCADE,
    item_code           VARCHAR(100) NOT NULL,
    allocated_qty       NUMERIC(15, 2) NOT NULL DEFAULT 0,
    purchased_qty       NUMERIC(15, 2) NOT NULL DEFAULT 0,
    remaining_qty       NUMERIC(15, 2) NOT NULL DEFAULT 0,
    po_id               VARCHAR(100),
    po_number           VARCHAR(100),
    status              VARCHAR(50) NOT NULL DEFAULT 'ALLOCATED',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_club_alloc_batchitem ON public.pr_clubbing_allocations(batch_item_id);
CREATE INDEX IF NOT EXISTS idx_club_alloc_pritem ON public.pr_clubbing_allocations(pr_item_id);
CREATE INDEX IF NOT EXISTS idx_club_alloc_prnum ON public.pr_clubbing_allocations(pr_number);

ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS clubbing_batch_number VARCHAR(50);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS clubbing_batch_id BIGINT;

-- =============================================================================
-- HSN & SAC Tax Master and Phase 1.5 Purchasing Schema Enhancements
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.hsn_tax_master (
    id                  BIGSERIAL PRIMARY KEY,
    hsn_sac_code        VARCHAR(20) NOT NULL UNIQUE,
    description         VARCHAR(255) NOT NULL,
    type                VARCHAR(20) NOT NULL DEFAULT 'GOODS',
    gst_rate            NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    cgst_rate           NUMERIC(5, 2) NOT NULL DEFAULT 9.00,
    sgst_rate           NUMERIC(5, 2) NOT NULL DEFAULT 9.00,
    igst_rate           NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    cess_rate           NUMERIC(5, 2) DEFAULT 0.00,
    chapter             VARCHAR(10),
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hsn_code ON public.hsn_tax_master(hsn_sac_code);
CREATE INDEX IF NOT EXISTS idx_hsn_type ON public.hsn_tax_master(type);

INSERT INTO public.hsn_tax_master (hsn_sac_code, description, type, gst_rate, cgst_rate, sgst_rate, igst_rate, cess_rate, chapter)
VALUES 
    ('40169320', 'Rubber seals, oil seals, gaskets, washers', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('40169330', 'Rubber O-rings & moulded rubber components', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('40169340', 'Gaskets, washers and other seals of vulcanised rubber', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('40169990', 'Other articles of vulcanised rubber (bellows, grommets, boots)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('40021990', 'Synthetic rubber compound (NBR, SBR, EPDM, FKM Viton)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('40051000', 'Compounded rubber with carbon black or silica, unvulcanised', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('40027000', 'Ethylene-propylene-non-conjugated diene rubber (EPDM)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('40029990', 'Fluorocarbon elastomers (FKM Viton, FFKM)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('40082110', 'Non-cellular rubber sheets for gasket cutting', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('39269099', 'PTFE backup rings, guide rings, wear strips, plastic seals', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '39'),
    ('39046100', 'Polytetrafluoroethylene (PTFE) raw resin powder', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '39'),
    ('39232990', 'Packaging polythene bags & packing wraps for seals', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '39'),
    ('73202000', 'Helical & garter springs for rotary shaft oil seals', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '73'),
    ('73209090', 'Flat springs, Belleville washers, wave springs', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '73'),
    ('73182100', 'Spring washers and other lock washers', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '73'),
    ('73181500', 'Screws, bolts, nuts, rivets, studs for tooling & assemblies', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '73'),
    ('73269099', 'Deep draw outer metal shells & metal casing inserts', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '73'),
    ('72283000', 'Alloy steel bars / rods (EN8, EN24, EN31) for tooling', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '72'),
    ('72091600', 'Cold-rolled steel coils / sheets for stamping outer casings', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '72'),
    ('72104900', 'Galvanized / zinc coated steel sheets for corrosion resistance', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '72'),
    ('84807100', 'Injection moulds for rubber or plastics', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
    ('84807900', 'Compression moulding dies & transfer moulds for seals', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
    ('84841000', 'Gaskets of metal sheeting combined with other material', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
    ('84842000', 'Mechanical face seals for pumps and agitators', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
    ('84821011', 'Ball bearings & roller bearings for CNC & hydraulic presses', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
    ('84669390', 'Parts and accessories for machine tools / CNC chucks & collets', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
    ('82073000', 'Press tools, punches, blanking dies for power presses', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '82'),
    ('34039900', 'Mould release agents, silicone sprays & anti-stick sprays', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '34'),
    ('27101980', 'Hydraulic oils (VG 68, VG 46), spindle oils, turbine oils', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '27'),
    ('27101990', 'Industrial lubricating greases (Lithium, synthetic high-temp)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '27'),
    ('38249990', 'Rubber bonding agents (Chemlok / Megum adhesive primers)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '38'),
    ('28030010', 'Carbon black for rubber compounding', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '28'),
    ('28170010', 'Zinc oxide (rubber grade vulcanizing activator)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '28'),
    ('28020010', 'Sulphur powder (rubber vulcanization agent)', 'GOODS', 5.00, 2.50, 2.50, 5.00, 0.00, '28'),
    ('998821', 'Job work / Subcontracting (rubber moulding & trimming services)', 'SERVICE', 12.00, 6.00, 6.00, 12.00, 0.00, '99'),
    ('998822', 'Job work (metal stamping, casing phosphating, zinc plating)', 'SERVICE', 12.00, 6.00, 6.00, 12.00, 0.00, '99'),
    ('998719', 'Maintenance, calibration and repair of production machinery', 'SERVICE', 18.00, 9.00, 9.00, 18.00, 0.00, '99'),
    ('998314', 'Testing, lab analysis & metallurgical inspection services', 'SERVICE', 18.00, 9.00, 9.00, 18.00, 0.00, '99'),
    ('996511', 'Road freight transportation (GTA / Goods Transport Agency)', 'SERVICE', 5.00, 2.50, 2.50, 5.00, 0.00, '99')
ON CONFLICT (hsn_sac_code) DO NOTHING;

ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS pr_type VARCHAR(50) DEFAULT 'Direct Material';
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS cost_center VARCHAR(100);
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS project_reference VARCHAR(100);
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE public.purchase_requisition_items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50);
ALTER TABLE public.purchase_requisition_items ADD COLUMN IF NOT EXISTS drawing_no VARCHAR(100);
ALTER TABLE public.purchase_requisition_items ADD COLUMN IF NOT EXISTS manufacturer_brand VARCHAR(100);
ALTER TABLE public.purchase_requisition_items ADD COLUMN IF NOT EXISTS required_by_date VARCHAR(50);

ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS po_type VARCHAR(50) DEFAULT 'STANDARD';
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS incoterms VARCHAR(50) DEFAULT 'FOR Destination';
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS freight_terms VARCHAR(50) DEFAULT 'Included in Price';
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS delivery_mode VARCHAR(50) DEFAULT 'Road Transport';
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS credit_period INT DEFAULT 30;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS revision_number INT DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS company_gstin VARCHAR(50) DEFAULT '27ABCDE1234F1Z5';
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS company_state_code VARCHAR(10) DEFAULT '27';

-- PO Validity: NULL = legacy PO (no expiry enforced). A PO is valid through validity_date and expired from the next day.
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS validity_date DATE;

CREATE TABLE IF NOT EXISTS public.purchase_order_validity_history (
    id                  BIGSERIAL PRIMARY KEY,
    po_number           VARCHAR(50) NOT NULL,
    action              VARCHAR(20) NOT NULL DEFAULT 'EXTENDED',
    old_validity_date   DATE,
    new_validity_date   DATE NOT NULL,
    changed_by          VARCHAR(100) NOT NULL,
    reason              TEXT NOT NULL,
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_po_validity_hist_num ON public.purchase_order_validity_history(po_number);

CREATE TABLE IF NOT EXISTS public.po_revisions (
    id                  BIGSERIAL PRIMARY KEY,
    po_number           VARCHAR(50) NOT NULL,
    revision_number     INT NOT NULL DEFAULT 1,
    changed_by          VARCHAR(100) NOT NULL,
    change_reason       TEXT NOT NULL,
    changes_json        TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_rev_num ON public.po_revisions(po_number);

-- Planned PO Delivery Schedule Lines
CREATE TABLE IF NOT EXISTS public.purchase_order_delivery_schedules (
    id BIGSERIAL PRIMARY KEY,
    po_id BIGINT,
    po_number VARCHAR(50) NOT NULL,
    item_code VARCHAR(100) NOT NULL,
    lot_number INT NOT NULL DEFAULT 1,
    scheduled_date DATE NOT NULL,
    scheduled_qty NUMERIC(15, 2) NOT NULL,
    received_qty NUMERIC(15, 2) DEFAULT 0.00,
    balance_qty NUMERIC(15, 2) NOT NULL,
    destination_store VARCHAR(150),
    status VARCHAR(30) DEFAULT 'SCHEDULED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_sched_num ON public.purchase_order_delivery_schedules(po_number);
CREATE INDEX IF NOT EXISTS idx_po_sched_date ON public.purchase_order_delivery_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_po_sched_item ON public.purchase_order_delivery_schedules(item_code);

-- Planned PO Commercial Payment Milestones
CREATE TABLE IF NOT EXISTS public.purchase_order_payment_milestones (
    id BIGSERIAL PRIMARY KEY,
    po_id BIGINT,
    po_number VARCHAR(50) NOT NULL,
    milestone_sequence INT NOT NULL DEFAULT 1,
    milestone_title VARCHAR(150) NOT NULL,
    trigger_event VARCHAR(50) NOT NULL,
    linked_lot_number INT,
    percentage NUMERIC(5, 2),
    milestone_amount NUMERIC(15, 2) NOT NULL,
    credit_days INT DEFAULT 15,
    due_date DATE,
    payment_status VARCHAR(30) DEFAULT 'PENDING',
    paid_amount NUMERIC(15, 2) DEFAULT 0.00,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_milestone_num ON public.purchase_order_payment_milestones(po_number);

-- =============================================================================
-- PROCUREMENT MASTER & PROCESS MASTER
-- =============================================================================

-- 1. Procurement Master Table
CREATE TABLE IF NOT EXISTS public.procurement_master (
    id BIGSERIAL PRIMARY KEY,
    procurement_type VARCHAR(100) NOT NULL UNIQUE,
    procurement_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_inventory.procurement_master (
    id BIGSERIAL PRIMARY KEY,
    procurement_type VARCHAR(100) NOT NULL UNIQUE,
    procurement_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.procurement_master (procurement_type, procurement_name) VALUES
    ('IN HOUSE', 'IN HOUSE'),
    ('OUTSOURCE', 'OUTSOURCE'),
    ('BUY/INHOUSE', 'BUY/INHOUSE'),
    ('IMPORTED', 'IMPORTED')
ON CONFLICT (procurement_type) DO UPDATE 
SET procurement_name = EXCLUDED.procurement_name;

INSERT INTO sms_inventory.procurement_master (procurement_type, procurement_name) VALUES
    ('IN HOUSE', 'IN HOUSE'),
    ('OUTSOURCE', 'OUTSOURCE'),
    ('BUY/INHOUSE', 'BUY/INHOUSE'),
    ('IMPORTED', 'IMPORTED')
ON CONFLICT (procurement_type) DO UPDATE 
SET procurement_name = EXCLUDED.procurement_name;

-- 2. Process Master Table
CREATE TABLE IF NOT EXISTS public.process_master (
    id BIGSERIAL PRIMARY KEY,
    process_code VARCHAR(50) NOT NULL UNIQUE,
    process_description VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_inventory.process_master (
    id BIGSERIAL PRIMARY KEY,
    process_code VARCHAR(50) NOT NULL UNIQUE,
    process_description VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.process_master (process_code, process_description) VALUES
    ('PR-1', '1 : Metal Open Type : In-house'),
    ('PR-2', '2 : Metal Close Type : In-house'),
    ('PR-3', '5 : Half Rubber : Open'),
    ('PR-4', '6 : Half Rubber : Close'),
    ('PR-5', '7 : Full Rubber : Open'),
    ('PR-7', '8 : Full Rubber : Close'),
    ('PR-8', '9 : Cassette Seal'),
    ('PR-9', '10 : Combi Seal'),
    ('PR-10', '11 : PTFE Moulded (no inner shell)'),
    ('PR-11', '12 : PTFE Moulded (with inner shell)'),
    ('PR-12', '13 : PTFE Fitted'),
    ('PR-13', '14 : Hub Seal SKF'),
    ('PR-14', '15 : Hub Seal National'),
    ('PR-15', '3: ABS SEAL'),
    ('PR-51', '16 : PTFE Moulded (no inner shell ) Half Rubber'),
    ('PR-16', 'NA')
ON CONFLICT (process_code) DO UPDATE 
SET process_description = EXCLUDED.process_description;

INSERT INTO sms_inventory.process_master (process_code, process_description) VALUES
    ('PR-1', '1 : Metal Open Type : In-house'),
    ('PR-2', '2 : Metal Close Type : In-house'),
    ('PR-3', '5 : Half Rubber : Open'),
    ('PR-4', '6 : Half Rubber : Close'),
    ('PR-5', '7 : Full Rubber : Open'),
    ('PR-7', '8 : Full Rubber : Close'),
    ('PR-8', '9 : Cassette Seal'),
    ('PR-9', '10 : Combi Seal'),
    ('PR-10', '11 : PTFE Moulded (no inner shell)'),
    ('PR-11', '12 : PTFE Moulded (with inner shell)'),
    ('PR-12', '13 : PTFE Fitted'),
    ('PR-13', '14 : Hub Seal SKF'),
    ('PR-14', '15 : Hub Seal National'),
    ('PR-15', '3: ABS SEAL'),
    ('PR-51', '16 : PTFE Moulded (no inner shell ) Half Rubber'),
    ('PR-16', 'NA')
ON CONFLICT (process_code) DO UPDATE 
SET process_description = EXCLUDED.process_description;







-- =============================================================================
-- SERVICE PURCHASE ORDER (Service PO)
-- Separate tables from the Standard PO (purchase_orders) so Standard PO and GRN
-- flows are untouched. Service POs never create GRNs or inventory transactions.
-- =============================================================================

-- Sub-groups of the "Service" group. New rows appear in the Service PO dropdown automatically.
CREATE TABLE IF NOT EXISTS public.service_po_categories (
  id           BIGSERIAL PRIMARY KEY,
  parent_group VARCHAR(100) NOT NULL DEFAULT 'Service',
  name         VARCHAR(150) NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_service_po_category UNIQUE (parent_group, name)
);

INSERT INTO public.service_po_categories (parent_group, name, sort_order) VALUES
  ('Service', 'Machine Maintenance', 1),
  ('Service', 'Quality Services', 2),
  ('Service', 'Transportation', 3),
  ('Service', 'Facility Services', 4),
  ('Service', 'IT Services', 5),
  ('Service', 'Professional Services', 6),
  ('Service', 'Utilities', 7)
ON CONFLICT (parent_group, name) DO NOTHING;

CREATE SEQUENCE IF NOT EXISTS public.service_po_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.service_purchase_orders (
  id                          BIGSERIAL PRIMARY KEY,
  po_number                   VARCHAR(30) NOT NULL UNIQUE,
  po_type                     VARCHAR(20) NOT NULL DEFAULT 'SERVICE',
  po_date                     DATE NOT NULL,
  status                      VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  -- Vendor snapshot (copied from supplier_master by the backend)
  vendor_code                 VARCHAR(50) NOT NULL,
  vendor_name                 VARCHAR(255) NOT NULL,
  vendor_legal_name           VARCHAR(255),
  vendor_address              TEXT,
  vendor_gstin                VARCHAR(20),
  vendor_pan                  VARCHAR(20),
  vendor_state                VARCHAR(100),
  vendor_state_code           VARCHAR(5),
  -- Company / supply
  company_name                VARCHAR(255),
  company_gstin               VARCHAR(20),
  company_state_code          VARCHAR(5) NOT NULL,
  place_of_supply_state_code  VARCHAR(5) NOT NULL,
  supply_type                 VARCHAR(10) NOT NULL,
  department_code             VARCHAR(50),
  department_name             VARCHAR(255),
  requester                   VARCHAR(150) NOT NULL,
  business_unit               VARCHAR(150),
  service_location            VARCHAR(255),
  pr_number                   VARCHAR(50),
  quotation_reference         VARCHAR(100),
  contract_reference          VARCHAR(100),
  currency                    VARCHAR(10) NOT NULL DEFAULT 'INR',
  validity_start              DATE,
  validity_end                DATE NOT NULL,
  service_start_date          DATE,
  service_completion_date     DATE,
  payment_terms               VARCHAR(255),
  internal_remarks            TEXT,
  -- Service description & scope
  service_category            VARCHAR(150) NOT NULL,
  service_title               VARCHAR(255) NOT NULL,
  scope_of_work               TEXT NOT NULL,
  deliverables                TEXT,
  acceptance_criteria         TEXT,
  sla_terms                   TEXT,
  warranty_terms              TEXT,
  exclusions                  TEXT,
  special_instructions        TEXT,
  related_asset_id            VARCHAR(100),
  service_frequency           VARCHAR(20) NOT NULL DEFAULT 'ONE_TIME',
  number_of_visits            INT,
  cancellation_terms          TEXT,
  terms_and_conditions        TEXT,
  -- Pricing
  pricing_method              VARCHAR(30) NOT NULL,
  quantity                    NUMERIC(15,3),
  unit_of_measure             VARCHAR(30),
  rate                        NUMERIC(15,2),
  basic_amount                NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_type               VARCHAR(10) NOT NULL DEFAULT 'NONE',
  discount_value              NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount             NUMERIC(15,2) NOT NULL DEFAULT 0,
  additional_charges          NUMERIC(15,2) NOT NULL DEFAULT 0,
  taxable_amount              NUMERIC(15,2) NOT NULL DEFAULT 0,
  -- GST / SAC (rates come from hsn_tax_master, never from the client)
  sac_code                    VARCHAR(20),
  sac_description             VARCHAR(255),
  gst_taxability              VARCHAR(20) NOT NULL DEFAULT 'TAXABLE',
  non_gst_reason              TEXT,
  gst_rate                    NUMERIC(5,2) NOT NULL DEFAULT 0,
  cgst_rate                   NUMERIC(5,2) NOT NULL DEFAULT 0,
  cgst_amount                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  sgst_rate                   NUMERIC(5,2) NOT NULL DEFAULT 0,
  sgst_amount                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  igst_rate                   NUMERIC(5,2) NOT NULL DEFAULT 0,
  igst_amount                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  cess_rate                   NUMERIC(5,2) NOT NULL DEFAULT 0,
  cess_amount                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount                  NUMERIC(15,2) NOT NULL DEFAULT 0,
  reverse_charge              BOOLEAN NOT NULL DEFAULT FALSE,
  total_amount                NUMERIC(15,2) NOT NULL DEFAULT 0,
  advance_percent             NUMERIC(5,2) NOT NULL DEFAULT 0,
  advance_amount              NUMERIC(15,2) NOT NULL DEFAULT 0,
  retention_percent           NUMERIC(5,2) NOT NULL DEFAULT 0,
  retention_amount            NUMERIC(15,2) NOT NULL DEFAULT 0,
  tds_applicable              BOOLEAN NOT NULL DEFAULT FALSE,
  tds_section                 VARCHAR(20),
  tds_rate                    NUMERIC(5,2) NOT NULL DEFAULT 0,
  tds_amount                  NUMERIC(15,2) NOT NULL DEFAULT 0,
  estimated_budget            NUMERIC(15,2),
  cost_centre                 VARCHAR(100),
  -- Scheduling (optional)
  schedule_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
  schedule_type               VARCHAR(20),
  -- Tracked totals
  accepted_amount             NUMERIC(15,2) NOT NULL DEFAULT 0,
  invoiced_amount             NUMERIC(15,2) NOT NULL DEFAULT 0,
  invoice_status              VARCHAR(20) NOT NULL DEFAULT 'NOT_INVOICED',
  -- Audit
  version                     INT NOT NULL DEFAULT 0,
  cancel_reason               TEXT,
  created_by                  VARCHAR(150) NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_by                 VARCHAR(150) NOT NULL,
  modified_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_spo_status CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','ISSUED','PARTIALLY_FULFILLED','FULFILLED','ON_HOLD','CANCELLED','CLOSED')),
  CONSTRAINT ck_spo_amounts CHECK (basic_amount >= 0 AND taxable_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0
                                   AND accepted_amount >= 0 AND invoiced_amount >= 0),
  CONSTRAINT ck_spo_validity CHECK (validity_end >= po_date AND (validity_start IS NULL OR validity_end >= validity_start)),
  CONSTRAINT ck_spo_service_dates CHECK (service_completion_date IS NULL OR service_start_date IS NULL OR service_completion_date >= service_start_date),
  CONSTRAINT ck_spo_pct CHECK (advance_percent BETWEEN 0 AND 100 AND retention_percent BETWEEN 0 AND 100),
  CONSTRAINT ck_spo_supply CHECK (supply_type IN ('INTRA','INTER')),
  CONSTRAINT ck_spo_taxability CHECK (gst_taxability IN ('TAXABLE','EXEMPT','NIL_RATED','NON_GST'))
);

CREATE INDEX IF NOT EXISTS idx_spo_status ON public.service_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_spo_vendor ON public.service_purchase_orders(vendor_code);
CREATE INDEX IF NOT EXISTS idx_spo_dept ON public.service_purchase_orders(department_code);
CREATE INDEX IF NOT EXISTS idx_spo_category ON public.service_purchase_orders(service_category);
CREATE INDEX IF NOT EXISTS idx_spo_date ON public.service_purchase_orders(po_date);

-- Planned occurrences (recurring) or milestones. Planning rows only: no POs or invoices are generated from them.
CREATE TABLE IF NOT EXISTS public.service_po_schedules (
  id                    BIGSERIAL PRIMARY KEY,
  service_po_id         BIGINT NOT NULL REFERENCES public.service_purchase_orders(id) ON DELETE CASCADE,
  sequence_no           INT NOT NULL,
  schedule_type         VARCHAR(20) NOT NULL,
  scheduled_date        DATE,
  due_date              DATE,
  planned_quantity      NUMERIC(15,3),
  planned_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  milestone_description TEXT,
  status                VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
  acceptance_status     VARCHAR(20) NOT NULL DEFAULT 'NOT_ACCEPTED',
  CONSTRAINT uq_spo_schedule_seq UNIQUE (service_po_id, sequence_no),
  CONSTRAINT ck_spo_schedule_amt CHECK (planned_amount >= 0)
);

-- Service Acceptance / Service Entry Sheet. Never touches stock or inventory_transaction.
CREATE TABLE IF NOT EXISTS public.service_po_acceptances (
  id                    BIGSERIAL PRIMARY KEY,
  acceptance_number     VARCHAR(30) NOT NULL UNIQUE,
  service_po_id         BIGINT NOT NULL REFERENCES public.service_purchase_orders(id),
  schedule_id           BIGINT REFERENCES public.service_po_schedules(id),
  acceptance_date       DATE NOT NULL,
  service_performed     TEXT NOT NULL,
  completed_quantity    NUMERIC(15,3),
  completed_hours       NUMERIC(10,2),
  completed_visits      INT,
  accepted_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  rejected_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  result                VARCHAR(20) NOT NULL,
  remarks               TEXT,
  accepted_by           VARCHAR(150) NOT NULL,
  accepted_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_spo_acc_result CHECK (result IN ('ACCEPTED','PARTIALLY_ACCEPTED','REJECTED')),
  CONSTRAINT ck_spo_acc_amt CHECK (accepted_amount >= 0 AND rejected_amount >= 0)
);
-- A scheduled occurrence or milestone can be accepted only once (duplicate acceptance guard).
CREATE UNIQUE INDEX IF NOT EXISTS uq_spo_acc_schedule ON public.service_po_acceptances(schedule_id)
  WHERE schedule_id IS NOT NULL AND result <> 'REJECTED';
CREATE INDEX IF NOT EXISTS idx_spo_acc_po ON public.service_po_acceptances(service_po_id);

-- Invoice verification against PO and accepted service. No GRN involved.
CREATE TABLE IF NOT EXISTS public.service_po_invoices (
  id                    BIGSERIAL PRIMARY KEY,
  service_po_id         BIGINT NOT NULL REFERENCES public.service_purchase_orders(id),
  acceptance_id         BIGINT REFERENCES public.service_po_acceptances(id),
  vendor_code           VARCHAR(50) NOT NULL,
  invoice_number        VARCHAR(100) NOT NULL,
  invoice_date          DATE NOT NULL,
  taxable_amount        NUMERIC(15,2) NOT NULL,
  tax_amount            NUMERIC(15,2) NOT NULL,
  total_amount          NUMERIC(15,2) NOT NULL,
  recorded_by           VARCHAR(150) NOT NULL,
  recorded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_spo_invoice_vendor UNIQUE (vendor_code, invoice_number),
  CONSTRAINT ck_spo_inv_amt CHECK (taxable_amount > 0 AND tax_amount >= 0 AND total_amount > 0)
);

-- Unified status / approval / audit trail. Approvals are rows with action APPROVE or REJECT.
CREATE TABLE IF NOT EXISTS public.service_po_status_history (
  id                    BIGSERIAL PRIMARY KEY,
  service_po_id         BIGINT NOT NULL REFERENCES public.service_purchase_orders(id),
  action                VARCHAR(30) NOT NULL,
  from_status           VARCHAR(30),
  to_status             VARCHAR(30),
  actor                 VARCHAR(150) NOT NULL,
  actor_role            VARCHAR(30) NOT NULL,
  comments              TEXT,
  acted_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_spo_hist_po ON public.service_po_status_history(service_po_id);

CREATE TABLE IF NOT EXISTS public.service_po_validity_history (
  id                    BIGSERIAL PRIMARY KEY,
  service_po_id         BIGINT NOT NULL REFERENCES public.service_purchase_orders(id),
  old_validity_end      DATE NOT NULL,
  new_validity_end      DATE NOT NULL,
  reason                TEXT NOT NULL,
  changed_by            VARCHAR(150) NOT NULL,
  changed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_po_revisions (
  id                    BIGSERIAL PRIMARY KEY,
  service_po_id         BIGINT NOT NULL REFERENCES public.service_purchase_orders(id),
  revision_number       INT NOT NULL,
  reason                TEXT NOT NULL,
  changes_json          TEXT NOT NULL,
  changed_by            VARCHAR(150) NOT NULL,
  changed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_spo_revision UNIQUE (service_po_id, revision_number)
);

CREATE TABLE IF NOT EXISTS public.service_po_attachments (
  id                    BIGSERIAL PRIMARY KEY,
  service_po_id         BIGINT NOT NULL REFERENCES public.service_purchase_orders(id) ON DELETE CASCADE,
  doc_type              VARCHAR(30) NOT NULL DEFAULT 'SUPPORTING',
  file_name             VARCHAR(255) NOT NULL,
  content_type          VARCHAR(100) NOT NULL,
  size_bytes            INT NOT NULL,
  content               BYTEA NOT NULL,
  uploaded_by           VARCHAR(150) NOT NULL,
  uploaded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_spo_att_po ON public.service_po_attachments(service_po_id);

-- =============================================================================
-- CAPITAL PURCHASE ORDER (CAPEX) — separate from Standard PO and Service PO.
-- Receipts never touch the ordinary inventory tables; fixed assets go to asset_master.
-- =============================================================================

-- Sub-groups of the "Assets" group. New rows appear in the Capital PO dropdown automatically.
-- treatment: FIXED_ASSET (registered in asset_master) or INVENTORY (policy per company; not posted to stock here).
CREATE TABLE IF NOT EXISTS public.capital_po_asset_categories (
  id           BIGSERIAL PRIMARY KEY,
  parent_group VARCHAR(100) NOT NULL DEFAULT 'Assets',
  name         VARCHAR(150) NOT NULL,
  treatment    VARCHAR(20) NOT NULL DEFAULT 'FIXED_ASSET',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_capex_category UNIQUE (parent_group, name),
  CONSTRAINT ck_capex_treatment CHECK (treatment IN ('FIXED_ASSET', 'INVENTORY'))
);

INSERT INTO public.capital_po_asset_categories (parent_group, name, sort_order) VALUES
  ('Assets', 'Plant & Machinery', 1),
  ('Assets', 'Moulds & Dies', 2),
  ('Assets', 'Electrical Equipment', 3),
  ('Assets', 'IT Equipment', 4),
  ('Assets', 'Low Valued Assets', 5),
  ('Assets', 'Low Valued - Lab Equipment', 6)
ON CONFLICT (parent_group, name) DO NOTHING;

CREATE SEQUENCE IF NOT EXISTS public.capital_po_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.capital_receipt_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.asset_code_seq START 1;

CREATE TABLE IF NOT EXISTS public.capital_purchase_orders (
  id                          BIGSERIAL PRIMARY KEY,
  po_number                   VARCHAR(30) NOT NULL UNIQUE,
  client_request_id           VARCHAR(100) UNIQUE,              -- duplicate-submission guard
  po_type                     VARCHAR(20) NOT NULL DEFAULT 'CAPITAL',
  po_date                     DATE NOT NULL,
  -- Lifecycle (PO approval / dispatch). Physical and installation progress are separate columns below.
  status                      VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  receipt_status              VARCHAR(30) NOT NULL DEFAULT 'NOT_RECEIVED',
  installation_status         VARCHAR(30) NOT NULL DEFAULT 'NOT_REQUIRED',
  commissioning_status        VARCHAR(30) NOT NULL DEFAULT 'NOT_REQUIRED',
  asset_registration_status   VARCHAR(30) NOT NULL DEFAULT 'NOT_REGISTERED',
  -- Vendor snapshot (copied from supplier_master by the backend)
  vendor_code                 VARCHAR(50) NOT NULL,
  vendor_name                 VARCHAR(255) NOT NULL,
  vendor_address              TEXT,
  vendor_gstin                VARCHAR(20),
  vendor_pan                  VARCHAR(20),
  vendor_state                VARCHAR(100),
  vendor_state_code           VARCHAR(5),
  -- Company / supply
  company_gstin               VARCHAR(20),
  company_state_code          VARCHAR(5) NOT NULL,
  place_of_supply_state_code  VARCHAR(5) NOT NULL,
  supply_type                 VARCHAR(10) NOT NULL,
  department_code             VARCHAR(50),
  department_name             VARCHAR(255),
  requester                   VARCHAR(150) NOT NULL,
  plant_location              VARCHAR(255) NOT NULL,
  delivery_address            TEXT,
  pr_number                   VARCHAR(50),
  quotation_reference         VARCHAR(100),
  rfq_reference               VARCHAR(100),
  contract_reference          VARCHAR(100),
  currency                    VARCHAR(10) NOT NULL DEFAULT 'INR',
  validity_end                DATE NOT NULL,
  expected_delivery_date      DATE,
  payment_terms               VARCHAR(255),
  delivery_terms              VARCHAR(255),
  warranty_terms              TEXT,
  remarks                     TEXT,
  -- Additional charges (freight, installation, other) and the SAC they are taxed under
  shipping_installation_charges NUMERIC(15,2) NOT NULL DEFAULT 0,
  freight_other_charges       NUMERIC(15,2) NOT NULL DEFAULT 0,
  charges_sac_code            VARCHAR(20),
  charges_gst_rate            NUMERIC(5,2) NOT NULL DEFAULT 0,
  charges_taxable             NUMERIC(15,2) NOT NULL DEFAULT 0,
  charges_gst_amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  -- Totals (all calculated on the backend)
  lines_gross                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  lines_discount              NUMERIC(15,2) NOT NULL DEFAULT 0,
  lines_taxable               NUMERIC(15,2) NOT NULL DEFAULT 0,
  taxable_total               NUMERIC(15,2) NOT NULL DEFAULT 0,
  cgst_total                  NUMERIC(15,2) NOT NULL DEFAULT 0,
  sgst_total                  NUMERIC(15,2) NOT NULL DEFAULT 0,
  igst_total                  NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_total                   NUMERIC(15,2) NOT NULL DEFAULT 0,
  grand_total                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  advance_percent             NUMERIC(5,2) NOT NULL DEFAULT 0,
  advance_amount              NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_payable              NUMERIC(15,2) NOT NULL DEFAULT 0,
  schedule_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
  version                     INT NOT NULL DEFAULT 0,
  cancel_reason               TEXT,
  created_by                  VARCHAR(150) NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_by                 VARCHAR(150) NOT NULL,
  modified_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_cpo_status CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','SENT_TO_VENDOR','CLOSED','CANCELLED')),
  CONSTRAINT ck_cpo_receipt CHECK (receipt_status IN ('NOT_RECEIVED','PARTIALLY_RECEIVED','FULLY_RECEIVED')),
  CONSTRAINT ck_cpo_supply CHECK (supply_type IN ('INTRA','INTER')),
  CONSTRAINT ck_cpo_validity CHECK (validity_end >= po_date),
  CONSTRAINT ck_cpo_amounts CHECK (grand_total >= 0 AND taxable_total >= 0 AND tax_total >= 0 AND advance_percent BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS idx_cpo_status ON public.capital_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_cpo_vendor ON public.capital_purchase_orders(vendor_code);
CREATE INDEX IF NOT EXISTS idx_cpo_dept ON public.capital_purchase_orders(department_code);
CREATE INDEX IF NOT EXISTS idx_cpo_pr ON public.capital_purchase_orders(pr_number);
CREATE INDEX IF NOT EXISTS idx_cpo_date ON public.capital_purchase_orders(po_date);

CREATE TABLE IF NOT EXISTS public.capital_po_lines (
  id                          BIGSERIAL PRIMARY KEY,
  capital_po_id               BIGINT NOT NULL REFERENCES public.capital_purchase_orders(id) ON DELETE CASCADE,
  line_no                     INT NOT NULL,
  asset_category              VARCHAR(150) NOT NULL,
  asset_name                  VARCHAR(255) NOT NULL,
  asset_description           TEXT NOT NULL,
  asset_code_ref              VARCHAR(100),
  manufacturer                VARCHAR(150),
  model_number                VARCHAR(100),
  technical_specs             TEXT,
  quantity                    NUMERIC(15,3) NOT NULL,
  uom                         VARCHAR(30) NOT NULL,
  unit_price                  NUMERIC(15,2) NOT NULL,
  discount_type               VARCHAR(10) NOT NULL DEFAULT 'NONE',
  discount_value              NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount             NUMERIC(15,2) NOT NULL DEFAULT 0,
  taxable_value               NUMERIC(15,2) NOT NULL,
  hsn_code                    VARCHAR(20) NOT NULL,
  hsn_description             VARCHAR(255),
  gst_rate                    NUMERIC(5,2) NOT NULL,
  cgst_amount                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  sgst_amount                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  igst_amount                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  gst_amount                  NUMERIC(15,2) NOT NULL DEFAULT 0,
  line_total                  NUMERIC(15,2) NOT NULL,
  expected_delivery_date      DATE,
  delivery_location           VARCHAR(255),
  installation_required       BOOLEAN NOT NULL DEFAULT FALSE,
  commissioning_required      BOOLEAN NOT NULL DEFAULT FALSE,
  warranty_months             INT NOT NULL DEFAULT 0,
  warranty_start_condition    VARCHAR(30),
  amc_required                BOOLEAN NOT NULL DEFAULT FALSE,
  useful_life_years           INT,
  remarks                     TEXT,
  pr_item_id                  BIGINT REFERENCES public.purchase_requisition_items(id),
  received_qty                NUMERIC(15,3) NOT NULL DEFAULT 0,
  installation_status         VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
  installation_date           DATE,
  installation_remarks        TEXT,
  commissioning_status        VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
  commissioning_date          DATE,
  commissioning_remarks       TEXT,
  responsible_team            VARCHAR(150),
  CONSTRAINT uq_capex_line_no UNIQUE (capital_po_id, line_no),
  CONSTRAINT ck_capex_line_qty CHECK (quantity > 0 AND unit_price >= 0 AND discount_amount >= 0 AND taxable_value >= 0),
  CONSTRAINT ck_capex_line_received CHECK (received_qty >= 0 AND received_qty <= quantity),
  CONSTRAINT ck_capex_line_install CHECK (installation_status IN ('NOT_STARTED','IN_PROGRESS','COMPLETED','NOT_REQUIRED')),
  CONSTRAINT ck_capex_line_commission CHECK (commissioning_status IN ('NOT_STARTED','IN_PROGRESS','COMPLETED','NOT_REQUIRED'))
);
CREATE INDEX IF NOT EXISTS idx_capex_line_po ON public.capital_po_lines(capital_po_id);

-- One-time / multiple deliveries, installation, commissioning and payment milestones. Planning only.
CREATE TABLE IF NOT EXISTS public.capital_po_schedules (
  id                          BIGSERIAL PRIMARY KEY,
  capital_po_id               BIGINT NOT NULL REFERENCES public.capital_purchase_orders(id) ON DELETE CASCADE,
  line_id                     BIGINT REFERENCES public.capital_po_lines(id) ON DELETE CASCADE,
  schedule_type               VARCHAR(20) NOT NULL,
  sequence_no                 INT NOT NULL,
  planned_date                DATE,
  planned_qty                 NUMERIC(15,3),
  planned_amount              NUMERIC(15,2) NOT NULL DEFAULT 0,
  trigger_event               VARCHAR(30),
  description                 TEXT,
  responsible_department      VARCHAR(150),
  responsible_contact         VARCHAR(150),
  status                      VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
  CONSTRAINT uq_capex_sched UNIQUE (capital_po_id, schedule_type, sequence_no),
  CONSTRAINT ck_capex_sched_type CHECK (schedule_type IN ('DELIVERY','INSTALLATION','COMMISSIONING','PAYMENT')),
  CONSTRAINT ck_capex_sched_amt CHECK (planned_amount >= 0)
);

-- Receipts (physical). A receipt is one delivery against the PO.
CREATE TABLE IF NOT EXISTS public.capital_po_receipts (
  id                          BIGSERIAL PRIMARY KEY,
  receipt_number              VARCHAR(30) NOT NULL UNIQUE,
  capital_po_id               BIGINT NOT NULL REFERENCES public.capital_purchase_orders(id),
  idempotency_key             VARCHAR(100) NOT NULL,
  receipt_date                DATE NOT NULL,
  vendor_code                 VARCHAR(50) NOT NULL,
  delivery_challan_no         VARCHAR(100) NOT NULL,
  invoice_reference           VARCHAR(100),
  received_condition          VARCHAR(20) NOT NULL,
  inspection_status           VARCHAR(20) NOT NULL DEFAULT 'NOT_REQUIRED',
  remarks                     TEXT,
  received_by                 VARCHAR(150) NOT NULL,
  received_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_capex_receipt_idem UNIQUE (capital_po_id, idempotency_key),
  CONSTRAINT ck_capex_receipt_condition CHECK (received_condition IN ('GOOD','DAMAGED','PARTIAL')),
  CONSTRAINT ck_capex_receipt_inspection CHECK (inspection_status IN ('NOT_REQUIRED','PENDING','PASSED','FAILED'))
);

CREATE TABLE IF NOT EXISTS public.capital_po_receipt_lines (
  id                          BIGSERIAL PRIMARY KEY,
  receipt_id                  BIGINT NOT NULL REFERENCES public.capital_po_receipts(id) ON DELETE CASCADE,
  po_line_id                  BIGINT NOT NULL REFERENCES public.capital_po_lines(id),
  qty_received                NUMERIC(15,3) NOT NULL,
  serial_numbers              TEXT,
  CONSTRAINT uq_capex_receipt_line UNIQUE (receipt_id, po_line_id),
  CONSTRAINT ck_capex_receipt_qty CHECK (qty_received > 0)
);

-- Fixed asset register (minimal; created only by controlled asset registration).
CREATE TABLE IF NOT EXISTS public.asset_master (
  id                          BIGSERIAL PRIMARY KEY,
  asset_code                  VARCHAR(30) NOT NULL UNIQUE,
  asset_name                  VARCHAR(255) NOT NULL,
  asset_category              VARCHAR(150) NOT NULL,
  asset_description           TEXT,
  manufacturer                VARCHAR(150),
  model_number                VARCHAR(100),
  serial_number               VARCHAR(150),
  plant_location              VARCHAR(255),
  department_code             VARCHAR(50),
  department_name             VARCHAR(255),
  capital_po_id               BIGINT NOT NULL REFERENCES public.capital_purchase_orders(id),
  capital_po_line_id          BIGINT NOT NULL REFERENCES public.capital_po_lines(id),
  receipt_line_id             BIGINT NOT NULL REFERENCES public.capital_po_receipt_lines(id),
  unit_no                     INT NOT NULL,
  capitalization_date         DATE NOT NULL,
  useful_life_years           INT,
  warranty_months             INT,
  warranty_start_condition    VARCHAR(30),
  status                      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  registered_by               VARCHAR(150) NOT NULL,
  registered_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_asset_receipt_unit UNIQUE (receipt_line_id, unit_no)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_serial ON public.asset_master(serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_asset_po ON public.asset_master(capital_po_id);

CREATE TABLE IF NOT EXISTS public.capital_po_history (
  id                          BIGSERIAL PRIMARY KEY,
  capital_po_id               BIGINT NOT NULL REFERENCES public.capital_purchase_orders(id),
  action                      VARCHAR(30) NOT NULL,
  from_status                 VARCHAR(30),
  to_status                   VARCHAR(30),
  actor                       VARCHAR(150) NOT NULL,
  actor_role                  VARCHAR(30) NOT NULL,
  comments                    TEXT,
  acted_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cpo_hist_po ON public.capital_po_history(capital_po_id);

CREATE TABLE IF NOT EXISTS public.capital_po_validity_history (
  id                          BIGSERIAL PRIMARY KEY,
  capital_po_id               BIGINT NOT NULL REFERENCES public.capital_purchase_orders(id),
  old_validity_end            DATE NOT NULL,
  new_validity_end            DATE NOT NULL,
  reason                      TEXT NOT NULL,
  changed_by                  VARCHAR(150) NOT NULL,
  changed_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Amendments are proposals. Approved PO values change only when a proposal is approved.
CREATE TABLE IF NOT EXISTS public.capital_po_amendments (
  id                          BIGSERIAL PRIMARY KEY,
  capital_po_id               BIGINT NOT NULL REFERENCES public.capital_purchase_orders(id),
  revision_no                 INT NOT NULL,
  status                      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  reason                      TEXT NOT NULL,
  payload_json                TEXT NOT NULL,
  changes_json                TEXT NOT NULL,
  proposed_by                 VARCHAR(150) NOT NULL,
  proposed_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_by                  VARCHAR(150),
  decided_at                  TIMESTAMPTZ,
  decision_comments           TEXT,
  CONSTRAINT uq_capex_amendment UNIQUE (capital_po_id, revision_no),
  CONSTRAINT ck_capex_amendment_status CHECK (status IN ('PENDING','APPROVED','REJECTED'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_capex_amendment_pending ON public.capital_po_amendments(capital_po_id) WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS public.capital_po_attachments (
  id                          BIGSERIAL PRIMARY KEY,
  capital_po_id               BIGINT NOT NULL REFERENCES public.capital_purchase_orders(id) ON DELETE CASCADE,
  line_id                     BIGINT REFERENCES public.capital_po_lines(id) ON DELETE CASCADE,
  receipt_id                  BIGINT REFERENCES public.capital_po_receipts(id) ON DELETE CASCADE,
  doc_type                    VARCHAR(30) NOT NULL DEFAULT 'OTHER',
  file_name                   VARCHAR(255) NOT NULL,
  content_type                VARCHAR(100) NOT NULL,
  size_bytes                  INT NOT NULL,
  content                     BYTEA NOT NULL,
  uploaded_by                 VARCHAR(150) NOT NULL,
  uploaded_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_capex_att_po ON public.capital_po_attachments(capital_po_id);

-- =============================================================================
-- JOB WORK (subcontracting) — Phase 1
-- Company stock moves through the existing inventory engine (inventory_transaction).
-- Virtual locations: "External Job Work" (material with outside workers) and "Quality Hold"
-- (received material awaiting inspection). Existing Store, Rejection Store and Rework-Burning
-- departments receive inspected material. The job-worker-wise ledger below sits on top.
-- =============================================================================

INSERT INTO public.department_master (dept_code, dept_number, department_name, process_sequence, category, status, notes)
SELECT 'JW-EXT', NULL, 'External Job Work', 0, 'JOB WORK', 'ACTIVE', 'Virtual location: material held by external job workers'
WHERE NOT EXISTS (SELECT 1 FROM public.department_master WHERE department_name = 'External Job Work');

INSERT INTO public.department_master (dept_code, dept_number, department_name, process_sequence, category, status, notes)
SELECT 'QH-HOLD', NULL, 'Quality Hold', 0, 'QUALITY', 'ACTIVE', 'Virtual location: received job work material awaiting inspection'
WHERE NOT EXISTS (SELECT 1 FROM public.department_master WHERE department_name = 'Quality Hold');

CREATE TABLE IF NOT EXISTS public.job_work_operations (
  id              BIGSERIAL PRIMARY KEY,
  operation_name  VARCHAR(100) NOT NULL UNIQUE,
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.job_work_operations (operation_name) VALUES
  ('CNC'), ('Machining'), ('Grinding'), ('Moulding'), ('Coating'), ('Heat Treatment'), ('Finishing'), ('Turning'), ('Plating'), ('Other')
ON CONFLICT (operation_name) DO NOTHING;

CREATE SEQUENCE IF NOT EXISTS public.job_work_number_seq START 1;

-- Job worker = an existing supplier_master record that is approved for job work.
CREATE TABLE IF NOT EXISTS public.job_workers (
  id                    BIGSERIAL PRIMARY KEY,
  worker_code           VARCHAR(30) NOT NULL UNIQUE,
  supplier_code         VARCHAR(50) NOT NULL UNIQUE REFERENCES public.supplier_master(supplier_code),
  legal_name            VARCHAR(255) NOT NULL,
  contact_person        VARCHAR(255),
  phone                 VARCHAR(50),
  email                 VARCHAR(255),
  registered_address    TEXT,
  work_location         VARCHAR(255),
  gstin                 VARCHAR(20) UNIQUE,
  pan                   VARCHAR(20),
  payment_terms         VARCHAR(255),
  credit_days           INT NOT NULL DEFAULT 30,
  status                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  blocked_reason        TEXT,
  created_by            VARCHAR(150) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_by           VARCHAR(150) NOT NULL,
  modified_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_job_worker_status CHECK (status IN ('ACTIVE','INACTIVE','BLOCKED')),
  CONSTRAINT ck_job_worker_credit CHECK (credit_days >= 0)
);

CREATE TABLE IF NOT EXISTS public.job_worker_operations (
  job_worker_id         BIGINT NOT NULL REFERENCES public.job_workers(id) ON DELETE CASCADE,
  operation_id          BIGINT NOT NULL REFERENCES public.job_work_operations(id),
  PRIMARY KEY (job_worker_id, operation_id)
);

CREATE TABLE IF NOT EXISTS public.job_work_rate_contracts (
  id                    BIGSERIAL PRIMARY KEY,
  job_worker_id         BIGINT NOT NULL REFERENCES public.job_workers(id),
  operation_id          BIGINT NOT NULL REFERENCES public.job_work_operations(id),
  item_category         VARCHAR(255),                     -- NULL = all categories
  rate_basis            VARCHAR(20) NOT NULL,             -- PER_PIECE / PER_KG / PER_BATCH / PER_HOUR
  rate                  NUMERIC(15,2) NOT NULL,
  min_qty               NUMERIC(15,2) NOT NULL DEFAULT 0,
  effective_from        DATE NOT NULL,
  valid_until           DATE NOT NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE / REVOKED
  created_by            VARCHAR(150) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_jw_rate_basis CHECK (rate_basis IN ('PER_PIECE','PER_KG','PER_BATCH','PER_HOUR')),
  CONSTRAINT ck_jw_rate_positive CHECK (rate > 0 AND min_qty >= 0),
  CONSTRAINT ck_jw_rate_dates CHECK (valid_until >= effective_from)
);
CREATE INDEX IF NOT EXISTS idx_jw_rate_worker ON public.job_work_rate_contracts(job_worker_id, operation_id);

CREATE TABLE IF NOT EXISTS public.job_work_indents (
  id                    BIGSERIAL PRIMARY KEY,
  indent_number         VARCHAR(30) NOT NULL UNIQUE,
  client_request_id     VARCHAR(100) UNIQUE,
  indent_date           DATE NOT NULL,
  requesting_department_id BIGINT NOT NULL REFERENCES public.department_master(id),
  requester             VARCHAR(150) NOT NULL,
  source_department_id  BIGINT NOT NULL REFERENCES public.department_master(id),
  status                VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  reason                TEXT NOT NULL,
  required_dispatch_date DATE,
  required_return_date  DATE,
  production_ref        VARCHAR(100),
  preferred_job_worker_id BIGINT REFERENCES public.job_workers(id),
  estimated_cost        NUMERIC(15,2) NOT NULL DEFAULT 0,
  remarks               TEXT,
  rejection_reason      TEXT,
  version               INT NOT NULL DEFAULT 0,
  created_by            VARCHAR(150) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_by           VARCHAR(150) NOT NULL,
  modified_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_jw_indent_status CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED'))
);

CREATE TABLE IF NOT EXISTS public.job_work_indent_lines (
  id                    BIGSERIAL PRIMARY KEY,
  indent_id             BIGINT NOT NULL REFERENCES public.job_work_indents(id) ON DELETE CASCADE,
  line_no               INT NOT NULL,
  master_id             BIGINT NOT NULL REFERENCES public.master(id),
  item_code             VARCHAR(255) NOT NULL,
  item_name             VARCHAR(500),
  category              VARCHAR(255) NOT NULL,
  uom                   VARCHAR(50),
  required_qty          NUMERIC(15,2) NOT NULL,
  operation_id          BIGINT NOT NULL REFERENCES public.job_work_operations(id),
  remarks               TEXT,
  CONSTRAINT uq_jw_indent_line UNIQUE (indent_id, line_no),
  CONSTRAINT ck_jw_indent_qty CHECK (required_qty > 0)
);

CREATE TABLE IF NOT EXISTS public.job_work_orders (
  id                    BIGSERIAL PRIMARY KEY,
  jwo_number            VARCHAR(30) NOT NULL UNIQUE,
  client_request_id     VARCHAR(100) UNIQUE,
  indent_id             BIGINT REFERENCES public.job_work_indents(id),
  job_worker_id         BIGINT NOT NULL REFERENCES public.job_workers(id),
  jwo_date              DATE NOT NULL,
  requesting_department_id BIGINT NOT NULL REFERENCES public.department_master(id),
  source_department_id  BIGINT NOT NULL REFERENCES public.department_master(id),
  status                VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  expected_start_date   DATE,
  expected_completion_date DATE,
  expected_return_date  DATE,
  payment_terms         VARCHAR(255),
  quality_specs         TEXT,
  delivery_terms        TEXT,
  rejection_terms       TEXT,
  remarks               TEXT,
  estimated_charges     NUMERIC(15,2) NOT NULL DEFAULT 0,
  rejection_reason      TEXT,
  cancel_reason         TEXT,
  version               INT NOT NULL DEFAULT 0,
  created_by            VARCHAR(150) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_by           VARCHAR(150) NOT NULL,
  modified_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_jwo_status CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','IN_PROGRESS','PARTIALLY_RECEIVED','COMPLETED','CLOSED','CANCELLED')),
  CONSTRAINT ck_jwo_dates CHECK (expected_return_date IS NULL OR expected_return_date >= jwo_date)
);
CREATE INDEX IF NOT EXISTS idx_jwo_worker ON public.job_work_orders(job_worker_id);
CREATE INDEX IF NOT EXISTS idx_jwo_status ON public.job_work_orders(status);

CREATE TABLE IF NOT EXISTS public.job_work_order_lines (
  id                    BIGSERIAL PRIMARY KEY,
  jwo_id                BIGINT NOT NULL REFERENCES public.job_work_orders(id) ON DELETE CASCADE,
  line_no               INT NOT NULL,
  master_id             BIGINT NOT NULL REFERENCES public.master(id),
  item_code             VARCHAR(255) NOT NULL,
  item_name             VARCHAR(500),
  category              VARCHAR(255) NOT NULL,
  uom                   VARCHAR(50),
  operation_id          BIGINT NOT NULL REFERENCES public.job_work_operations(id),
  input_qty             NUMERIC(15,2) NOT NULL,            -- approved quantity to send out
  expected_output_qty   NUMERIC(15,2) NOT NULL,
  rate_contract_id      BIGINT REFERENCES public.job_work_rate_contracts(id),
  rate                  NUMERIC(15,2) NOT NULL DEFAULT 0,
  rate_basis            VARCHAR(20),
  est_charges           NUMERIC(15,2) NOT NULL DEFAULT 0,
  dispatched_qty        NUMERIC(15,2) NOT NULL DEFAULT 0,
  received_qty          NUMERIC(15,2) NOT NULL DEFAULT 0,  -- processed quantity returned by worker
  unused_returned_qty   NUMERIC(15,2) NOT NULL DEFAULT 0,
  accepted_qty          NUMERIC(15,2) NOT NULL DEFAULT 0,
  rejected_qty          NUMERIC(15,2) NOT NULL DEFAULT 0,
  rework_qty            NUMERIC(15,2) NOT NULL DEFAULT 0,
  rework_redispatched_qty NUMERIC(15,2) NOT NULL DEFAULT 0,
  scrap_qty             NUMERIC(15,2) NOT NULL DEFAULT 0,
  remarks               TEXT,
  CONSTRAINT uq_jwo_line UNIQUE (jwo_id, line_no),
  CONSTRAINT ck_jwo_line_qty CHECK (input_qty > 0 AND expected_output_qty >= 0 AND rate >= 0),
  CONSTRAINT ck_jwo_line_dispatch CHECK (dispatched_qty >= 0 AND dispatched_qty <= input_qty),
  CONSTRAINT ck_jwo_line_received CHECK (received_qty >= 0 AND unused_returned_qty >= 0 AND received_qty + unused_returned_qty <= dispatched_qty),
  CONSTRAINT ck_jwo_line_inspected CHECK (accepted_qty + rejected_qty + rework_qty + scrap_qty <= received_qty + 0.001)
);

CREATE TABLE IF NOT EXISTS public.job_work_challans (
  id                    BIGSERIAL PRIMARY KEY,
  challan_number        VARCHAR(30) NOT NULL UNIQUE,
  client_request_id     VARCHAR(100) UNIQUE,
  jwo_id                BIGINT NOT NULL REFERENCES public.job_work_orders(id),
  job_worker_id         BIGINT NOT NULL REFERENCES public.job_workers(id),
  challan_date          DATE NOT NULL,
  source_department_id  BIGINT NOT NULL REFERENCES public.department_master(id),
  destination_location  VARCHAR(255),
  transporter           VARCHAR(150),
  vehicle_no            VARCHAR(50),
  eway_bill_no          VARCHAR(50),
  purpose               VARCHAR(255) NOT NULL DEFAULT 'Job work outward',
  authorized_by         VARCHAR(150) NOT NULL,
  remarks               TEXT,
  status                VARCHAR(20) NOT NULL DEFAULT 'POSTED',   -- POSTED / CANCELLED (reversed)
  cancel_reason         TEXT,
  created_by            VARCHAR(150) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_jwc_status CHECK (status IN ('POSTED','CANCELLED'))
);
CREATE INDEX IF NOT EXISTS idx_jwc_jwo ON public.job_work_challans(jwo_id);

CREATE TABLE IF NOT EXISTS public.job_work_challan_lines (
  id                    BIGSERIAL PRIMARY KEY,
  challan_id            BIGINT NOT NULL REFERENCES public.job_work_challans(id) ON DELETE CASCADE,
  jwo_line_id           BIGINT NOT NULL REFERENCES public.job_work_order_lines(id),
  master_id             BIGINT NOT NULL REFERENCES public.master(id),
  category              VARCHAR(255) NOT NULL,
  batch_no              VARCHAR(100),
  qty                   NUMERIC(15,2) NOT NULL,
  inventory_transaction_id BIGINT REFERENCES public.inventory_transaction(id),
  reversal_transaction_id  BIGINT REFERENCES public.inventory_transaction(id),
  CONSTRAINT ck_jwc_line_qty CHECK (qty > 0)
);

CREATE TABLE IF NOT EXISTS public.job_work_receipts (
  id                    BIGSERIAL PRIMARY KEY,
  receipt_number        VARCHAR(30) NOT NULL UNIQUE,
  idempotency_key       VARCHAR(100) NOT NULL,
  jwo_id                BIGINT NOT NULL REFERENCES public.job_work_orders(id),
  challan_id            BIGINT REFERENCES public.job_work_challans(id),
  job_worker_id         BIGINT NOT NULL REFERENCES public.job_workers(id),
  receipt_date          DATE NOT NULL,
  delivery_note_no      VARCHAR(100),
  remarks               TEXT,
  received_by           VARCHAR(150) NOT NULL,
  received_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_jwr_idem UNIQUE (jwo_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.job_work_receipt_lines (
  id                    BIGSERIAL PRIMARY KEY,
  receipt_id            BIGINT NOT NULL REFERENCES public.job_work_receipts(id) ON DELETE CASCADE,
  jwo_line_id           BIGINT NOT NULL REFERENCES public.job_work_order_lines(id),
  master_id             BIGINT NOT NULL REFERENCES public.master(id),
  category              VARCHAR(255) NOT NULL,
  qty_received          NUMERIC(15,2) NOT NULL,
  unused_returned_qty   NUMERIC(15,2) NOT NULL DEFAULT 0,
  inspection_status     VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING / INSPECTED
  accepted_qty          NUMERIC(15,2),
  rejected_qty          NUMERIC(15,2),
  rework_qty            NUMERIC(15,2),
  scrap_qty             NUMERIC(15,2),
  defect_code           VARCHAR(50),
  inspection_remarks    TEXT,
  inspected_by          VARCHAR(150),
  inspected_at          TIMESTAMPTZ,
  receive_transaction_id   BIGINT REFERENCES public.inventory_transaction(id),
  unused_transaction_id    BIGINT REFERENCES public.inventory_transaction(id),
  CONSTRAINT ck_jwr_line_qty CHECK (qty_received >= 0 AND unused_returned_qty >= 0),
  CONSTRAINT ck_jwr_line_status CHECK (inspection_status IN ('PENDING','INSPECTED')),
  CONSTRAINT ck_jwr_line_disposition CHECK (
    inspection_status = 'PENDING' OR (accepted_qty >= 0 AND rejected_qty >= 0 AND rework_qty >= 0 AND scrap_qty >= 0
      AND accepted_qty + rejected_qty + rework_qty + scrap_qty = qty_received))
);

-- Job-worker-wise ledger. Every movement is a row; the running balance per worker/item is never edited.
CREATE TABLE IF NOT EXISTS public.job_work_stock_ledger (
  id                    BIGSERIAL PRIMARY KEY,
  job_worker_id         BIGINT NOT NULL REFERENCES public.job_workers(id),
  jwo_id                BIGINT NOT NULL REFERENCES public.job_work_orders(id),
  jwo_line_id           BIGINT NOT NULL REFERENCES public.job_work_order_lines(id),
  master_id             BIGINT NOT NULL REFERENCES public.master(id),
  category              VARCHAR(255) NOT NULL,
  movement_type         VARCHAR(30) NOT NULL,   -- SENT / RECEIVED / RETURNED_UNUSED / REVERSED_SENT
  qty                   NUMERIC(15,2) NOT NULL, -- signed: + material with worker, - material back
  balance_after         NUMERIC(15,2) NOT NULL,
  reference_no          VARCHAR(50) NOT NULL,
  challan_id            BIGINT REFERENCES public.job_work_challans(id),
  receipt_id            BIGINT REFERENCES public.job_work_receipts(id),
  inventory_transaction_id BIGINT REFERENCES public.inventory_transaction(id),
  created_by            VARCHAR(150) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_jwl_nonzero CHECK (qty <> 0),
  CONSTRAINT ck_jwl_balance CHECK (balance_after >= 0)
);
CREATE INDEX IF NOT EXISTS idx_jwl_worker_item ON public.job_work_stock_ledger(job_worker_id, master_id, category);

-- Approval and status history for indents, orders, challans, receipts and workers.
CREATE TABLE IF NOT EXISTS public.job_work_history (
  id                    BIGSERIAL PRIMARY KEY,
  entity_type           VARCHAR(30) NOT NULL,   -- INDENT / JWO / CHALLAN / RECEIPT / WORKER
  entity_id             BIGINT NOT NULL,
  action                VARCHAR(40) NOT NULL,
  from_status           VARCHAR(40),
  to_status             VARCHAR(40),
  actor                 VARCHAR(150) NOT NULL,
  actor_role            VARCHAR(30) NOT NULL,
  comments              TEXT,
  acted_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_hist_entity ON public.job_work_history(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.job_work_attachments (
  id                    BIGSERIAL PRIMARY KEY,
  entity_type           VARCHAR(30) NOT NULL,
  entity_id             BIGINT NOT NULL,
  doc_type              VARCHAR(40) NOT NULL DEFAULT 'OTHER',
  file_name             VARCHAR(255) NOT NULL,
  content_type          VARCHAR(100) NOT NULL,
  size_bytes            INT NOT NULL,
  content               BYTEA NOT NULL,
  uploaded_by           VARCHAR(150) NOT NULL,
  uploaded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Job work: a challan dispatched from the Rework store re-sends rejected/rework material.
ALTER TABLE public.job_work_challans ADD COLUMN IF NOT EXISTS rework_dispatch BOOLEAN NOT NULL DEFAULT FALSE;

-- Job work: re-dispatched rework goes out again, so what a worker may return includes re-dispatched rework.
ALTER TABLE public.job_work_order_lines DROP CONSTRAINT IF EXISTS ck_jwo_line_received;
ALTER TABLE public.job_work_order_lines ADD CONSTRAINT ck_jwo_line_received
  CHECK (received_qty >= 0 AND unused_returned_qty >= 0 AND received_qty + unused_returned_qty <= dispatched_qty + rework_redispatched_qty);

-- =============================================================================
-- JOB WORK — Phase 2: reconciliation, scrap disposal, write-offs, permissible loss
-- =============================================================================

INSERT INTO public.department_master (dept_code, dept_number, department_name, process_sequence, category, status, notes)
SELECT 'SCRAP-YD', NULL, 'Scrap Yard', 0, 'SCRAP', 'ACTIVE', 'Location for disposed scrap (after approval)'
WHERE NOT EXISTS (SELECT 1 FROM public.department_master WHERE department_name = 'Scrap Yard');

-- Quantity of an order line written off after an approved shortage or process-loss adjustment.
ALTER TABLE public.job_work_order_lines ADD COLUMN IF NOT EXISTS written_off_qty NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.job_work_order_lines DROP CONSTRAINT IF EXISTS ck_jwo_line_received;
ALTER TABLE public.job_work_order_lines ADD CONSTRAINT ck_jwo_line_received
  CHECK (received_qty >= 0 AND unused_returned_qty >= 0 AND written_off_qty >= 0
         AND received_qty + unused_returned_qty + written_off_qty <= dispatched_qty + rework_redispatched_qty);

-- Permissible process loss, as a percentage of dispatched quantity, per operation (and optional category).
CREATE TABLE IF NOT EXISTS public.job_work_loss_policy (
  id                    BIGSERIAL PRIMARY KEY,
  operation_id          BIGINT NOT NULL REFERENCES public.job_work_operations(id),
  category              VARCHAR(255),
  permissible_pct       NUMERIC(6,2) NOT NULL,
  effective_from        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by            VARCHAR(150) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_jw_loss_pct CHECK (permissible_pct >= 0 AND permissible_pct <= 100)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_jw_loss_policy ON public.job_work_loss_policy(operation_id, COALESCE(category, ''));

-- Adjustments need approval. SCRAP_DISPOSAL moves stock from Rejection Store to Scrap Yard.
-- SHORTAGE and PROCESS_LOSS write off what the worker still holds (no stock is created or moved).
CREATE TABLE IF NOT EXISTS public.job_work_adjustments (
  id                    BIGSERIAL PRIMARY KEY,
  adjustment_number     VARCHAR(30) NOT NULL UNIQUE,
  jwo_id                BIGINT NOT NULL REFERENCES public.job_work_orders(id),
  jwo_line_id           BIGINT NOT NULL REFERENCES public.job_work_order_lines(id),
  job_worker_id         BIGINT NOT NULL REFERENCES public.job_workers(id),
  master_id             BIGINT NOT NULL REFERENCES public.master(id),
  category              VARCHAR(255) NOT NULL,
  adjustment_type       VARCHAR(30) NOT NULL,
  qty                   NUMERIC(15,2) NOT NULL,
  reason                TEXT NOT NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  requested_by          VARCHAR(150) NOT NULL,
  requested_role        VARCHAR(30) NOT NULL,
  requested_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_by            VARCHAR(150),
  decided_at            TIMESTAMPTZ,
  decision_comments     TEXT,
  inventory_transaction_id BIGINT REFERENCES public.inventory_transaction(id),
  CONSTRAINT ck_jw_adj_type CHECK (adjustment_type IN ('SCRAP_DISPOSAL','SHORTAGE','PROCESS_LOSS')),
  CONSTRAINT ck_jw_adj_status CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  CONSTRAINT ck_jw_adj_qty CHECK (qty > 0)
);
CREATE INDEX IF NOT EXISTS idx_jw_adj_line ON public.job_work_adjustments(jwo_line_id, status);

-- New Purchase Order module: Vendor Rate Master (insert-only price history).
-- Rates are never updated or deleted; a new price is a new row with its own effective date.
CREATE TABLE IF NOT EXISTS public.vendor_item_rates (
  id                 BIGSERIAL PRIMARY KEY,
  supplier_code      VARCHAR(50)  NOT NULL REFERENCES public.supplier_master(supplier_code),
  item_id            BIGINT       NOT NULL REFERENCES public.item_master(id),
  offered_unit_price NUMERIC(15,2) NOT NULL,
  effective_from     DATE         NOT NULL,
  created_by         VARCHAR(150) NOT NULL,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_vir_price_positive CHECK (offered_unit_price > 0),
  CONSTRAINT uq_vir_vendor_item_date UNIQUE (supplier_code, item_id, effective_from)
);
CREATE INDEX IF NOT EXISTS idx_vir_lookup ON public.vendor_item_rates(supplier_code, item_id, effective_from DESC);

-- New Purchase Order > PO by PR. One row = the share of one PO line that came from one PR line.
-- PR quantities stay in purchase_requisition_items.ordered_qty (shared with the existing PO flows);
-- this table records the PR origin of each PO quantity and the vendor rate used at the time.
CREATE TABLE IF NOT EXISTS public.po_pr_allocations (
  id              BIGSERIAL PRIMARY KEY,
  po_number       VARCHAR(50)   NOT NULL REFERENCES public.purchase_orders(po_number),
  pr_item_id      BIGINT        NOT NULL REFERENCES public.purchase_requisition_items(id),
  pr_number       VARCHAR(50)   NOT NULL,
  item_code       VARCHAR(100)  NOT NULL,
  allocated_qty   NUMERIC(15,2) NOT NULL,
  unit_price      NUMERIC(15,2) NOT NULL,
  rate_id         BIGINT        NOT NULL REFERENCES public.vendor_item_rates(id),
  created_by      VARCHAR(150)  NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_po_pr_alloc_qty CHECK (allocated_qty > 0),
  CONSTRAINT ck_po_pr_alloc_price CHECK (unit_price > 0),
  CONSTRAINT uq_po_pr_alloc_po_line UNIQUE (po_number, pr_item_id)
);
CREATE INDEX IF NOT EXISTS idx_po_pr_alloc_pr_item ON public.po_pr_allocations(pr_item_id);
CREATE INDEX IF NOT EXISTS idx_po_pr_alloc_po_item ON public.po_pr_allocations(po_number, item_code);

-- Quantity released back to the PR when a PO-by-PR allocation is cancelled. Allocation rows are never deleted:
-- the net reserved quantity of an allocation is allocated_qty - released_qty.
ALTER TABLE public.po_pr_allocations ADD COLUMN IF NOT EXISTS released_qty NUMERIC(15,2) NOT NULL DEFAULT 0;

-- Explicit receipt attribution: which PO-by-PR allocation a POSTED GRN line was received against.
-- Written when the GRN is posted, in the same transaction, and never recomputed afterwards.
-- Legacy GRN lines (PO without allocations) have no rows here and are reported as unattributed.
CREATE TABLE IF NOT EXISTS public.grn_item_allocations (
  id              BIGSERIAL PRIMARY KEY,
  grn_item_id     BIGINT        NOT NULL REFERENCES public.goods_receipt_note_items(id),
  allocation_id   BIGINT        NOT NULL REFERENCES public.po_pr_allocations(id),
  received_qty    NUMERIC(15,2) NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_grn_alloc_qty CHECK (received_qty > 0),
  CONSTRAINT uq_grn_alloc UNIQUE (grn_item_id, allocation_id)
);
CREATE INDEX IF NOT EXISTS idx_grn_alloc_allocation ON public.grn_item_allocations(allocation_id);

-- Audit trail for PO status changes made by PO-by-PR (cancellation). Uses the existing po_revisions table.

-- Fulfilment quantity of an attribution row: the accepted share of the GRN line. Rejected goods are NOT
-- fulfilment. Filled for existing rows by ProcurementMigrations (derived from the GRN line, never invented).
ALTER TABLE public.grn_item_allocations ADD COLUMN IF NOT EXISTS accepted_qty NUMERIC(15,2);

-- PO origin marker for POs created after this change: PO_BY_PR (created through PO by PR) or DIRECT (Direct PO).
-- NULL on older rows, which are classified by their allocation records instead (see ProcurementReportService).
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS po_origin VARCHAR(20);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS expected_delivery DATE;
