-- =============================================================================
-- schema.sql: DDL ONLY (CREATE / ALTER / INDEX / VIEW). Runs on every startup.
-- Reference data lives in seed-data.sql (insert-only). One-time data changes are
-- registered in StartupDataMigrations. Enforced by StartupSafetyGuardTest.
-- =============================================================================
-- Spring Boot runs this automatically on every startup (spring.sql.init.mode=always
-- in application.properties). Safe to re-run — everything is IF NOT EXISTS.
-- You can also run it by hand with psql if you prefer.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- =============================================================================
-- ERP Inventory / Transaction Management Module
-- Consolidated: master → item_master, department → department_master
-- =============================================================================

-- =============================================================================
-- SMS Inventory Module — Item Master
-- =============================================================================
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

-- Upgrades databases whose item_master was created before these columns existed.
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

-- The one place that turns an item_master row into the code / name / uom other modules display and store.
CREATE OR REPLACE VIEW public.item_master_lookup AS
SELECT id,
       COALESCE(NULLIF(sms_new_part_no, ''), NULLIF(main_fg_code, ''), NULLIF(old_code, ''), 'ITM-' || id) AS code,
       COALESCE(NULLIF(description_size, ''), NULLIF(subgroup, ''), 'Item ' || id) AS description,
       category,
       COALESCE(NULLIF(purchased_uom, ''), NULLIF(uom, ''), 'PCS') AS unit_of_measurement
FROM public.item_master;

-- Table 2: department_master
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

-- Table 3: operation_master
CREATE TABLE IF NOT EXISTS public.operation_master (
  id             BIGSERIAL PRIMARY KEY,
  operation_name VARCHAR(255) NOT NULL UNIQUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Table 4: category_master
CREATE TABLE IF NOT EXISTS public.category_master (
  id               BIGSERIAL PRIMARY KEY,
  category_name    VARCHAR(255) NOT NULL UNIQUE,
  bom_consumption VARCHAR(255) DEFAULT '',
  category_code    VARCHAR(100) DEFAULT '',
  short_code       VARCHAR(100) DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

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
-- Supplier Items Mapping Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.supplier_item (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    FOREIGN KEY (supplier_id) REFERENCES public.supplier_master(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES public.item_master(id) ON DELETE CASCADE,
    CONSTRAINT unique_supplier_item UNIQUE(supplier_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_item_supplier ON public.supplier_item(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_item_item ON public.supplier_item(item_id);

-- =============================================================================
-- Customer Master Schema (Book 3 & Book 5 matched attributes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.customer_master (
    id BIGSERIAL PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    customer_code VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_alias VARCHAR(150),
    company_id VARCHAR(50) NOT NULL DEFAULT 'COMP-001',
    customer_type VARCHAR(50) DEFAULT 'OEM',
    domestic_export VARCHAR(50),
    gstin VARCHAR(50),
    pan VARCHAR(30),
    udyam_no VARCHAR(50),
    msme_category VARCHAR(50) DEFAULT 'NOT_MSME',
    gst_registration_type VARCHAR(50) NOT NULL DEFAULT 'REGISTERED',
    check_by_accounts BOOLEAN DEFAULT FALSE,
    check_by_sales BOOLEAN DEFAULT TRUE,
    billing_source VARCHAR(100),
    supplier_code_sms VARCHAR(100),
    contact_person TEXT,
    sales_person VARCHAR(255),
    phone VARCHAR(255),
    sales_contact VARCHAR(150),
    email TEXT,
    sales_email TEXT,
    mode_of_payment_reminder VARCHAR(100),
    accounts_contact_details TEXT,
    payment_terms_id VARCHAR(50) DEFAULT 'PT-30',
    credit_days INTEGER DEFAULT 30,
    credit_limit NUMERIC(15, 2) DEFAULT 500000.00,
    currency VARCHAR(10) DEFAULT 'INR',
    scm VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    bill_to_address TEXT,
    ship_to_address TEXT,
    customer_address TEXT,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    state_code VARCHAR(10),
    country VARCHAR(100) DEFAULT 'India',
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

-- Columns used by the CustomerMaster entity (previously added only by Hibernate ddl-auto=update).
ALTER TABLE public.customer_master ADD COLUMN IF NOT EXISTS customer_category VARCHAR(50);
ALTER TABLE public.customer_master ADD COLUMN IF NOT EXISTS customer_group VARCHAR(50);
ALTER TABLE public.customer_master ADD COLUMN IF NOT EXISTS market_type VARCHAR(50);

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
-- Purchase Module — Purchase Orders (PO Register)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id                      VARCHAR(100) PRIMARY KEY,
    po_number               VARCHAR(50) NOT NULL UNIQUE,
    po_date                 VARCHAR(50) NOT NULL,
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

-- 2. Process Master Table
CREATE TABLE IF NOT EXISTS public.process_master (
    id BIGSERIAL PRIMARY KEY,
    process_code VARCHAR(50) NOT NULL UNIQUE,
    process_description VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);







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

-- Service Acceptance / Service Entry Sheet. Never touches stock.
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

CREATE TABLE IF NOT EXISTS public.job_work_operations (
  id              BIGSERIAL PRIMARY KEY,
  operation_name  VARCHAR(100) NOT NULL UNIQUE,
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  item_master_id        BIGINT NOT NULL REFERENCES public.item_master(id),
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
  item_master_id        BIGINT NOT NULL REFERENCES public.item_master(id),
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
  item_master_id        BIGINT NOT NULL REFERENCES public.item_master(id),
  category              VARCHAR(255) NOT NULL,
  batch_no              VARCHAR(100),
  qty                   NUMERIC(15,2) NOT NULL,
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
  item_master_id        BIGINT NOT NULL REFERENCES public.item_master(id),
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
  receive_transaction_id   BIGINT,   -- legacy: the inventory transaction table was removed
  unused_transaction_id    BIGINT,   -- legacy: the inventory transaction table was removed
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
  item_master_id        BIGINT NOT NULL REFERENCES public.item_master(id),
  category              VARCHAR(255) NOT NULL,
  movement_type         VARCHAR(30) NOT NULL,   -- SENT / RECEIVED / RETURNED_UNUSED / REVERSED_SENT
  qty                   NUMERIC(15,2) NOT NULL, -- signed: + material with worker, - material back
  balance_after         NUMERIC(15,2) NOT NULL,
  reference_no          VARCHAR(50) NOT NULL,
  challan_id            BIGINT REFERENCES public.job_work_challans(id),
  receipt_id            BIGINT REFERENCES public.job_work_receipts(id),
  created_by            VARCHAR(150) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_jwl_nonzero CHECK (qty <> 0),
  CONSTRAINT ck_jwl_balance CHECK (balance_after >= 0)
);
CREATE INDEX IF NOT EXISTS idx_jwl_worker_item ON public.job_work_stock_ledger(job_worker_id, item_master_id, category);

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
  item_master_id        BIGINT NOT NULL REFERENCES public.item_master(id),
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
  inventory_transaction_id BIGINT,   -- legacy: the inventory transaction table was removed
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

-- =============================================================================
-- Item master groups and subgroups (Other Item Master > Groups & Subgroups)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.item_group (
  id                  BIGSERIAL PRIMARY KEY,
  name                VARCHAR(150) NOT NULL UNIQUE,
  code                VARCHAR(30),
  description         TEXT,
  sort_order          INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.item_subgroup (
  id                  BIGSERIAL PRIMARY KEY,
  group_id            BIGINT NOT NULL REFERENCES public.item_group(id) ON DELETE CASCADE,
  name                VARCHAR(150) NOT NULL,
  code                VARCHAR(30),
  description         TEXT,
  sort_order          INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uk_item_subgroup_name UNIQUE (group_id, name)
);

-- =============================================================================
-- Application settings (theme, table column widths, current user). Stored in PostgreSQL, not in the browser.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.app_setting (
  setting_key         VARCHAR(200) PRIMARY KEY,
  setting_value       JSONB NOT NULL,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Registry of one-time data migrations (StartupDataMigrations). A row here means the
-- migration has been applied to this database and must never run again.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.app_data_migration (
  migration_id        VARCHAR(150) PRIMARY KEY,
  description         TEXT NOT NULL,
  checksum            VARCHAR(64) NOT NULL,
  rows_affected       INT NOT NULL,
  applied_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Registry of user-managed defaults that have been seeded into this database (seed-data.sql,
-- DataInitializer bulk files, ItemGroupService). A key here means "already seeded once": if the
-- user later deletes that row it is NOT seeded again. System rows are not tracked here; they are
-- restored when missing (see docs/startup-data-rules.md).
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.app_seed_registry (
  seed_key            VARCHAR(300) PRIMARY KEY,
  policy              VARCHAR(10) NOT NULL,
  first_seeded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Databases created before the master -> item_master consolidation are brought in line by data migrations
-- 2026-10-25-06 and -07 (StartupDataMigrations): job-work columns re-pointed to item_master, old tables dropped.
