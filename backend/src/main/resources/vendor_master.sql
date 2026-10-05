-- =============================================================================
-- Supplier / Vendor Master Schema & Data Migration
-- Incorporates all Book 3 attributes & Book 5 attributes (address, city, state, state_code, pincode)
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

-- Create vendor_master view for seamless access under both names


-- Also create table in sms_inventory schema if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'sms_inventory') THEN
        CREATE TABLE IF NOT EXISTS sms_inventory.supplier_master (LIKE public.supplier_master INCLUDING ALL);
        
    END IF;
END $$;

-- Insert / Update 209 vendor records from Book 5
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-001', 'SUP-001', 'A.B.Paint & Chemicals', 'COMP-001', 'MATERIAL', '06AWYPK7782M1ZC', 'AWYPK7782M', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'BALJEET KAUR', 'ripsyjaspreet@gmail.com', '9891213889', 'PT-30', 'INR', 'ACTIVE', 'VPO FIROZPUR BANGAR, FIROZPUR BANGAR, KHARKHODA, Sonipat, Haryana, 131402', 'Sonipat', 'Haryana', '06', '131402', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-002', 'SUP-002', 'A.V.SALES CORPORATION', 'COMP-001', 'MATERIAL', '06AAOPA4723C1Z7', 'AAOPA4723C', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'JOGINDER AGGARWAL', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', 'FIRST FLOOR, SHOP NO=E-29, NEHRU GROUND,NIT FARIDABAD, FARIDABAD, Faridabad, Haryana, 121001', 'Faridabad', 'Haryana', '06', '121001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-003', 'SUP-003', 'AATOMIZE MANUFACTURING PRIVATE LIMITED', 'COMP-001', 'MATERIAL', '24AARCA5519J1ZE', 'AARCA5519J', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'AATOMIZE MANUFACTURING PRIVATE LIMITED', NULL, '8511177165', 'PT-30', 'INR', 'ACTIVE', 'Plot No. 6/7, Padvala Road, Captain Tractore Street, Shapar (Veraval), Rajkot-360024', 'Rajkot', 'Gujarat', '24', '360024', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-004', 'SUP-004', 'ABRAR PACKAGING', 'COMP-001', 'MATERIAL', '07FECPK0726L1ZG', 'FECPK0726L', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SHAHRUKH KHAN', 'wassu.martyn13@gmail.com', '9958682245', 'PT-30', 'INR', 'ACTIVE', 'PLOT NO 481-482 KH NO-154, VILLAGE AND POST OFFICE POOTH KHURD, NEAR JAI HIND PUB SCHOOL, West Delhi, Delhi, 110039', 'West Delhi', 'Delhi', '07', '110039', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-005', 'SUP-005', 'ACCURATE STEELS', 'COMP-001', 'MATERIAL', '07AAKPG3325L1ZO', 'AAKPG3325L', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'PARDUMAN KUMAR GUJRAL', 'pkgujral@ymail.com', '9350475398', 'PT-30', 'INR', 'ACTIVE', 'GROUND FLOOR, C-249, SECTOR-2, BAWANA INDUSTRIAL AREA, North West Delhi, Delhi, 110039', 'North West Delhi', 'Delhi', '07', '110039', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-006', 'SUP-006', 'ACTS ENGINEERING', 'COMP-001', 'MATERIAL', '07AAWFA0970D1ZF', 'AAWFA0970D', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ACTS ENGINEERING', 'actsengineering@hotmail.com', '9810745789', 'PT-30', 'INR', 'ACTIVE', 'K - 234 & K - 229 Sector - 3, Bawana Industrial Estate, New Delhi - 110039', 'New Delhi', 'Delhi', '07', '110039', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-007', 'SUP-007', 'ADDWELL IMAGES', 'COMP-001', 'MATERIAL', '07ARMPS0438B1ZW', 'ARMPS0438B', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MOHAN JEE', 'addwellimage@yahoo.in', NULL, 'PT-30', 'INR', 'ACTIVE', 'C-257,SEC-2, BAWANA INDL.AREA,DELHI-110039', 'Delhi', 'Delhi', '07', '110039', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-008', 'SUP-008', 'ADR FLUID SEALING SOLUTIONS', 'COMP-001', 'MATERIAL', '07ACKPV3767B1ZC', 'ACKPV3767B', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Vikash Verma', 'adrseals@gmail.com', '9810948844', 'PT-30', 'INR', 'ACTIVE', '2763-2764, Hamillton Road,Mori Gate,Delhi-110006', 'Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-009', 'SUP-009', 'ADR FLUID SEALING SOLUTIONS', 'COMP-001', 'MATERIAL', '07ACKPV3767B1ZC', 'ACKPV3767B', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Vikas Verma', 'adrseals@gmail.com', '9810948844', 'PT-30', 'INR', 'ACTIVE', '2763-2764, Hamilton Road, Mori Gate, New Delhi, Central Delhi, Delhi, 110006', 'New Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-010', 'SUP-010', 'ADVANCE CHEMICAL SALES CORPORATION', 'COMP-001', 'MATERIAL', '07ADIPG3464H1ZL', 'ADIPG3464H', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'RAJENDER PERSHAD GUPTA', 'info@advancechemicals.com', NULL, 'PT-30', 'INR', 'ACTIVE', 'TOWER C, 306, NDM-2, NETAJI SUBHASH PLACE, PITAMPURA, North West Delhi, Delhi, 110034', 'North West Delhi', 'Delhi', '07', '110034', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-011', 'SUP-011', 'AERON STEELS PRIVATE LIMITED', 'COMP-001', 'MATERIAL', '06AAWCA3560G1ZH', 'AAWCA3560G', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'AERON STEELS PRIVATE LIMITED', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', 'KHEWAT NO.1306, VILLAGE BANIYANI, TEHSIL KALANAUR , BHIWANI ROAD, Rohtak, Haryana, 124001', 'Rohtak', 'Haryana', '06', '124001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-012', 'SUP-012', 'AGGARWAL TRADERS', 'COMP-001', 'MATERIAL', '07AAJHA4004M1ZG', 'AAJHA4004M', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'AGGARWAL TRADERS', 'ashokgupta.sampla@gmail.com', NULL, 'PT-30', 'INR', 'ACTIVE', '369 KATRA SAIKH RANJHA, CHOWK HAUZ QAZI DELHI 110006', 'Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-013', 'SUP-013', 'Alpha Engineering', 'COMP-001', 'MATERIAL', '03ABIFA2283Q1Z6', 'ABIFA2283Q', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Mr. Sandeep Sehgal', 'alphaengineering57@gmail.com', '9855587246', 'PT-30', 'INR', 'ACTIVE', 'F-183,Phase-8B,Industrial Area, Mohali-160071(Punjab)', 'Mohali', 'Punjab', '03', '160071', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-014', 'SUP-014', 'ALUMEN TECH LLP', 'COMP-001', 'MATERIAL', '06ABCFA9088K1Z1', 'ABCFA9088K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ALUMEN TECH LLP', NULL, '9899407273', 'PT-30', 'INR', 'ACTIVE', 'PLOT NO. 308, SECTOR-56, PH-5, ELECTRONICS PARK, HSIIDC, INDUSTRIAL ESTATE, KUNDLI, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-015', 'SUP-015', 'Amazon', 'COMP-001', 'MATERIAL', 'AMAZONINDIAQ1ZX', NULL, NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Amazon', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', 'Amazon', 'All India', 'All India', NULL, NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-016', 'SUP-016', 'ANAND ENTERPRISES', 'COMP-001', 'MATERIAL', '07AEKPV5429G1Z3', 'AEKPV5429G', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SATISH VERMA', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', '1/296, SHOP NO.21 FIRST FLOOR, KRISHNA GALI, KASHMERE GATE, DELHI- 110006', 'Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-017', 'SUP-017', 'AORA LAMINATES PRIVATE LIMITED', 'COMP-001', 'MATERIAL', '09AAZCA1158M1ZX', 'AAZCA1158M', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'AORA LAMINATES', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', 'J-23, Surajpur Site C Industrial Block J Road, Shark Design Studio Pvt Ltd, Surajpur Site C Industrial, Greater Noida, Gautambuddha Nagar, Uttar Pradesh, 201306', 'Noida', 'Uttar Pradesh', '09', '201306', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-018', 'SUP-018', 'APOLLO LUBES INDIA', 'COMP-001', 'MATERIAL', '07AHNPG2492A1ZK', 'AHNPG2492A', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MANNU GOYAL', 'mannugoyal@ymail.com', '9839462345', 'PT-30', 'INR', 'ACTIVE', 'FIRST FLOOR, PROP. NO. 64, POCKET-1, SECTOR-21, ROHINI, North West Delhi, Delhi, 110086', 'North West Delhi', 'Delhi', '07', '110086', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-019', 'SUP-019', 'Appario Retail Private Ltd', 'COMP-001', 'MATERIAL', '06AALCA0171E1Z3', 'AALCA0171E', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Appario Retail Private Ltd', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', 'Kh No 18//21, 19//25, 34//5, 6, 7/1 min, 14/2/2min, 15/1 min, 27, 35//1, 7, 8, 9/1, 9/2, 10/1, 10/2,11 min, 12, 13, 14, Village - Jamalpur Gurgaon, Haryana, 122503', 'Gurgaon', 'Haryana', '06', '122503', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-020', 'SUP-020', 'AUTO GENERAL AGENCIES', 'COMP-001', 'MATERIAL', '07AAGPM8830Q1Z0', 'AAGPM8830Q', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'RAMESH MASRANI', 'autogeneralagencies@gmail.com', '9811373844', 'PT-30', 'INR', 'ACTIVE', '2687, OPPOSITE MINERVA CINEMA, KASHMERE GATE, DELHI, Central Delhi, Delhi, 110006', 'Central Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-021', 'SUP-021', 'AUTOCRAFT PRECISION ENG. INDUSTRIES', 'COMP-001', 'MATERIAL', '07AYBPS9101M1Z4', 'AYBPS9101M', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SATPAL SINGH', 'apworks@gmail.com', '9899995469', 'PT-30', 'INR', 'ACTIVE', 'C 214 A, PHASE 2, INDUSTRIAL AREA, MANGOLPURI, New Delhi, Delhi, 110083', 'New Delhi', 'Delhi', '07', '110083', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-022', 'SUP-022', 'AVN STEEL', 'COMP-001', 'MATERIAL', '07PFJPS0328C1ZA', 'PFJPS0328C', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'VISHESH SINGHAL', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', 'T-7/8/9C, Street No. 10, Anand Parbat Industrial Area, New Delhi, Central Delhi, Delhi, 110005', 'New Delhi', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-023', 'SUP-023', 'B.LAL SONS', 'COMP-001', 'MATERIAL', '06AJMPN5772F1ZW', 'AJMPN5772F', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'NIRMALA', 'blalsons@rediffmail.com', '9416315026', 'PT-30', 'INR', 'ACTIVE', 'B-8,PREM NAGAR,NEAR CHOPRA PETROL PUMP, KUNDLI-131028', 'Kundli', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-024', 'SUP-024', 'B.P. CHEMICALS', 'COMP-001', 'MATERIAL', '06AAAFB0982G1ZS', 'AAAFB0982G', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'B P CHEMICALS', 'info@bpchemindia.com', '9136179460', 'PT-30', 'INR', 'ACTIVE', 'GROUND, 6/2, BP HOUSE NORTHERN INDIA COMPLEX, 20/3 MATHURA ROAD, FARIDABAD, Faridabad, Haryana, 121006', 'Faridabad', 'Haryana', '06', '121006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-025', 'SUP-025', 'Baba Amarnath KSK', 'COMP-001', 'MATERIAL', '06ALZPC8961C1ZR', 'ALZPC8961C', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ARJUN CHAUDHARY', NULL, '9996110123', 'PT-30', 'INR', 'ACTIVE', 'JATTI ROAD, JATTI KALAN, Baba Amarnath KSK, KUNDLI, SONEPAT, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-026', 'SUP-026', 'BALAJI DISTRIBUTORS', 'COMP-001', 'MATERIAL', '07BTQPS3463P1ZN', 'BTQPS3463P', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'CHIRAG SETHI', 'balajidistributorsonline@gmail.com', '9555340888', 'PT-30', 'INR', 'ACTIVE', '29, B BLOCK, PARVATIYA ANCHAL, STREET NO 2, SANT NAGAR, BURARI, Delhi-110084', 'Delhi', 'Delhi', '07', '110084', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-027', 'SUP-027', 'BALAJI GENERATOR SERVICE', 'COMP-001', 'MATERIAL', '06BQRPK2111G1Z2', 'BQRPK2111G', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'RAJIV KUMAR', 'balajigeneratorservice99@gmail.com', '9991428168', 'PT-30', 'INR', 'ACTIVE', 'BALAJI GENERATOR SERVICE, SHOP NEAR HONDA SHOWROOM, VILLAGE BAHALGARH, POST OFFICE BAHALGARH, Sonipat, Haryana, 131021', 'Sonipat', 'Haryana', '06', '131021', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-028', 'SUP-028', 'BALAJI STATIONERY', 'COMP-001', 'MATERIAL', '06HDFPS1168J1Z5', 'HDFPS1168J', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'UMANG SINGHAL', 'balajistationery19@gmail.com', '8920028952', 'PT-30', 'INR', 'ACTIVE', 'SCO-42,PHASE-1,SHOPPING COMPLEX,HSIIDC, KUNDLI, NEAR MAKHAN BHOG RESTARUNT, Kundli, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-029', 'SUP-029', 'Bansal Petro Oil Pvt. Ltd.', 'COMP-001', 'MATERIAL', '06AAECB4709N3ZG', 'AAECB4709N', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Bansal Petro Oil Pvt. Ltd.', 'sanjay.bansal062@gmail.com', '9671011717', 'PT-30', 'INR', 'ACTIVE', 'M/S BANSAL PETRO OIL PVT LTD, KILA NO. 22/2/1 AND 23/1, NARELA ROAD PIOU MANIYARI, KUNDLI, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-030', 'SUP-030', 'BANSAL STEELS', 'COMP-001', 'MATERIAL', '06ALZPB2960J1ZQ', 'ALZPB2960J', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ANKUR BANSAL', NULL, '9313810184', 'PT-30', 'INR', 'ACTIVE', 'NEAR JAIN DHARAM KANTA,PIOU, MANIYARI,G.T.ROAD,KUNDLI,SONEPAT', 'Sonepat', 'Haryana', '06', NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-031', 'SUP-031', 'Benz India Pvt.Ltd', 'COMP-001', 'MATERIAL', '07AAACB6432E1Z3', 'AAACB6432E', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', NULL, 'sales@benzindia.com', NULL, 'PT-30', 'INR', 'ACTIVE', 'C-126,Naraina Industrial Area,Phase-1,New Delhi-110028', 'New Delhi', 'Delhi', '07', '110028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-032', 'SUP-032', 'BHAGAT PAINTS', 'COMP-001', 'MATERIAL', '06GOEPM1685H1ZP', 'GOEPM1685H', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'GUNJAN MALIK', 'kuldeephardware2021@gmail.com', '9991114782', 'PT-30', 'INR', 'ACTIVE', 'BOOTH No.60, SECTOR 53, PHASE 1, SHOPING COMPLEX HSIIDC INDUSTRIAL ESTATE, KUNDLI, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-033', 'SUP-033', 'Bharat Hardware & Paints', 'COMP-001', 'MATERIAL', '06AKQPG1678L1ZN', 'AKQPG1678L', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'NITIN GARG', 'bhp.bharat@gmail.com', '7056744777', 'PT-30', 'INR', 'ACTIVE', 'Main G.T. Road, Kundli, Sonipat (H.R.)-131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-034', 'SUP-034', 'BHAVYA PACKAGING', 'COMP-001', 'MATERIAL', '06AWWPM9926D4ZU', 'AWWPM9926D', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'BHAVYA PACKAGING', NULL, '9050790503', 'PT-30', 'INR', 'ACTIVE', 'INDUSTRIAL AREA,BAHALGARH, SONIPAT-131021 (HR)', 'Sonipat', 'Haryana', '06', '131021', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-035', 'SUP-035', 'BHUPATI PLYWOOD & HARDWARE', 'COMP-001', 'MATERIAL', '06AAVFB6322K1Z4', 'AAVFB6322K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'BHUPATI PLYWOOD & HARDWARE', 'bhupatiplywood@gmail.com', '9811164114', 'PT-30', 'INR', 'ACTIVE', 'GROUND FLOOR, FLAT NO. EWS-16, MAX HEIGHTS, SECTOR-62, KUNDLI, Sonipat, Haryana, 131023', 'Sonipat', 'Haryana', '06', '131023', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-036', 'SUP-036', 'BIHAR MICA HOUSE', 'COMP-001', 'MATERIAL', '07AKHPB7614A1ZQ', 'AKHPB7614A', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'VIVEK BANSAL', 'SALES5@BIHARMICA.COM', NULL, 'PT-30', 'INR', 'ACTIVE', '10140, EAST PARK ROAD, KAROL BAGH, New Delhi, Delhi, 110005', 'New Delhi', 'Bihar', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-037', 'SUP-037', 'BLUE FASHION', 'COMP-001', 'MATERIAL', '07FIRPS6994B1ZF', 'FIRPS6994B', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'KAPIL SHARMA', 'bluefashion.india@gmail.com', '8860516465', 'PT-30', 'INR', 'ACTIVE', '1st Floor, Plot No 43, Rajeev Colony Narela, Ram Dev Road Harijan Basti Village Mamurpur, South Delhi, Delhi, 110040', 'South Delhi', 'Delhi', '07', '110040', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-038', 'SUP-038', 'BSA AUTO INDUSTRIES', 'COMP-001', 'MATERIAL', '07AZSPA9638D1Z40', 'AZSPA9638D', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ASFAAK ALI', NULL, '9599459720', 'PT-30', 'INR', 'ACTIVE', 'W-72/1 R, TALIBAN BASTI, GALI NO-10, ANAND PARBAT, Central Delhi, Delhi, 110005', 'Central Delhi', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-039', 'SUP-039', 'C & F INCORPORATION', 'COMP-001', 'MATERIAL', '07AAKFC7472J1Z1', 'AAKFC7472J', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'C & F INCORPORATION', NULL, '9868231936', 'PT-30', 'INR', 'ACTIVE', 'GROUND FLOOR, KHASRA NO 25/6 GALI NO-6, MASTER MOHALLA, MURTI WALI GALI LIBASPUR, North West Delhi, Delhi, 110042', 'North West Delhi', 'Delhi', '07', '110042', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-040', 'SUP-040', 'C-SOLUTIONS', 'COMP-001', 'MATERIAL', '07AAMPF4841N1ZC', 'AAMPF4841N', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MOHD FURKAN', 'csolutions2003@gmail.com', '9899260243', 'PT-30', 'INR', 'ACTIVE', '1870-B/139, SHANTI NAGAR, TRI NAGAR, DELHI-110035', 'Delhi', 'Delhi', '07', '110035', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-041', 'SUP-041', 'Canqua Lighting Private Limited', 'COMP-001', 'MATERIAL', '06AASCS0170J1Z4', 'AASCS0170J', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Canqua Lighting Private Limited', 'support@canquaindia.com', NULL, 'PT-30', 'INR', 'ACTIVE', 'Ground and 1st Floor, Plot No-135, Sector-57, Phase-IV, HSIIDC, Industrial Area Kundli, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-042', 'SUP-042', 'CHAUHAN & SONS', 'COMP-001', 'MATERIAL', '06BXUPS6925G1ZR', 'BXUPS6925G', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SANJEEV', 'technicalsanjeev50@gmail.com', '9811931766', 'PT-30', 'INR', 'ACTIVE', 'JAYTI ROAD, KUNDI, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-043', 'SUP-043', 'CHOWDHRY RUBBER & CHEMICAL PVT. LTD.', 'COMP-001', 'MATERIAL', '06AADCC3892Q1Z2', 'AADCC3892Q', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Navin Kumar', 'navin.kumar@crcc.in', '9312446712', 'PT-30', 'INR', 'ACTIVE', '30.8 KM Stone, MIE, Delhi Rohtak Road, Bahadurgarh, Jhajjar, Haryana, 124507', 'Bahadurgarh', 'Haryana', '06', '124507', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-044', 'SUP-044', 'CLW SEALS INDIA', 'COMP-001', 'MATERIAL', '09ADRPV9101B1ZB', 'ADRPV9101B', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'VIJAY KUMAR', 'clwseals4@gmail.com', '9818240305', 'PT-30', 'INR', 'ACTIVE', 'K-393,SITE 5, KASNA INDL. AREA, GREATER NOIDA, Gautambuddha Nagar, Uttar Pradesh, 201306', 'Noida', 'Uttar Pradesh', '09', '201306', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-045', 'SUP-045', 'COMPUTER VISION', 'COMP-001', 'MATERIAL', '07ALGPR9352K1ZH', 'ALGPR9352K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SUNIL SINGH RATHORE', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', 'B1/11, Sahyog Building, 58, Nehru Place, New Delhi, South Delhi, Delhi, 110019', 'New Delhi', 'Delhi', '07', '110019', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-046', 'SUP-046', 'CREATIVO PRINTING AND PACKAGING', 'COMP-001', 'MATERIAL', '06AANFC9709R1ZK', 'AANFC9709R', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'RITESH', 'creativoprintpack@gmail.com', '8800408191', 'PT-30', 'INR', 'ACTIVE', 'PLOT NO.352,PHASE-3,EPIP,NEAR HSIIDC INDL AREA', 'Haryana', 'Haryana', '06', NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-047', 'SUP-047', 'DAYASHANKAR SAHU', 'COMP-001', 'MATERIAL', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED', 'TDS-194C', 'DAYASHANKAR SAHU', 'dayashankar479@gmail.com', '9958121689', 'PT-30', 'INR', 'ACTIVE', 'E-60/1, Indira Enclave Ph-2, Kirari Suleman Nagar, Nangaloi Mubarak Pur Road, North West New Delhi-110086', 'New Delhi', 'Delhi', '07', '110086', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-048', 'SUP-048', 'DEEP MILL STORE', 'COMP-001', 'MATERIAL', '07BMJPS0585E1ZU', 'BMJPS0585E', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MANPREET SINGH', NULL, '9891465807', 'PT-30', 'INR', 'ACTIVE', 'RZ-C-1, KHASRA NO. 11/8, VISHNU GARDEN, NEW DELHI, West Delhi, Delhi, 110018', 'New Delhi', 'Delhi', '07', '110018', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-049', 'SUP-049', 'DEEPAK INTERNATIONAL', 'COMP-001', 'MATERIAL', '07ALTPK3212C1ZD', 'ALTPK3212C', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'AMIT KUKREJA', 'deepakintl2003@gmail.com', '9899777997', 'PT-30', 'INR', 'ACTIVE', 'GROUND FLOOR, 1240-A, CHHOTA BAZAR, KASHMERE GATE, North Delhi, Delhi, 110006', 'North Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-050', 'SUP-050', 'DEEPTI AUTO INDUSTRIES', 'COMP-001', 'MATERIAL', '07AWNPK3280D1ZJ', 'AWNPK3280D', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'GOPAL KRISHAN', NULL, '9871132027', 'PT-30', 'INR', 'ACTIVE', '25/7-B, STREET NO.9, NEW ROHTAK ROAD, Central Delhi, Delhi, 110005', 'Rohtak', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-051', 'SUP-051', 'DEV OIL COMPANY', 'COMP-001', 'MATERIAL', '06AIZPC4480B1Z9', 'AIZPC4480B', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'PANKAJ KUMAR CHAUHAN', NULL, '8930500910', 'PT-30', 'INR', 'ACTIVE', 'Lala Hari Krishan Industrial Area, Lakhmi Pio, Kundli, Sonipat, Haryana, 131001', 'Sonipat', 'Haryana', '06', '131001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-052', 'SUP-052', 'Dharuv International', 'COMP-001', 'MATERIAL', '06AEQPG3840J1ZC', 'AEQPG3840J', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'RAJ KUMAR GUPTA', NULL, '9811078053', 'PT-30', 'INR', 'ACTIVE', 'B-560, NEHRU GROUND, NIT FARIDABAD,', 'Faridabad', 'Haryana', '06', NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-053', 'SUP-053', 'DHINGRA TRUCKING PRIVATE LIMITED', 'COMP-001', 'MATERIAL', '07AAECD3007B1ZE', 'AAECD3007B', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'DHINGRA TRUCKING PRIVATE LIMITED', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', 'Shop No. 1522, Ground Floor Church Road, Kashmere Gate, New Delhi, Central Delhi - 110006', 'New Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-054', 'SUP-054', 'DK HYDRAULIC WORKS', 'COMP-001', 'MATERIAL', '06CNCPD9032L1Z0', 'CNCPD9032L', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'DK HYDRAULIC WORKS', NULL, '9050480734', 'PT-30', 'INR', 'ACTIVE', 'JATI ROAD, GALI NO. 3, MAHADEV MARKET, LAKHMI, VILLAGE, PIOU, KUNDLI, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-055', 'SUP-055', 'DK HYDRAULIC WORKS', 'COMP-001', 'MATERIAL', '06CNCPD9032L1Z0', 'CNCPD9032L', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'DK HYDRAULIC WORKS', NULL, '9050480734', 'PT-30', 'INR', 'ACTIVE', 'JATI ROAD, GALI NO. 3, MAHADEV MARKET, LAKHMI, VILLAGE, PIOU, KUNDLI, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-056', 'SUP-056', 'DS TRADERS', 'COMP-001', 'MATERIAL', '06HJAPS2762D1Z8', 'HJAPS2762D', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'DS TRADERS', NULL, '9034705492', 'PT-30', 'INR', 'ACTIVE', 'H.N.19, Village Badhkhalsa, Badhkhalsa, Sonipat, Haryana, 131029', 'Sonipat', 'Haryana', '06', '131029', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-057', 'SUP-057', 'Dua Trading Co.', 'COMP-001', 'MATERIAL', '06AIJPD9408J1Z5', 'AIJPD9408J', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SURINDER DUA', NULL, '9812958674', 'PT-30', 'INR', 'ACTIVE', 'NEAR MILTON CYCLE INDUSTRIES, PANCHSHEEL COLONY, Sonipat, Haryana, 131001', 'Sonipat', 'Haryana', '06', '131001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-058', 'SUP-058', 'Durga Polychem', 'COMP-001', 'MATERIAL', '07BVQPK0214C1ZZ', 'BVQPK0214C', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Mr.Rajat Ji', NULL, '8860092780', 'PT-30', 'INR', 'ACTIVE', 'L-76,Sector-1, DSIIDC Bawana ind. Area,New Delhi-110039', 'New Delhi', 'Delhi', '07', '110039', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-059', 'SUP-059', 'ELPAR INDUSTRIES', 'COMP-001', 'MATERIAL', '06AAFFE5041A1Z4', 'AAFFE5041A', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ELPAR INDUSTRIES', 'elparindustries@elparindustries.com', NULL, 'PT-30', 'INR', 'ACTIVE', 'PLOT NO. 58, SECTOR-56, KUNDLI INDUSTRIAL AREA, HSIIDC PHASE-IV, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-060', 'SUP-060', 'ELPHA POLYCHEM PRIVATE LIMITED', 'COMP-001', 'MATERIAL', '06AADCE6707G1ZT', 'AADCE6707G', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ELPHA POLYCHEM PRIVATE LIMITED', 'vith73@gmail.com', '9810027656', 'PT-30', 'INR', 'ACTIVE', 'RAI, 1536, Basement,Phase V, HSIIDC, SONIPAT, HARYANA, Sonipat, Haryana, 131001', 'Sonipat', 'Haryana', '06', '131001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-061', 'SUP-061', 'ENKAY POLYCHEM LLP', 'COMP-001', 'MATERIAL', '07AAFFE2678F1ZF', 'AAFFE2678F', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ENKAY POLYCHEM LLP', 'vith73@yahoo.co.in', '9810129400', 'PT-30', 'INR', 'ACTIVE', 'GROUND FLOOR, KHASRA NO 1074, NEAR JAHANGIR PURI K BLOCK MARKET, VILLAGE BHALSWA, VILLAGE BHALSWA, West Delhi, Delhi, 110033', 'West Delhi', 'Delhi', '07', '110033', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-062', 'SUP-062', 'ESS AAY AUTOMOTIVE', 'COMP-001', 'MATERIAL', '07AABFE7846H1ZB', 'AABFE7846H', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ESS AAY AUTOMOTIVE', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', '1989, GROUND FLOOR SH KISHANDAS ROAD, CHAPPARWALA CHOWK, KAROL BAGH NEW DELHI 110005', 'New Delhi', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-063', 'SUP-063', 'EXCELLENT AUTOMOTIVE', 'COMP-001', 'MATERIAL', '09BDWPM9193A1ZW', 'BDWPM9193A', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'HANITA SINGH SETHI', 'tvs@excellent.net.in', '8595947018', 'PT-30', 'INR', 'ACTIVE', 'A-07, Industrial Phase 2 Block A- Road, Gautam Buddh Nagar, Noida, Gautambuddha Nagar, Uttar Pradesh, 201305', 'Noida', 'Uttar Pradesh', '09', '201305', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-064', 'SUP-064', 'EXCELLENT AUTOMOTIVE', 'COMP-001', 'MATERIAL', '09BDWPM9193A1ZW', 'BDWPM9193A', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'HANITA SINGH SETHI', 'bajaj@excellent.net.in', '8595947018', 'PT-30', 'INR', 'ACTIVE', 'A-07, Phase 2 Noida Pin : 201305', 'Noida', 'Uttar Pradesh', '09', '201305', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-065', 'SUP-065', 'EXCELLENT DISTRIBUTORS', 'COMP-001', 'MATERIAL', '09BDWPM9193A2ZV', 'BDWPM9193A', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'HANITA SINGH SETHI', 'hondaup@excellent.net.in', '8595947018', 'PT-30', 'INR', 'ACTIVE', 'Basment, A-07, Industrial Phase 2 Block A Road, Noida, Noida, Gautambuddha Nagar, Uttar Pradesh, 201304', 'Noida', 'Uttar Pradesh', '09', '201304', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-066', 'SUP-066', 'FAIR DEAL INDIA', 'COMP-001', 'MATERIAL', '07AABFF4770F1ZL', 'AABFF4770F', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Surender', NULL, '9811188484', 'PT-30', 'INR', 'ACTIVE', 'M-9, GALI NO. 1, ANAND PARVAT INDUSTRIAL AREA, Central Delhi, Delhi, 110005', 'Central Delhi', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-067', 'SUP-067', 'FLUOROTHERM INDUSTRY', 'COMP-001', 'MATERIAL', '36ACQPM3371C1ZK', 'ACQPM3371C', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SRINAGESH MADIREDDY', 'fluorothermindustry@gmail.com', '9848027315', 'PT-30', 'INR', 'ACTIVE', 'PLOT NO 46/3, C.I.E. EXTENSION PHASE II, GANDHI NAGAR, BALANAGAR, HYDERABAD - 500037', 'Hyderabad', 'Telangana', '36', '500037', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-068', 'SUP-068', 'GALAXY POLYMERS', 'COMP-001', 'MATERIAL', '08AAEFG9545L1ZV', 'AAEFG9545L', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'GALAXY POLYMERS', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', 'PLOT NO.G-29,PHASE-1,RIICO INDL.AREA, BHIWADI DISTT ALWAR RAJASTHAN', 'Rajasthan', 'Rajasthan', '08', NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-069', 'SUP-069', 'GANESH MACHINE TOOLS', 'COMP-001', 'MATERIAL', '24AEXPS2347K1ZT', 'AEXPS2347K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'PRADIP SHRIRAM SURVEY', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', '1st FLOOR, JAY SHREE RAM ESTATE, GANESH MACHINE TOOLS, 5/10 BHAKTINAGAR STATION PLOT CORNER, Rajkot Golden Logistics Pvt Ltd, Station Plot, Rajkot, Rajkot, Gujarat, 360002', 'Rajkot', 'Gujarat', '24', '360002', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-070', 'SUP-070', 'GEE ENTERPRISES', 'COMP-001', 'MATERIAL', '07ADXPR6931P1ZC', 'ADXPR6931P', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'GEE ENTERPRISES', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', '3443,GALI LALLU MISSAR,OPP.CAR PARKING, GATE NO.3,QUTUB ROAD,SADAR BAZAR,DELHI-110006', 'Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-071', 'SUP-071', 'GEETA SPRING', 'COMP-001', 'MATERIAL', '07CLDPG3321E2ZO', 'CLDPG3321E', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'GEETA', 'geetaspringsindia@gmail.com', '9999353168', 'PT-30', 'INR', 'ACTIVE', 'House no.487, Block-U, Mangolpuri Road, Mangol Puri, New Delhi, North West Delhi, Delhi, 110083', 'New Delhi', 'Delhi', '07', '110083', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-072', 'SUP-072', 'Genx Tools', 'COMP-001', 'MATERIAL', '29AANFG3517H1Z7', 'AANFG3517H', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Sneha', NULL, '9008549696', 'PT-30', 'INR', 'ACTIVE', 'NO 35/9, GENX TOOLS, 1ST MAIN ROAD 2ND PHASE PEENYA INDUSTRIAL AREA NEAR NTTF, BANGALORE, Bengaluru Rural, Karnataka, 560058', 'Bangalore', 'Karnataka', '29', '560058', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-073', 'SUP-073', 'Grover Marketing', 'COMP-001', 'MATERIAL', '06AAOPG0106B1ZI', 'AAOPG0106B', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ASHOK KUMAR GROVER', 'grovermarketing305@gmail.com', '9813043144', 'PT-30', 'INR', 'ACTIVE', 'BEHIND SINGH PETROL PUMP, G.T ROAD, BAHALGARH, Sonipat, Haryana, 131201', 'Sonipat', 'Haryana', '06', '131201', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-074', 'SUP-074', 'GUPTA ENGINEERING WORKS', 'COMP-001', 'MATERIAL', '07AAIPG1561A1ZB', 'AAIPG1561A', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'HIMANSHU GUPTA', 'guptaengineeringwork@yahoo.com', '9650547547', 'PT-30', 'INR', 'ACTIVE', '25/8,GALI NO.7,ANAND PARBAT INDL. AREA', 'Delhi', 'Delhi', '07', NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-075', 'SUP-075', 'GURU JI METALSS', 'COMP-001', 'MATERIAL', '06AQFPV1229F1ZX', 'AQFPV1229F', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'PARTEEK KUMAR VERMA', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', '25/26, OPP.HASIJA HOSPITAL, MAIN G.T.ROAD, NEAR TOYOTA SHOWROOM, PIOU MANIYARI, Kundli, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-076', 'SUP-076', 'H.M.TRADERS', 'COMP-001', 'MATERIAL', '07BPIPA8429M1ZJ', 'BPIPA8429M', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'H.M.TRADERS', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', 'E-653-654-655,1ST FLOOR,JAHANGIRPURI,NEW DELHI-110033', 'New Delhi', 'Delhi', '07', '110033', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-077', 'SUP-077', 'HARIOM INDUSTRIES', 'COMP-001', 'MATERIAL', '06AGBPV3331L1ZA', 'AGBPV3331L', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'VEERPAL', NULL, '9990053965', 'PT-30', 'INR', 'ACTIVE', 'Killa No. 76/4, 7/160, Khewat No. 659, Unnamed Road, Kundli Homes, Kundli Village, Kundli, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-078', 'SUP-078', 'HARYANA SUPPLY AGENCIES', 'COMP-001', 'MATERIAL', '07AAIPG2743A1Z9', 'AAIPG2743A', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'RAJIV GOEL', 'haryana.supply@gmail.com', '9811255806', 'PT-30', 'INR', 'ACTIVE', 'A-2 PLOT 7-8, COMMUNITY CENTRE, NARAINA, South West Delhi, Delhi, 110028', 'West Delhi', 'Delhi', '07', '110028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-079', 'SUP-079', 'HI-TECH INTERNATIONAL', 'COMP-001', 'MATERIAL', '06AADFH9663F1Z9', 'AADFH9663F', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'JILE SINGH', 'orders@doctorrust.com', '7042192602', 'PT-30', 'INR', 'ACTIVE', 'PLOT NO.99, IMT MANESAR, SECTOR 5, GURGAON, Gurugram, Haryana, 122050', 'Gurgaon', 'Haryana', '06', '122050', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-080', 'SUP-080', 'HINDUSTAN PROJECTS & ENGINEERING CO.', 'COMP-001', 'MATERIAL', '08BXDPS4821G1ZD', 'BXDPS4821G', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'TUSHAR SHARMA', 'sales@hindustanshotblasters.com', '9799318071', 'PT-30', 'INR', 'ACTIVE', 'C-83, KIRTI NAGAR, MAGRA PUNJALA, Jodhpur, Rajasthan, 342007', 'Jodhpur', 'Rajasthan', '08', '342007', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-081', 'SUP-081', 'HINDUSTAN SALES CORPORATION', 'COMP-001', 'MATERIAL', '07BDFPN8098G1Z2', 'BDFPN8098G', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MD NOFIL', NULL, '9717860887', 'PT-30', 'INR', 'ACTIVE', 'GROUND FLOOR SHOP NO. 1 AND 2, 3859-3860, SHAHGANJ BEHIND G.B. ROAD DELHI, DELHI, North Delhi, Delhi, 110006', 'North Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-082', 'SUP-082', 'Indolaser Technologies', 'COMP-001', 'MATERIAL', '09BNKPV5864MIZV', 'BNKPV5864M', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Mr.Rohit', NULL, '9870884771', 'PT-30', 'INR', 'ACTIVE', 'A-126,Sector-80,Ph-II,Noida,Gautam Buddha Nagar-201305', 'Noida', 'Uttar Pradesh', '09', '201305', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-083', 'SUP-083', 'Integrated Engineers & Contractors', 'COMP-001', 'MATERIAL', '06AALPP2687H1ZA', 'AALPP2687H', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'PUNEET PODDAR', 'info@iec.co.in', '9870118883', 'PT-30', 'INR', 'ACTIVE', 'Plot No.1562, Rai Industrial Area, Rai, Sonipat, Haryana, 131029', 'Sonipat', 'Haryana', '06', '131029', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-084', 'SUP-084', 'Integrated Engineers & Contractors', 'COMP-001', 'MATERIAL', '06AALPP2687H1ZA', 'AALPP2687H', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'PUNEET PODDAR', 'info@iec.co.in', '9811202340', 'PT-30', 'INR', 'ACTIVE', 'Plot No.1562, Rai Industrial Area, Rai, Sonipat, Haryana, 131029', 'Sonipat', 'Haryana', '06', '131029', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-085', 'SUP-085', 'J.H. MANUFACTURING CO.', 'COMP-001', 'MATERIAL', '05ARSPS4835J1Z4', 'ARSPS4835J', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'AJAY KUMAR SRIVASTAVA', 'accounts@jhmanufacturing.com', '8791000807', 'PT-30', 'INR', 'ACTIVE', 'PHASE-2, PLOT NO. 144, NAND NAGAR INDUSTRIAL ESTATE, MAHUAKHERAGANJ, KASHIPUR, Udham Singh Nagar, Uttarakhand, 244713', 'Kashipur', 'Uttarakhand', '05', '244713', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-086', 'SUP-086', 'J.K.ENTERPRISES', 'COMP-001', 'MATERIAL', '07BWCPK2343H1ZR', 'BWCPK2343H', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SUNIL KUMAR', 'jkenterprises9971@gmail.com', '9971186215', 'PT-30', 'INR', 'ACTIVE', 'GROUND AND FIRST FLOOR, D-34, MCD NO.31/3-D, Gali Number 4, Wine Shop, Anand Parbat, New Delhi, Central Delhi, Delhi, 110005', 'New Delhi', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-087', 'SUP-087', 'JAI DEVA OIL CO.', 'COMP-001', 'MATERIAL', '07AJLPG5662J1ZW', 'AJLPG5662J', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MAYANK GOYAL', 'jaidevaoilco@gmail.com', '9991849176', 'PT-30', 'INR', 'ACTIVE', '1/2578 A,FLAT NO. 4,, PARAS HOME, GALI NO. 5, RAM NAGAR, SHAHDARA, North East Delhi, Delhi, 110032', 'East Delhi', 'Delhi', '07', '110032', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-088', 'SUP-088', 'JAI MAA DURGA PALLETS', 'COMP-001', 'MATERIAL', '07DVLPK6639E1Z9', 'DVLPK6639E', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SHAMBHU KUMAR', NULL, '9650822839', 'PT-30', 'INR', 'ACTIVE', 'GROUND FLOOR, 329, KHASARA NO 16/18, GALI NO-13, SAMALKHA, South West Delhi, Delhi, 110037', 'West Delhi', 'Delhi', '07', '110037', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-089', 'SUP-089', 'JAI SAI STEEL', 'COMP-001', 'MATERIAL', '06AFRPJ9423L1ZV', 'AFRPJ9423L', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SURENDER JAIN', NULL, '9896711516', 'PT-30', 'INR', 'ACTIVE', 'PIAU MANIHARY, NARELA ROAD, KUNDLI, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-090', 'SUP-090', 'JMF PERFORMANCE MATERIALS PRIVATE LIMITED', 'COMP-001', 'MATERIAL', '06AABCJ6097J1Z8', 'AABCJ6097J', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'JMF PERFORMANCE MATERIALS PRIVATE LIMITED', 'ghanshyam@jmfindia.com', '9560309490', 'PT-30', 'INR', 'ACTIVE', 'PLOT NO.12/66, BABA DEEP SINGH JI SHAHEED MAR, NIT INDUSTRIAL AREA, OPP. - GOVT. PRESS COLONY, FARIDABAD, Faridabad, Haryana, 121001', 'Faridabad', 'Haryana', '06', '121001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-091', 'SUP-091', 'JS Precision Punch', 'COMP-001', 'MATERIAL', '07EHVPS8455R1ZQ', 'EHVPS8455R', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'JS Precision Punch', 'jsprecisionpunch@gmail.com', '9990927967', 'PT-30', 'INR', 'ACTIVE', '13/22/5,Street No.10., Ind.Area Samaipur,Badli,Delh-110042', 'Delhi', 'Delhi', '07', '110042', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-092', 'SUP-092', 'JYOTI PLASTIC MFG CO', 'COMP-001', 'MATERIAL', '07ACUPB0618F1ZU', 'ACUPB0618F', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'TARA CHAND', 'jyotiplastics_tcbatra@rediffmail.com', '9811078021', 'PT-30', 'INR', 'ACTIVE', '71-SSI, LAGHU UDYOG NAGAR, GT KARNAL ROAD, North Delhi, Delhi, 110033', 'North Delhi', 'Delhi', '07', '110033', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-093', 'SUP-093', 'KANHA ALLOYS', 'COMP-001', 'MATERIAL', '07AASPG0574H2ZJ', 'AASPG0574H', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'KANHA ALLOYS', NULL, '9810298339', 'PT-30', 'INR', 'ACTIVE', '106-A, SHIVLOK HOUSE 1, KARAMPURA COMM, COMPLEX, NEW DELHI - 110015', 'New Delhi', 'Delhi', '07', '110015', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-094', 'SUP-094', 'KAPOOR STEEL TRADERS', 'COMP-001', 'MATERIAL', '07AAGPK1510R1ZL', 'AAGPK1510R', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SANDEEP KAPOOR', 'kapoorsteel@gmail.com', '9810011592', 'PT-30', 'INR', 'ACTIVE', 'Ground Floor, Shop No 09, Khasra No 7/23, Libaspur Road, Samaypur, North East Delhi, Delhi, 110042', 'East Delhi', 'Delhi', '07', '110042', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-095', 'SUP-095', 'Karan Singh Gas Agency', 'COMP-001', 'MATERIAL', '06AALPD0302R1ZT', 'AALPD0302R', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'WANTI DEVI', NULL, '9812707832', 'PT-30', 'INR', 'ACTIVE', 'GARHI BALA, ABBASPUR, SONIPAT, Sonipat, Haryana, 131001', 'Sonipat', 'Haryana', '06', '131001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-096', 'SUP-096', 'Kebica Sales', 'COMP-001', 'MATERIAL', '07AAMPK7902P1Z3', 'AAMPK7902P', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Kebica Sales', 'info@Kebicastationery.com', '9999738327', 'PT-30', 'INR', 'ACTIVE', '3951/15,Ishar Market,Gali-Satte Wali Nai Sarak, Delhi-110006', 'Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-097', 'SUP-097', 'Khalil Gear Engineering Works', 'COMP-001', 'MATERIAL', '07BASPA8071N1Z4', 'BASPA8071N', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Khalil', NULL, '9213075210', 'PT-30', 'INR', 'ACTIVE', 'G-5,G/F,No.4,Shop No.3, MCD No.4/4.31-G,Ind.Area Anand Parbat,New Delhi-5', 'New Delhi', 'Delhi', '07', NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-098', 'SUP-098', 'KISHORE INTERNATIONAL', 'COMP-001', 'MATERIAL', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED', 'TDS-194C', 'PRAVEEN KUMAR GUPTA', 'kishorelab@gmail.com', '7982274833', 'PT-30', 'INR', 'ACTIVE', 'A-30, NANDA ROAD, ADARSH NAGAR, New Delhi, Delhi, 110033', 'New Delhi', 'Delhi', '07', '110033', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-099', 'SUP-099', 'KLARIDGES AUTO COMPONENTS', 'COMP-001', 'MATERIAL', '07BEEPS7365R1ZH', 'BEEPS7365R', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'RAMAN DEEP SINGH', 'klaridges@gmail.com', '9910000467', 'PT-30', 'INR', 'ACTIVE', 'Ground Floor, Kh. No. 30/9, Master Mohalla, Gali No. 4, Libaspur, North West Delhi, Delhi, 110042', 'North West Delhi', 'Delhi', '07', '110042', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-100', 'SUP-100', 'KOHLI AUTO TRADERS', 'COMP-001', 'MATERIAL', '07AACPC8320P1ZN', 'AACPC8320P', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'DARSHAN SINGH CHADHA', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', 'WZ-76, TODAPUR, DELHI, South West Delhi, Delhi, 110012', 'West Delhi', 'Delhi', '07', '110012', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-101', 'SUP-101', 'Kohli Felt Industries', 'COMP-001', 'MATERIAL', '07AXQPS1367K1ZR', 'AXQPS1367K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Kohli Felt Industries', 'kohli.industries@yahoo.com', '9313628314', 'PT-30', 'INR', 'ACTIVE', 'E-2/42, Gali no.1 , Shastri Nagar, Delhi-110052', 'Delhi', 'Delhi', '07', '110052', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-102', 'SUP-102', 'KRISHNA ENTERPRISES', 'COMP-001', 'MATERIAL', '07AIFPA1884K1Z8', 'AIFPA1884K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Vikas Gupta', 'ke9310076515@gmail.com', '9599893431', 'PT-30', 'INR', 'ACTIVE', 'GROUND FLOOR, RA-17, GALI NO-10, ANAND PARBAT, NEW DELHI, Central Delhi, Delhi, 110005', 'New Delhi', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-103', 'SUP-103', 'KRISHNA INDUSTRIES', 'COMP-001', 'MATERIAL', '07AEGPD7983R2ZM', 'AEGPD7983R', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'DATTA JE', NULL, '9312408898', 'PT-30', 'INR', 'ACTIVE', '50/12A,1ST FLOOR,GALI NO.1,ANAND PARBAT INDL.AREA,NEW DELHI-110005', 'New Delhi', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-104', 'SUP-104', 'KULDEEP HARDWARE', 'COMP-001', 'MATERIAL', '06DCMPM6761B1ZI', 'DCMPM6761B', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'AKSHAY MALIK', 'kuldeephardware2021@gmail.com', '9991914964', 'PT-30', 'INR', 'ACTIVE', 'SHOP NO. 66, NEAR SBI BANK, HSIIDC KUNDLI, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-105', 'SUP-105', 'KULDIP MOTOR CO.', 'COMP-001', 'MATERIAL', '07AATPS1097E1Z9', 'AATPS1097E', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ASHWINDER SINGH SAHNI', 'kuldipmotorco@yahoo.co.in', '8368807302', 'PT-30', 'INR', 'ACTIVE', 'GROUND, 2852, BARA BAZAR, BARA BAZAR, KASHMERE GATE, North Delhi, Delhi, 110006', 'North Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-106', 'SUP-106', 'LAB LINE ENTERPRISES', 'COMP-001', 'MATERIAL', '06ADLPN3349P1ZW', 'ADLPN3349P', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ANUP NAGPAL', 'contact.labline@gmail.com', '7738642178', 'PT-30', 'INR', 'ACTIVE', 'Western Extension Industrial Area, Plot No 4, Sub Div 9, FBD Industrial Park, Near FCI Godown, NIT FARIDABAD, Faridabad, Haryana, 121001', 'Faridabad', 'Haryana', '06', '121001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-107', 'SUP-107', 'LAXMI ENGINEERING WORKS', 'COMP-001', 'MATERIAL', '07ADRPV9101B1ZF', 'ADRPV9101B', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'VIJAY KUMAR', 'laxmiclw305@gmail.com', '9818240305', 'PT-30', 'INR', 'ACTIVE', 'GROUND FLOOR, 1321/1, SULTAN SINGH BUILDING GURU NANAK MARKET, BEHIND BATA SHOWROOM, KASHMERE GATE, New Delhi, North Delhi, Delhi, 110006', 'New Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-108', 'SUP-108', 'LUCE DIVINA ENTERPRISES', 'COMP-001', 'MATERIAL', '07DBVPM2345K1Z2', 'DBVPM2345K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MANISHA MANDAL', NULL, '8287526861', 'PT-30', 'INR', 'ACTIVE', 'SHOP NO- 655/27, 1ST FLOOR, OM MARKET FARASH KHANA, G.B. ROAD, DELHI-110006', 'Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-109', 'SUP-109', 'Luce Divina Enterprises', 'COMP-001', 'MATERIAL', '07DBVPM2345K1Z2', 'DBVPM2345K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Luce Divina Enterprises', NULL, '8287526861', 'PT-30', 'INR', 'ACTIVE', 'GROUND FLOOR MUSTATIL NO.101, KILLA NO. 4/2 STREET NO-32, BLK-B, KAMALPUR KAMAL VIHAR, WEST VILLAGE, BURARI DELHI-110084', 'Delhi', 'Delhi', '07', '110084', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-110', 'SUP-110', 'LUTHRA PAINTS AND BUILDING MATERIAL STORE', 'COMP-001', 'MATERIAL', '06ACCPL3399M1Z5', 'ACCPL3399M', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'HITESH LUTHRA', '1980luthrapaints@gmail.com', NULL, 'PT-30', 'INR', 'ACTIVE', 'MAMA BHANJA CHOWK, SONIPAT, SONIPAT, Sonipat, Haryana, 131001', 'Sonipat', 'Haryana', '06', '131001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-111', 'SUP-111', 'LUTHRA TRADING CORPORATION', 'COMP-001', 'MATERIAL', '06AAIFL1455E1ZK', 'AAIFL1455E', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'LUTHRA TRADING CORPORATION', NULL, '9896066266', 'PT-30', 'INR', 'ACTIVE', 'LUTHRA HOUSE, SIKKA COLONY, DELHI ROAD, SONEPAT, Sonipat, Haryana, 131001', 'Sonipat', 'Haryana', '06', '131001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-112', 'SUP-112', 'M. L. POLYMERS', 'COMP-001', 'MATERIAL', '07BLFPS2405E1ZD', 'BLFPS2405E', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'BHARAT SINGH', NULL, '9310273138', 'PT-30', 'INR', 'ACTIVE', 'GROUND FLOOR, PLOT NO. 19, Bawana Industrial Area,DSIDC, PKT-A,SECTOR-1, Bawana Industrial Area, New Delhi, North Delhi, Delhi, 110039', 'New Delhi', 'Delhi', '07', '110039', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-113', 'SUP-113', 'M/S S.V.R.ENGG.WORKS', 'COMP-001', 'MATERIAL', '09AKRPB5095M1ZG', 'AKRPB5095M', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'RAJEEV KUMAR BISHNOI', 'SVERGGWORKS@YAHOO.IN', '9350388586', 'PT-30', 'INR', 'ACTIVE', '786, Gali No. 6, Sihani Road, Banwari Nagar, Ghaziabad, Uttar Pradesh, 201003', 'Ghaziabad', 'Uttar Pradesh', '09', '201003', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-114', 'SUP-114', 'MAANAK CALLAB PRIVATE LIMITED', 'COMP-001', 'MATERIAL', '06AARCM2054J1Z8', 'AARCM2054J', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MAANAK CALLAB PRIVATE LIMITED', 'info@maanakcallab.co.in', '9311092205', 'PT-30', 'INR', 'ACTIVE', '1504/22, GALI NO 6, NEAR HANUMAN MANDIR GANDHI NAGAR, Gurugram, Gurugram, Haryana, 122001', 'Gurugram', 'Haryana', '06', '122001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-115', 'SUP-115', 'Manish Saw Mills', 'COMP-001', 'MATERIAL', '06AMMPK7326B1Z7', 'AMMPK7326B', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ASHOK KUMAR', NULL, '9716763065', 'PT-30', 'INR', 'ACTIVE', '1, 1, KUNDLI, Sonipat, Haryana, 131001', 'Sonipat', 'Haryana', '06', '131001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-116', 'SUP-116', 'MANJEET TRADERS', 'COMP-001', 'MATERIAL', '07CJDPS0633R1ZP', 'CJDPS0633R', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'KULBIR SINGH', NULL, '9810612007', 'PT-30', 'INR', 'ACTIVE', 'C-212/1 SHOP NO.3, MAIN ROAD MAYAPURI, MAYAPURI PHASE-II, South West Delhi, Delhi, 110064', 'West Delhi', 'Delhi', '07', '110064', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-117', 'SUP-117', 'MAX ENGINEERING & MARKETING PRIVATE LIMITED', 'COMP-001', 'MATERIAL', '06AAKCM2479A1ZL', 'AAKCM2479A', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Max Engineering & Marketing Private Limited', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', 'Plot No.18, Industrial Estate,Phase-IV,,Sector-56, Kundli Sonepat, Haryana,,,Kundli,Haryana,131028', 'Sonepat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-118', 'SUP-118', 'MICROVISION ENGINEERING PRIVATE LIMITED', 'COMP-001', 'MATERIAL', '06AAFCM7944R1ZN', 'AAFCM7944R', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Microvision Engineering Pvt. Ltd.', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', '1568, HSIDC, INDUSTRIAL ESTATE, RAI, Sonipat, Haryana, 131001', 'Sonipat', 'Haryana', '06', '131001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-119', 'SUP-119', 'Microvision Enterprises', 'COMP-001', 'MATERIAL', '06AQUPS2298E1Z8', 'AQUPS2298E', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ASHOK SHARMA', 'mv@microrheometer.com', '9811541479', 'PT-30', 'INR', 'ACTIVE', '131, HSIDC INDUSTRIAL ESTATE, RAI, RAI, Sonipat, Haryana, 131029', 'Sonipat', 'Haryana', '06', '131029', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-120', 'SUP-120', 'MILAP INDUSTRIAL CORPORATION', 'COMP-001', 'MATERIAL', '03AABFM2806K1ZM', 'AABFM2806K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MILAP INDUSTRIAL CORPORATION', 'info@milap.net', '9815545065', 'PT-30', 'INR', 'ACTIVE', 'E 242, PHASE IV, FOCAL POINT, Ludhiana, Punjab, 141010', 'Ludhiana', 'Punjab', '03', '141010', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-121', 'SUP-121', 'MILAP INDUSTRIAL CORPORATION', 'COMP-001', 'MATERIAL', '03AABFM2806K1ZM', 'AABFM2806K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MILAP INDUSTRIAL CORPORATION', NULL, '9815545065', 'PT-30', 'INR', 'ACTIVE', 'E 242, PHASE IV, FOCAL POINT, Ludhiana, Punjab, 141010', 'Ludhiana', 'Punjab', '03', '141010', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-122', 'SUP-122', 'MODI PERFORATORS', 'COMP-001', 'MATERIAL', '07AKQPM2072A1ZC', 'AKQPM2072A', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'DALIP MODI', NULL, '9811363283', 'PT-30', 'INR', 'ACTIVE', 'N 31/O, GALI NO-4, INDUSTRIAL AREA ANAND PARBAT, New Delhi, Delhi, 110005', 'New Delhi', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-123', 'SUP-123', 'MOHAN STEELS', 'COMP-001', 'MATERIAL', '07AAAFM0138K1ZI', 'AAAFM0138K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MOHAN STEELS', 'mohansteels.sumeer@gmail.com', '9871360300', 'PT-30', 'INR', 'ACTIVE', '25/3,ANAND PARBAT INDL.AREA,NEW ROHTAK ROAD', 'Rohtak', 'Delhi', '07', NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-124', 'SUP-124', 'MOHAN STEELS', 'COMP-001', 'MATERIAL', '07AAAFM0138K1ZI', 'AAAFM0138K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MOHAN STEELS', 'mohansteels.sumeer@gmail.com', '9871360300', 'PT-30', 'INR', 'ACTIVE', '25/3, NEW ROHTAK ROAD, ANAND PARBAT INDUSTRIAL AREA, New Delhi, Delhi, 110005', 'Rohtak', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-125', 'SUP-125', 'Mohit Die Maker', 'COMP-001', 'MATERIAL', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED', 'TDS-194C', 'Mohit Kumar', NULL, '8384028105', 'PT-30', 'INR', 'ACTIVE', '52/14, F-5, Gali No. 4k Upper Gali No. 17, Anand Parbat Indl. Area, New Delhi-110005', 'New Delhi', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-126', 'SUP-126', 'NAGPAL STEEL TRADERS', 'COMP-001', 'MATERIAL', '07AACPN8069N1Z2', 'AACPN8069N', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SURINDER KUMAR NAGPAL', 'namannagpal@gmail.com', '9811411881', 'PT-30', 'INR', 'ACTIVE', 'IST FLOOR, T-15/1,, ANAND PARBAT INDUSTRIAL AREA, GALI NO.10, ANAND PARBAT, New Delhi, Delhi, 110005', 'New Delhi', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-127', 'SUP-127', 'Namishwar Enterprises', 'COMP-001', 'MATERIAL', '07AAHPJ7247F1ZO', 'AAHPJ7247F', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Mr.Neeraj Jain', 'Namishwar@yahoo.com', '9811116340', 'PT-30', 'INR', 'ACTIVE', '2373/108,Gopinath Building,Behind G.B.Road,Farash Khana Delhi-110006', 'Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-128', 'SUP-128', 'NARESH AGENCIES', 'COMP-001', 'MATERIAL', '07AFMPR9604Q1ZH', 'AFMPR9604Q', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'NARESH KUMAR RAMTRI', 'nareshagencies2004@gmail.com', '9810348080', 'PT-30', 'INR', 'ACTIVE', 'KHASRA NO. 669, VILLAGE SIRASPUR, DELHI, North West Delhi, Delhi, 110042', 'North West Delhi', 'Delhi', '07', '110042', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-129', 'SUP-129', 'NATIONAL STORAGE SYSTEMS', 'COMP-001', 'MATERIAL', '07AEFPA5149D1ZY', 'AEFPA5149D', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ONKAR AGGARWAL', 'onkar_aggarwal@rediffmail.com', '9810514866', 'PT-30', 'INR', 'ACTIVE', 'GROUND FLOOR, B-110,, D.D.A SHED, OKHLA PHASE-1, OKHLA PHASE-1, South Delhi, Delhi, 110020', 'South Delhi', 'Delhi', '07', '110020', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-130', 'SUP-130', 'NEELKANTH MOTORS', 'COMP-001', 'MATERIAL', '07AGCPK3858L1Z2', 'AGCPK3858L', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ANIL KAKAR', 'anilkakkar68@gmail.com', '9811051008', 'PT-30', 'INR', 'ACTIVE', 'Ground Floor, 767/1/25,, CHABI GANJ, KASHMERE GATE, PRAKASH WATI MARKET, North Delhi, Delhi, 110006', 'North Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-131', 'SUP-131', 'Neeru Trading Company', 'COMP-001', 'MATERIAL', '07ABBPS9029D1ZN', 'ABBPS9029D', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Mr.Neeru', NULL, '9810024934', 'PT-30', 'INR', 'ACTIVE', 'P-4,Gali No.10,Anand Parbat Ind.Area,New Delhi-110005', 'New Delhi', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-132', 'SUP-132', 'NEW TECHNO KRAFT', 'COMP-001', 'MATERIAL', '07AAGPJ1771P1ZB', 'AAGPJ1771P', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'RAJESH KUMAR JAIN', NULL, '9212400934', 'PT-30', 'INR', 'ACTIVE', '25/15A GALI NO-6, MASTER MOHALLA, LIBASPUR, North West Delhi, Delhi, 110042', 'North West Delhi', 'Delhi', '07', '110042', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-133', 'SUP-133', 'NIKKYPORE FILTERATION SYSTEMS PRIVATE LIMITED', 'COMP-001', 'MATERIAL', '07AAACN3198B1ZO', 'AAACN3198B', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'NIKKY PORE FILTERATION SYSTEMS P LTD', 'sales@nikkypore@gmail.com', '9311424442', 'PT-30', 'INR', 'ACTIVE', '13/8, MOTI NAGAR, MOTI NAGAR, West Delhi, Delhi, 110015', 'West Delhi', 'Delhi', '07', '110015', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-134', 'SUP-134', 'NIRMAL STICKERS AND LABELS PRIVATE LIMITED', 'COMP-001', 'MATERIAL', '07AAACN4421B1Z4', 'AAACN4421B', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'NIRMAL STICKERS AND LABELS PRIVATE LIMITED', 'nirmalstickers@gmail.com', '9810987650', 'PT-30', 'INR', 'ACTIVE', 'J-4/21, RAJOURI GARDEN, NEW DELHI, West Delhi, Delhi, 110027', 'New Delhi', 'Delhi', '07', '110027', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-135', 'SUP-135', 'NISHIGANDHA POLYMERS P.LTD', 'COMP-001', 'MATERIAL', '06AAACN6044J1ZI', 'AAACN6044J', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'NISHIGANDHA POLYMERS P.LTD', NULL, '8470001384', 'PT-30', 'INR', 'ACTIVE', 'Plot No. 61/5k, Sikand Complex, Industrial Area (NIT) Faridabad -121001', 'Faridabad', 'Haryana', '06', '121001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-136', 'SUP-136', 'NITIN NANDWANI', 'COMP-001', 'MATERIAL', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED', 'TDS-194C', 'NITIN NANDWANI', 'nitinnandwani87@gmail.com', '9896497002', 'PT-30', 'INR', 'ACTIVE', 'Bahalgarh, Sonepat - 131021', 'Sonepat', 'Haryana', '06', '131021', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-137', 'SUP-137', 'OM ELECTRICAL', 'COMP-001', 'MATERIAL', '06GOEPM2600J1Z3', 'GOEPM2600J', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MAYANK MALIK', 'omelectrical2022@gmail.com', '9996672705', 'PT-30', 'INR', 'ACTIVE', 'SHOP NO. 59, Near SBI Bank, HSIIDC, Kundli Industrial Area, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-138', 'SUP-138', 'Opal Research & Analytical Searvices', 'COMP-001', 'MATERIAL', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED', 'TDS-194C', 'Opal Research & Analytical Searvices', 'opal.ras123@gmail.com', '9717557863', 'PT-30', 'INR', 'ACTIVE', 'Basement-1, Near DSR Modern Public Shool, Main G.T. Road Lal Kuan Chhapraula, Ghaziabad-201009', 'Ghaziabad', 'Uttar Pradesh', '09', '201009', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-139', 'SUP-139', 'Panurgy Industries', 'COMP-001', 'MATERIAL', '06EQIPP2405Q1ZD', 'EQIPP2405Q', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Shubham Poddar', 'shubham.poddar@panurgy.in', '9870118883', 'PT-30', 'INR', 'ACTIVE', 'Plot No. 1562, Sonipat, Rai, Rai Industrial Area, Sonipat, Haryana, 131029', 'Sonipat', 'Haryana', '06', '131029', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-140', 'SUP-140', 'PLASTIC & CHEMICALS', 'COMP-001', 'MATERIAL', '07AHLPB5952C1ZK', 'AHLPB5952C', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'PLASTIC & CHEMICALS', 'deepakrubplast@gmail.com', '9312246407', 'PT-30', 'INR', 'ACTIVE', 'GALI NO. 4 , ANAND PARBAT, NEW DELHI - 110005', 'New Delhi', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-141', 'SUP-141', 'PRAGATI TRADE LINKS', 'COMP-001', 'MATERIAL', '06AAPPG3560Q1Z6', 'AAPPG3560Q', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'PRASHANT GUPTA', 'prainorganics@yahoo.com', '9810149515', 'PT-30', 'INR', 'ACTIVE', 'KHASRA NO.1788/1,PLOT NO.KHEWAT NO.70, VILLAGE JATTOLA HALALPUR ROAD,TEHSIL, KHARKHODA. 131103', 'Haryana', 'Haryana', '06', '131103', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-142', 'SUP-142', 'PRAKASH INDUSTRIES', 'COMP-001', 'MATERIAL', '07AHBPA0609F1Z5', 'AHBPA0609F', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SUMIT AWASTHI', 'prakashindustries1980@gmail.com', NULL, 'PT-30', 'INR', 'ACTIVE', 'E-127, SEC-2,DSIDC, BAWANA, New Delhi, Delhi, 110039', 'New Delhi', 'Delhi', '07', '110039', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-143', 'SUP-143', 'PRICESION BARCODE TECHNOLOGY', 'COMP-001', 'MATERIAL', '07AIQPT1894H1ZJ', 'AIQPT1894H', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'HARISH RAM TRIPATHI', 'pbtech21@gmail.com', '8527605887', 'PT-30', 'INR', 'ACTIVE', 'F -50 A, mahavir enclave part 3, Hindustan Search, Uttam Nagar, New Delhi, West Delhi, Delhi, 110059', 'New Delhi', 'Delhi', '07', '110059', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-144', 'SUP-144', 'PRINCE HYDRAULIC WORKS', 'COMP-001', 'MATERIAL', '07ACBPI3068D1Z0', 'ACBPI3068D', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MOHD AKBAR IMAM', 'princehydraulic@gmail.com', '9953533786', 'PT-30', 'INR', 'ACTIVE', 'GROUND FLOOR HOUSE NO 550A/37 PLOT NO.37 KH NO. 206 & 208 LEKHU NAGAR -B ONKAR NAGAR-C TRI NAGAR DELHI-110035', 'Delhi', 'Delhi', '07', '110035', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-145', 'SUP-145', 'R B TRADERS', 'COMP-001', 'MATERIAL', '07AAAFR4907K1Z4', 'AAAFR4907K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'R B TRADERS', 'rbtraders01@hotmail.com', '9810065235', 'PT-30', 'INR', 'ACTIVE', '287/101-102, Phatak Karor, First Floor,Agarsein Market, Ajmeri Gate, Central Delhi, Delhi, 110006', 'Central Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-146', 'SUP-146', 'R. S. INDUSTRIES', 'COMP-001', 'MATERIAL', '07BBMPK3725N1Z7', 'BBMPK3725N', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MANJEET KAUR', NULL, '9873196967', 'PT-30', 'INR', 'ACTIVE', '2CE, ANAND PABAT INDL. AREA, NEW ROHTAK ROAD, New Delhi, Delhi, 110005', 'Rohtak', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-147', 'SUP-147', 'R.K. IRON TRADERS', 'COMP-001', 'MATERIAL', '07AAGPB6833L1ZM', 'AAGPB6833L', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'RAKESH KUMAR BHATIA', 'ujjwalbhatia11@gmail.com', '9810349119', 'PT-30', 'INR', 'ACTIVE', 'S 9 GROUND FLOOR, GALI NO 10, ANAND PARBAT, West Delhi, Delhi, 110005', 'West Delhi', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-148', 'SUP-148', 'R.V. Enterprises', 'COMP-001', 'MATERIAL', '08AHVPV8673L1ZX', 'AHVPV8673L', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'R.V. Enterprises', 'salesrventerprises639@gmail.com', '8769586826', 'PT-30', 'INR', 'ACTIVE', 'Near Namdev School, SuthalaChopasni Road,Jodhpur,Rajasthan', 'Jodhpur', 'Rajasthan', '08', NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-149', 'SUP-149', 'RAJ ELECTRIC STORE', 'COMP-001', 'MATERIAL', '06AAVPG8194L1ZU', 'AAVPG8194L', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'PRATEEK', 'rajelectric.kundli@gmail.com', '9253009569', 'PT-30', 'INR', 'ACTIVE', 'SHOP 29, HSIIDC SHOPING COMPLEX, KUNDLI, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-150', 'SUP-150', 'RAM KISHORE SACHIN KUMAR', 'COMP-001', 'MATERIAL', '06AGZPM4817G1ZX', 'AGZPM4817G', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SACHIN MANGLA', 'sachinmangla2010@gmail.com', '9212567929', 'PT-30', 'INR', 'ACTIVE', 'RAM KISHORE SACHIN KUMAR G.T.KARNAL ROAD, OPP. HSIIDC INDL.GATE KUNDLI SONEPAT HARYANA-131028', 'Sonepat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-151', 'SUP-151', 'RAMSONS ENTERPRISES', 'COMP-001', 'MATERIAL', '07AAIPG0615P1ZN', 'AAIPG0615P', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'DALIP KUMAR GAUR', 'dalipgaur2@yahoo.com', '9811889574', 'PT-30', 'INR', 'ACTIVE', 'GROUND FLOOR, SHOP NO-1, GURU RAM DAS BHAWAN, RANJIT NAGAR, RANJIT NAGAR, West Delhi, Delhi, 110008', 'West Delhi', 'Delhi', '07', '110008', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-152', 'SUP-152', 'RANCO POLY BAGS', 'COMP-001', 'MATERIAL', '06ACIPV3112E1ZV', 'ACIPV3112E', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MOHAN LAL VERMA', 'info@rancopolybags.com', '9818107764', 'PT-30', 'INR', 'ACTIVE', 'MCF-2644,BLOCK-E,SANJAY COLONY,SECTOR-23,FARIDABAD-121005(HR)', 'Faridabad', 'Haryana', '06', '121005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-153', 'SUP-153', 'RATHNA PACKAGING INDIA PRIVATE LIMITED', 'COMP-001', 'MATERIAL', '33AADCR2300J1ZV', 'AADCR2300J', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'RATHNA PACKAGING INDIA PRIVATE LIMITED', 'sales-coord3@rathnagroup.in', '8220788867', 'PT-30', 'INR', 'ACTIVE', 'PHASE-1, PLOT NO 55A,59A, MOOKANDAPALLI POST, SIPCOT INDUSTRIAL COMPLEX, Hosur, Krishnagiri, Tamil Nadu, 635126', 'Hosur', 'Tamil Nadu', '33', '635126', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-154', 'SUP-154', 'RISHIROOP LIMITED', 'COMP-001', 'MATERIAL', '27AAACP6283F1ZC', 'AAACP6283F', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'RISHIROOP LIMITED', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', 'Plot No W-75-A and W-76-A, Rishiroop Limited, Near Mahindra Sona, MIDC, Satpur, Nashik, Nashik, Maharashtra, 422007', 'Nashik', 'Maharashtra', '27', '422007', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-155', 'SUP-155', 'RISHIROOP POLYMERS PRIVATE LIMITED', 'COMP-001', 'MATERIAL', '27AAACR1789G1Z7', 'AAACR1789G', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'RISHIROOP POLYMERS PRIVATE LIMITED', 'dsharma@rishiroop.com', '9967993637', 'PT-30', 'INR', 'ACTIVE', '6TH FLOOR, 65, ATLANTA, NARIMAN POINT, NARIMAN POINT, Mumbai, Maharashtra, 400021', 'Mumbai', 'Maharashtra', '27', '400021', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-156', 'SUP-156', 'ROHIT TRADERS', 'COMP-001', 'MATERIAL', '07AAHFR8004L1ZZ', 'AAHFR8004L', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ROHIT TRADERS', 'khannapankaj94@gmail.com', '9811600223', 'PT-30', 'INR', 'ACTIVE', 'PLOT NO-50/17, C-6A, GALI NO-1, ANAND PARBAT INDUSTRIAL AREA, Central Delhi, Delhi, 110005', 'Central Delhi', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-157', 'SUP-157', 'ROYAL ENTERPRISES', 'COMP-001', 'MATERIAL', '07AASPD1557H1ZM', 'AASPD1557H', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'INDU DETWANI', 'pckinindia@gmail.com', '9212535706', 'PT-30', 'INR', 'ACTIVE', 'Plot No. 84/15, Street No. 2A, Mundka Ind. Area, New Delhi - 110041', 'New Delhi', 'Delhi', '07', '110041', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-158', 'SUP-158', 'RUBBER CHEMICAL CENTRE', 'COMP-001', 'MATERIAL', '07AAOPS3739G1Z9', 'AAOPS3739G', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'DHURV SATIJA', 'info@chemicalcentre.in', '8810329246', 'PT-30', 'INR', 'ACTIVE', 'B-9/70, RAMA ROAD, INDUSTRIAL AREA, New Delhi, Delhi, 110015', 'New Delhi', 'Delhi', '07', '110015', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-159', 'SUP-159', 'S G M GLOBAL', 'COMP-001', 'MATERIAL', '07AACPC8321N1ZQ', 'AACPC8321N', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MANMEET SINGH CHADHA', 'sgmautoparts@gmail.com', NULL, 'PT-30', 'INR', 'ACTIVE', 'WZ-75B, TODAPUR, DELHI, West Delhi, Delhi, 110012', 'West Delhi', 'Delhi', '07', '110012', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-160', 'SUP-160', 'S.K.AUTO INDUSTRIES', 'COMP-001', 'MATERIAL', '07BPIPK3457B1Z2', 'BPIPK3457B', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'MANOJ BHAI', NULL, '9910730311', 'PT-30', 'INR', 'ACTIVE', 'M-531-P/20,Gali No.4D,Anand Parbat Indl.Area,New Delhi-110005', 'New Delhi', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-161', 'SUP-161', 'S.K.AUTO INDUSTRIES (INDIA)', 'COMP-001', 'MATERIAL', '07AAGPK5872Q1ZY', 'AAGPK5872Q', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SURESH KUMAR', NULL, '9810493826', 'PT-30', 'INR', 'ACTIVE', '326/5, PUNJA SHARIF, KASHMERE GATE, DELHI, Central Delhi, Delhi, 110006', 'Central Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-162', 'SUP-162', 'SAI SCIENTIFIC SUPPLIERS', 'COMP-001', 'MATERIAL', '08BPFPS8547R1ZP', 'BPFPS8547R', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ARUN SHARMA', 'suppliers@yahoo.com', '8696405599', 'PT-30', 'INR', 'ACTIVE', 'Plot No. - 48, Gali No. - 4, Darukutta Mohalla, Alwar, Rajasthan, 301001', 'Rajasthan', 'Rajasthan', '08', '301001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-163', 'SUP-163', 'SAKSHAM ENTERPRISES', 'COMP-001', 'MATERIAL', '07CRLPK9684G1Z3', 'CRLPK9684G', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SHAILENDRA KUMAR', NULL, '9015164732', 'PT-30', 'INR', 'ACTIVE', '131, VILL BADLI, NEAR PRIMARY SCHOOL, NORTH WEST, DELHI-110042', 'Delhi', 'Delhi', '07', '110042', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-164', 'SUP-164', 'Samvivaan Surya India Pvt. Ltd.', 'COMP-001', 'MATERIAL', '09AAZCS8982P1ZN', 'AAZCS8982P', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Rohit', NULL, '9870884771', 'PT-30', 'INR', 'ACTIVE', 'A-126,Sector-80,Ph-II,Noida,Gautam Buddha Nagar-201305', 'Noida', 'Uttar Pradesh', '09', '201305', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-165', 'SUP-165', 'SANJEEV INDUSTRIAL CORPORATION', 'COMP-001', 'MATERIAL', '06ABSFS0140G1Z9', 'ABSFS0140G', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SANJEEV INDUSTRIAL CORPORATION - (2024-25)', 'INFO@SANJEEVINDUSTRIAL.COM', '9599981386', 'PT-30', 'INR', 'ACTIVE', 'B-146-149, NEHRU GROUND NIT FARIDABAD-121001', 'Faridabad', 'Haryana', '06', '121001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-166', 'SUP-166', 'SHAMMI BEARING STORE', 'COMP-001', 'MATERIAL', '07AABPL9382K1Z9', 'AABPL9382K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'NARINDER LAL', NULL, '9958422090', 'PT-30', 'INR', 'ACTIVE', 'WS-18, SHAMMI BEARING STORE, PHASE-II, MAYA PURI, South West Delhi, Delhi, 110064', 'West Delhi', 'Delhi', '07', '110064', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-167', 'SUP-167', 'SHARMA STATIONERY MART', 'COMP-001', 'MATERIAL', '06CNTPB8881J1ZA', 'CNTPB8881J', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'PRAMOD BHARDWAJ', NULL, '9990100351', 'PT-30', 'INR', 'ACTIVE', 'GROUND FLOOR, PIO MANYARI, KUNDLI, KUNDALI, SONIPAT,Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-168', 'SUP-168', 'SHARP DIGITAL PRINTS PVT.LTD', 'COMP-001', 'MATERIAL', '07AAMCS9567P1Z5', 'AAMCS9567P', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SHARP DIGITAL PRINTS PVT.LTD', 'Info.Sharp2007@gmail.Com', '8130840747', 'PT-30', 'INR', 'ACTIVE', '111, DEEP SHIKHA BUILDING RAJENDRA PLACE , NEW DELHI -110008', 'New Delhi', 'Delhi', '07', '110008', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-169', 'SUP-169', 'SHARP TOOLS INDUSTRY', 'COMP-001', 'MATERIAL', '07AIGPG2857H1Z9', 'AIGPG2857H', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'UMESH GUPTA', 'sharptoolsindustry@gmail.com', '9810279401', 'PT-30', 'INR', 'ACTIVE', 'JG-2,738-A,VIKASPURI,,NEW .DELHI-110018', 'Delhi', 'Delhi', '07', '110018', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-170', 'SUP-170', 'SHINE CARBON AND CHEMICALS PRIVATE LIMITED', 'COMP-001', 'MATERIAL', '03ABCCS1794D1ZL', 'ABCCS1794D', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SHINE CARBON AND CHEMICALS PRIVATE LIMITED', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', '2nd Floor, 181, Industrial Area -A, Ludhiana, Ludhiana, Punjab, 141003', 'Ludhiana', 'Punjab', '03', '141003', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-171', 'SUP-171', 'SHINE CARBON AND CHEMICALS PRIVATE LIMITED', 'COMP-001', 'MATERIAL', '03ABCCS1794D1ZL', 'ABCCS1794D', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Utkarsh', NULL, '9811499529', 'PT-30', 'INR', 'ACTIVE', '2nd Floor, 181, Industrial Area -A, Ludhiana, Ludhiana, Punjab, 141003', 'Ludhiana', 'Punjab', '03', '141003', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-172', 'SUP-172', 'SHIVAM STATIONARY MART', 'COMP-001', 'MATERIAL', '06AASPA3211D1ZC', 'AASPA3211D', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'ARUN ARORA', 'arora.entp@gmail.com', '9812127506', 'PT-30', 'INR', 'ACTIVE', 'SHOP NO-7, HSIDC KUNDLI, SONIPAT, Sonipat, Haryana, 131001', 'Sonipat', 'Haryana', '06', '131001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-173', 'SUP-173', 'SHREE KRISHNA ENTERPRISES', 'COMP-001', 'MATERIAL', '07AKXPP9937E1ZA', 'AKXPP9937E', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'VINIT JEE', NULL, '8295822788', 'PT-30', 'INR', 'ACTIVE', '1st Floor, I-199, Sector-1 DSIIDC, Bawana, North West Delhi, Delhi, 110039', 'North West Delhi', 'Delhi', '07', '110039', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-174', 'SUP-174', 'SHREE STEELS', 'COMP-001', 'MATERIAL', '07AHWPG0437A1ZM', 'AHWPG0437A', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'VARUN AJAY GUPTA', 'shreesteelsdelhi@gmail.com', '9999336962', 'PT-30', 'INR', 'ACTIVE', 'Ground Floor, Plot no.- 20/21, GALI NO.- 28, Railway line side, Opp. Gali No.-4, Anand Parvat, Central Delhi, Delhi, 110005', 'Central Delhi', 'Delhi', '07', '110005', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-175', 'SUP-175', 'SHRI BALAJI SYNTHETIC', 'COMP-001', 'MATERIAL', '06ADMFS9735R1ZX', 'ADMFS9735R', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SHRI BALAJI SYNTHETICS', 'shribalaji.gfl@gmail.com', '9810925615', 'PT-30', 'INR', 'ACTIVE', 'HNO-1912, SECTOR-4, GURGAON, Haryana, 122001', 'Gurgaon', 'Haryana', '06', '122001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-176', 'SUP-176', 'SHRI KRISHNA PLASTICS', 'COMP-001', 'MATERIAL', '06AEEFS4198D1ZX', 'AEEFS4198D', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SHRI KRISHNA PLASTICS', NULL, '9810348393', 'PT-30', 'INR', 'ACTIVE', 'NEAR MALWA PETROL PUMP, LANDA COLONY, GT ROAD, KUNDLI', 'Kundli', 'Haryana', '06', NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-177', 'SUP-177', 'Shri Parasnath Enterprises', 'COMP-001', 'MATERIAL', '07AMGPJ0416K1Z8', 'AMGPJ0416K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Shri Parasnath Enterprises', NULL, '8178405071', 'PT-30', 'INR', 'ACTIVE', 'E-699,Chhajjupur, Babapur,Sanjay Gandhi Marg,Shahdara, New Delhi-110032', 'New Delhi', 'Delhi', '07', '110032', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-178', 'SUP-178', 'SHRI RAM TRADING CO.', 'COMP-001', 'MATERIAL', '06COBPS6883Q1ZX', 'COBPS6883Q', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'JAIDEV SHARMA', NULL, '8930745985', 'PT-30', 'INR', 'ACTIVE', 'VILLAGE KHATKAR, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-179', 'SUP-179', 'Shri Sai Digital Technologies', 'COMP-001', 'MATERIAL', '06CAVPK0893A1ZL', 'CAVPK0893A', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'AMIT KUMAR', NULL, '9255541192', 'PT-30', 'INR', 'ACTIVE', 'BEHIND BUS STAND, ADARSH NAGAR, Sonipat, Haryana, 131001', 'Sonipat', 'Haryana', '06', '131001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-180', 'SUP-180', 'SHRI SWASTIK COMPUTERS', 'COMP-001', 'MATERIAL', '07AJOPJ9334K1ZN', 'AJOPJ9334K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SANDEEP KUMAR JAIN', 'shriswastikcomp@gmail.com', '9910581052', 'PT-30', 'INR', 'ACTIVE', 'Basement Floor Plot No. 33, B-2, Ajay Tower Community Centre, Wazirpur Industrial Area, New Delhi, North West Delhi, Delhi, 110052', 'New Delhi', 'Delhi', '07', '110052', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-181', 'SUP-181', 'SHWETA PRINT PACK PRIVATE LIMITED', 'COMP-001', 'MATERIAL', '27AAECS0136L1ZC', 'AAECS0136L', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SHWETA PRINT PACK PVT LTD', 'ashok.daive@shwetaprintpack.com', '9822540691', 'PT-30', 'INR', 'ACTIVE', 'F104, Shweta Print Pack Pvt Ltd, MIDC Area, Satpur, Nashik, Maharashtra, 422007', 'Nashik', 'Maharashtra', '27', '422007', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-182', 'SUP-182', 'SILICA HOUSE PVT.LTD.', 'COMP-001', 'MATERIAL', '07AAECS5472P1ZP', 'AAECS5472P', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SILICA HOUSE PVT.LTD.', 'silicahouse@yahoo.com', '9971245747', 'PT-30', 'INR', 'ACTIVE', '301,SUNEJA TOWER-2,DISTRICT CENTRE,JANAKPURI, NEW DELHI-110058', 'New Delhi', 'Delhi', '07', '110058', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-183', 'SUP-183', 'SILVER MULLER RUBBER LIMITED', 'COMP-001', 'MATERIAL', '06AARCS3816N1ZQ', 'AARCS3816N', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SILVER MULLER RUBBER LIMITED', 'purchase@silvermuller.com', '8199998710', 'PT-30', 'INR', 'ACTIVE', 'PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, KUNDLI, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-184', 'SUP-184', 'SIMON POLYMERS', 'COMP-001', 'MATERIAL', '24ABNFS6883R1ZZ', 'ABNFS6883R', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SIMON POLYMERS', 'simonpolymers@gmail.com', '9601166466', 'PT-30', 'INR', 'ACTIVE', '21/2, Bharatkhand Mill Compound, Amdupura, Naroda Road, Ahmedabad, Ahmedabad, Gujarat, 380016', 'Ahmedabad', 'Gujarat', '24', '380016', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-185', 'SUP-185', 'SLACH HYDRATECH EQUIPMENT PVT LTD.', 'COMP-001', 'MATERIAL', '06AABCS4101Q1ZC', 'AABCS4101Q', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'YOGESH YADAV', 'info.slachhydratecs@mail.com', '9717135168', 'PT-30', 'INR', 'ACTIVE', 'PLANT NO 2, BEGAMPUR KHATOLA, BEHRAMPUR ROAD, SECTOR 74, Gurugram, Haryana, 122001', 'Gurugram', 'Haryana', '06', '122001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-186', 'SUP-186', 'SMS - Tool Room', 'COMP-001', 'MATERIAL', '06AFBFS8991J1ZC', 'AFBFS8991J', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Mukhtar Hussain', 'engineering1@silverseals.co', '9312675730', 'PT-30', 'INR', 'ACTIVE', 'PLOT NO.413, EPIP, PHASE-3, SECTOR-53, HSIIDC INDUSTRIAL AREA, KUNDLI-131028, DISTT- SONEPAT', 'Sonepat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-187', 'SUP-187', 'SOFTECH SOLUTIONS', 'COMP-001', 'MATERIAL', '06APPPK0055F1Z2', 'APPPK0055F', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'PANKAJ KUMAR', 'tyagi.sts@gmail.com, stskundlisales@gmail.com', '8222845536', 'PT-30', 'INR', 'ACTIVE', 'SCO 40, Above Andhra Bank of India, HSIIDC, Kundli', 'Kundli', 'Haryana', '06', NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-188', 'SUP-188', 'SR PRINTING PRESS', 'COMP-001', 'MATERIAL', '06BLXPT1889D1ZC', 'BLXPT1889D', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'DEEPAK TUSHIR', NULL, '9416851965', 'PT-30', 'INR', 'ACTIVE', 'FINNPACK MARKET, JANTI ROAD, LAKHMI PIOU,KUNDLI, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-189', 'SUP-189', 'SS PACKERS', 'COMP-001', 'MATERIAL', '09APGPC5607N1ZO', 'APGPC5607N', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Shilpa chawla', 'sspackers99@gmail.com', '9873604345', 'PT-30', 'INR', 'ACTIVE', 'S- 69, SITE IV INDUSTRIAL AREA, SAHIBABAD, Ghaziabad, Uttar Pradesh, 201010', 'Ghaziabad', 'Uttar Pradesh', '09', '201010', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-190', 'SUP-190', 'SS Plastopack Industries', 'COMP-001', 'MATERIAL', '07ACLFS8655E1ZO', 'ACLFS8655E', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SS Plastopack Industries', 'ssplastopackindustries@gmail.com', '9899065756', 'PT-30', 'INR', 'ACTIVE', 'F/1856, DSIIDC IND. AREA, NARELA, North Delhi, Delhi, 110040', 'North Delhi', 'Delhi', '07', '110040', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-191', 'SUP-191', 'SS Plastopack Industries', 'COMP-001', 'MATERIAL', '07ACLFS8655E1ZO', 'ACLFS8655E', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SS Plastopack Industries', 'ssplastopackindustries@gmail.com', '9899065756', 'PT-30', 'INR', 'ACTIVE', 'F-1856,DSIDC Indl Area,Narela,Delhi-110040', 'Delhi', 'Delhi', '07', '110040', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-192', 'SUP-192', 'SUN SALES CORPORATION', 'COMP-001', 'MATERIAL', '07AJZPB6558L1ZE', 'AJZPB6558L', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'BHUPINDER SINGH BHAMRA', NULL, '9811643898', 'PT-30', 'INR', 'ACTIVE', '2784/1,KRISHNA MOTOR MARKET, KASHMERE GATE DELHI-110006', 'Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-193', 'SUP-193', 'SURENDRA ELASTOMERS PVT. LTD.', 'COMP-001', 'MATERIAL', '06AAFCS3922F2ZJ', 'AAFCS3922F', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SURENDRA ELASTOMERS PVT. LTD.', 'delhi@sriimpex.com', '9818206136', 'PT-30', 'INR', 'ACTIVE', '2nd Floor, 225, Paras Trade Centre, Gwal Pahari, Gurgaon Faridabad Road, Gurgaon, Gurugram, Haryana, 122002', 'Faridabad', 'Haryana', '06', '122002', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-194', 'SUP-194', 'SVR AUTO INDUSTRIES', 'COMP-001', 'MATERIAL', '07ABSFS3475N1Z8', 'ABSFS3475N', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SVR AUTO INDUSTRIES', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', 'PLOT NO 52, NAWADA INDUSTRIAL AREA, NAWADA LAL DORA KH. NO. 665, West Delhi, Delhi, 110059', 'West Delhi', 'Delhi', '07', '110059', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-195', 'SUP-195', 'Tarun Hose & Engg Works', 'COMP-001', 'MATERIAL', '07AAHPB2568b1z6', 'AAHPB2568b', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', NULL, 'sales@tarun-hose.com', '9818575858', 'PT-30', 'INR', 'ACTIVE', 'D-40, Phase-2 Mayapuri Ind. Area., New Delhi 110064', 'New Delhi', 'Delhi', '07', '110064', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-196', 'SUP-196', 'TOTAL MARKETING SUPPORT INDIA PVT.LTD.', 'COMP-001', 'MATERIAL', '27AAFCT7961D1Z4', 'AAFCT7961D', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'TOTAL MARKETING SUPPORT INDIA PVT.LTD.', NULL, '9911770213', 'PT-30', 'INR', 'ACTIVE', '12A, Marwadi Chawl, Mahadevbhai Desai Road, Near Railway Power House, Kandivali East, Mumbai, Mumbai Suburban, Maharashtra-400101', 'Mumbai', 'Maharashtra', '27', '400101', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-197', 'SUP-197', 'Trishla Enterprises', 'COMP-001', 'MATERIAL', '06CQXPA6675E1ZG', 'CQXPA6675E', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'Yash Aggarwal', 'trishlaenterprises23@gmail.com', '7011779145', 'PT-30', 'INR', 'ACTIVE', '58, Bone Mill Complex Near Railway Flyover,Ballabrargh-1210004', 'Haryana', 'Haryana', '06', NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-198', 'SUP-198', 'United Micro Tech Engineering', 'COMP-001', 'MATERIAL', '33AADFU9375P1ZD', 'AADFU9375P', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'United Micro Tech Engineering', 'united.umte@gmail.com', NULL, 'PT-30', 'INR', 'ACTIVE', 'A.R.Weigh Bridge Back Side,Kundrathur,Chennai-600069 Tamilnadu', 'Chennai', 'Tamil Nadu', '33', '600069', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-199', 'SUP-199', 'V.R.ENGINEERING WORKS', 'COMP-001', 'MATERIAL', '07BQNPV4148Q1ZR', 'BQNPV4148Q', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'V.R.ENGINEERING WORKS', 'vishalsuns049@gmail.com', '7982229353', 'PT-30', 'INR', 'ACTIVE', 'GF-73/6,CHETAN BASTI,GALI NO.12,TALIWAN DERA,ANAND PARBAT', 'Delhi', 'Delhi', '07', NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-200', 'SUP-200', 'VANDS ENGINEERING SOLUTIONS', 'COMP-001', 'MATERIAL', '07ALLPC1925A1ZP', 'ALLPC1925A', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'CHAWLA JEE', 'vandsengg@gmail.com', '9990730939', 'PT-30', 'INR', 'ACTIVE', 'KH. NO. 82/11/1, FIRST FLOOR, FIRNI ROAD, MUNDKA', 'Delhi', 'Delhi', '07', NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-201', 'SUP-201', 'VARDHMAN ENTERPRISES', 'COMP-001', 'MATERIAL', '07AKXPJ9681M1ZY', 'AKXPJ9681M', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'PRAVEEN', 'kapilljainji23@gmail.com', '9310201381', 'PT-30', 'INR', 'ACTIVE', 'T-31/5,GROUND FLOOR,GALI NO.10,ANAND PARBAT', 'Delhi', 'Delhi', '07', NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-202', 'SUP-202', 'VEER HYDRAULIC', 'COMP-001', 'MATERIAL', '09DUYPK1454B1ZD', 'DUYPK1454B', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'VIMALESH KUMARI', 'veerhydraulics2017@gmail.com', '9654008521', 'PT-30', 'INR', 'ACTIVE', 'SEVENTH FLOOR, AHS-728, PLOT NO 1 BY 2 SUB DIVIDED PLOT NO 1, SOUTH SIDE G T ROAD, GHAZIABAD, Ghaziabad, Uttar Pradesh, 201001', 'Ghaziabad', 'Uttar Pradesh', '09', '201001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-203', 'SUP-203', 'VEER TRADING COMPANY', 'COMP-001', 'MATERIAL', '06BANPK1100M1ZV', 'BANPK1100M', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'AJIT KUMAR', 'veertrading0724@gmail.com', '9911891268', 'PT-30', 'INR', 'ACTIVE', '1ST FLOOR KUNDLI, PLOT NO-29, G.T ROD LAKHMI PIOU, TEHSIL RAI, Kundli Industrial Area, Sonipat, Haryana, 131028', 'Sonipat', 'Haryana', '06', '131028', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-204', 'SUP-204', 'VERMA TOOL HARDWARE AND ALLOY', 'COMP-001', 'MATERIAL', '06AAWFV1539P1Z8', 'AAWFV1539P', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'VERMA TOOL HARDWARE AND ALLOY', 'vthaindia@gmail.com', '9811143278', 'PT-30', 'INR', 'ACTIVE', 'PLOT NO. 85/20-21-22 & 86/16, KUNDLI, NH-44, GT ROAD, DIST.SONEPAT, HARYANA 131023', 'Sonepat', 'Haryana', '06', '131023', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-205', 'SUP-205', 'VIKAS ENGINEERING WORKS', 'COMP-001', 'MATERIAL', '07AFBPN0177K1ZE', 'AFBPN0177K', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'SARITA NIJHARA', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', 'GROUND FLOOR, 3247, DOOR WALI, RAM BAZAR, MORI GATE, Central Delhi, Delhi, 110006', 'Central Delhi', 'Delhi', '07', '110006', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-206', 'SUP-206', 'WELEX HYDRAULICS INC.', 'COMP-001', 'MATERIAL', '24BCWPD1239F1ZQ', 'BCWPD1239F', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'AANIBEN VERGHESEBHAI DANIEL', 'welexhydraulic@gmail.com', '7405056832', 'PT-30', 'INR', 'ACTIVE', '096, MAHADEV IND. ESTATE V-2, CELLULOZA COMPOUND,, C.T.M. RAMOL ROAD, Ahmedabad, Gujarat, 380026', 'Ahmedabad', 'Gujarat', '24', '380026', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-207', 'SUP-207', 'WELL TRIED ENTERPRISES', 'COMP-001', 'MATERIAL', '07BGEPR1134F1ZO', 'BGEPR1134F', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'PRAS RAM', NULL, '8587050492', 'PT-30', 'INR', 'ACTIVE', 'G/F, S NO-344-A, PUNJA SHARIF, KASHMIRI GATE, Central Delhi, Delhi, 110094', 'Central Delhi', 'Delhi', '07', '110094', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-208', 'SUP-208', 'WEST COAST POLYTECH LLP', 'COMP-001', 'MATERIAL', '06AADFW8165H1ZV', 'AADFW8165H', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'WEST COAST POLYTECH LLP', NULL, NULL, 'PT-30', 'INR', 'ACTIVE', 'Ground Floor, 2-J/52-B, B.P., NEW INDUSTRIAL TOWN, Faridabad, Haryana, 121001', 'Faridabad', 'Haryana', '06', '121001', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
INSERT INTO public.supplier_master (supplier_id, supplier_code, supplier_name, company_id, supplier_type, gstin, pan, udyam_no, msme_category, gst_registration_type, tds_section_id, contact_person, email, phone, payment_terms_id, currency, status, address, city, state, state_code, pincode, created_by, updated_by) VALUES ('SUP-209', 'SUP-209', 'ZAARA ENTERPRISES', 'COMP-001', 'MATERIAL', '09DJQPR6959R1ZJ', 'DJQPR6959R', NULL, 'NOT_MSME', 'REGISTERED', 'TDS-194C', 'RUKSAAR', 'zaaraenterprises1@gmail.com', '9625029929', 'PT-30', 'INR', 'ACTIVE', '442 MG road Dehra Dhaulana,Dist Hapur, 245301', 'Hapur', 'Uttar Pradesh', '09', '245301', 'SYSTEM', 'SYSTEM')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    gst_registration_type = EXCLUDED.gst_registration_type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    state_code = EXCLUDED.state_code,
    pincode = EXCLUDED.pincode,
    updated_at = CURRENT_TIMESTAMP;
