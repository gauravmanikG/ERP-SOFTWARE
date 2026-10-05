import csv
import re
import os
import subprocess

SOURCE_CSV = r"C:\Users\gaura\.gemini\antigravity-ide\brain\e827fc9b-2d4d-45e2-bef4-a23d120d9d9b\.user_uploaded\media_1791189370313.csv"
OUT_SQL = r"c:\Users\gaura\Downloads\silver-muller-seals\backend\src\main\resources\vendor_master.sql"
OUT_CSV = r"c:\Users\gaura\Downloads\silver-muller-seals\backend\src\main\resources\vendor_book5_clean.csv"

STATE_MAP = {
    'HARYANA': ('Haryana', '06'),
    'HARYANA ': ('Haryana', '06'),
    'DELHI': ('Delhi', '07'),
    'GUJRAT': ('Gujarat', '24'),
    'PUNJAB': ('Punjab', '03'),
    'RAJASTHAN': ('Rajasthan', '08'),
    'UTTER PARDESH': ('Uttar Pradesh', '09'),
    'MAHARASHTRA': ('Maharashtra', '27'),
    'TAMIL NADU': ('Tamil Nadu', '33'),
    'HYDERABAD': ('Telangana', '36'),
    'KARNATAKA': ('Karnataka', '29'),
    'UTTARAKHAND': ('Uttarakhand', '05'),
    'BIHAR': ('Bihar', '10'),
    'INDIA': ('All India', '')
}

def clean_text(s):
    if not s:
        return ''
    # Replace unicode replacement characters or smart quotes
    s = s.replace('\ufffd', '-').replace('\u2013', '-').replace('\u2014', '-')
    s = s.replace('\u2018', "'").replace('\u2019', "'").replace('\u201c', '"').replace('\u201d', '"')
    return s.strip()

def escape_sql(val):
    if val is None or val == '':
        return 'NULL'
    # Escape single quotes
    clean = val.replace("'", "''")
    return f"'{clean}'"

def extract_city(address, state):
    # Common cities in NCR / vendor hubs
    common_cities = [
        'Sonipat', 'Sonepat', 'Kundli', 'Faridabad', 'Gurgaon', 'Gurugram', 'Bahadurgarh', 
        'Rohtak', 'Panipat', 'Jhajjar', 'New Delhi', 'North West Delhi', 'Central Delhi', 
        'South Delhi', 'West Delhi', 'North Delhi', 'East Delhi', 'Delhi', 'Noida', 
        'Greater Noida', 'Ghaziabad', 'Hapur', 'Ludhiana', 'Mohali', 'Rajkot', 'Ahmedabad', 
        'Jodhpur', 'Nashik', 'Mumbai', 'Hosur', 'Kashipur', 'Hyderabad', 'Bangalore', 'Bengaluru', 'Chennai'
    ]
    addr_upper = address.upper()
    for c in common_cities:
        if c.upper() in addr_upper:
            return c
    return state

with open(SOURCE_CSV, 'r', encoding='utf-8', errors='replace') as f:
    reader = csv.reader(f)
    header = next(reader)
    rows = list(reader)

clean_rows = []
for idx, r in enumerate(rows, 1):
    vname = clean_text(r[0])
    contact = clean_text(r[1])
    if contact in ('0', '-', 'None'):
        contact = ''
    phone = clean_text(r[2])
    if phone in ('0', '-', 'None'):
        phone = ''
    email = clean_text(r[3])
    if email in ('0', '-', '.', 'None'):
        email = ''
    address = clean_text(r[4])
    gstin_raw = clean_text(r[5])
    gstin = re.sub(r'\s+', '', gstin_raw)
    state_raw = clean_text(r[6]).upper()
    
    std_state, default_sc = STATE_MAP.get(state_raw, (clean_text(r[6]).title(), ''))
    
    state_code = ''
    pan = ''
    if len(gstin) >= 15 and gstin[:2].isdigit():
        state_code = gstin[:2]
        pan = gstin[2:12]
        reg_type = 'REGISTERED'
    elif gstin in ('NO_GST', '-', '') or not gstin:
        reg_type = 'UNREGISTERED'
        gstin = ''
        state_code = default_sc
    else:
        reg_type = 'REGISTERED'
        state_code = default_sc
        if len(gstin) >= 10:
            # Check if alphanumeric 10 chars like PAN
            pan_match = re.search(r'[A-Z]{5}[0-9]{4}[A-Z]', gstin)
            if pan_match:
                pan = pan_match.group(0)
    
    # Extract pincode
    pin_match = re.search(r'\b[1-9][0-9]{5}\b', address)
    pincode = pin_match.group(0) if pin_match else ''
    
    city = extract_city(address, std_state)
    
    supplier_code = f"SUP-{idx:03d}"
    supplier_id = supplier_code
    
    clean_rows.append({
        'supplier_id': supplier_id,
        'supplier_code': supplier_code,
        'supplier_name': vname,
        'company_id': 'COMP-001',
        'supplier_type': 'MATERIAL',
        'gstin': gstin,
        'pan': pan,
        'udyam_no': '',
        'msme_category': 'NOT_MSME',
        'gst_registration_type': reg_type,
        'tds_section_id': 'TDS-194C',
        'contact_person': contact,
        'email': email,
        'phone': phone,
        'payment_terms_id': 'PT-30',
        'currency': 'INR',
        'status': 'ACTIVE',
        'address': address,
        'city': city,
        'state': std_state,
        'state_code': state_code,
        'pincode': pincode,
        'created_by': 'SYSTEM',
        'updated_by': 'SYSTEM'
    })

# Write clean CSV
os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
with open(OUT_CSV, 'w', encoding='utf-8', newline='') as f:
    fieldnames = list(clean_rows[0].keys())
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(clean_rows)

print(f"Clean CSV written with {len(clean_rows)} rows to {OUT_CSV}")

# Generate SQL Script
sql_lines = [
    "-- =============================================================================",
    "-- Supplier / Vendor Master Schema & Data Migration",
    "-- Incorporates all Book 3 attributes & Book 5 attributes (address, city, state, state_code, pincode)",
    "-- =============================================================================",
    "",
    "CREATE TABLE IF NOT EXISTS public.supplier_master (",
    "    id BIGSERIAL PRIMARY KEY,",
    "    supplier_id VARCHAR(50) NOT NULL UNIQUE,",
    "    supplier_code VARCHAR(50) NOT NULL UNIQUE,",
    "    supplier_name VARCHAR(255) NOT NULL,",
    "    company_id VARCHAR(50) NOT NULL DEFAULT 'COMP-001',",
    "    supplier_type VARCHAR(50) DEFAULT 'MATERIAL',",
    "    gstin VARCHAR(50),",
    "    pan VARCHAR(30),",
    "    udyam_no VARCHAR(50),",
    "    msme_category VARCHAR(50) DEFAULT 'NOT_MSME',",
    "    gst_registration_type VARCHAR(50) NOT NULL DEFAULT 'REGISTERED',",
    "    tds_section_id VARCHAR(50) DEFAULT 'TDS-194C',",
    "    contact_person VARCHAR(255),",
    "    email VARCHAR(255),",
    "    phone VARCHAR(50),",
    "    payment_terms_id VARCHAR(50) DEFAULT 'PT-30',",
    "    currency VARCHAR(10) DEFAULT 'INR',",
    "    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',",
    "    address TEXT,",
    "    city VARCHAR(100),",
    "    state VARCHAR(100),",
    "    state_code VARCHAR(10),",
    "    pincode VARCHAR(20),",
    "    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,",
    "    created_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',",
    "    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,",
    "    updated_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM'",
    ");",
    "",
    "CREATE INDEX IF NOT EXISTS idx_supplier_code ON public.supplier_master(supplier_code);",
    "CREATE INDEX IF NOT EXISTS idx_supplier_name ON public.supplier_master(supplier_name);",
    "CREATE INDEX IF NOT EXISTS idx_supplier_gstin ON public.supplier_master(gstin);",
    "CREATE INDEX IF NOT EXISTS idx_supplier_state ON public.supplier_master(state);",
    "",
    "-- Create vendor_master view for seamless access under both names",
    "CREATE OR REPLACE VIEW public.vendor_master AS SELECT * FROM public.supplier_master;",
    "",
    "-- Also create table in sms_inventory schema if it exists",
    "DO $$",
    "BEGIN",
    "    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'sms_inventory') THEN",
    "        CREATE TABLE IF NOT EXISTS sms_inventory.supplier_master (LIKE public.supplier_master INCLUDING ALL);",
    "        CREATE OR REPLACE VIEW sms_inventory.vendor_master AS SELECT * FROM public.supplier_master;",
    "    END IF;",
    "END $$;",
    "",
    "-- Insert / Update 209 vendor records from Book 5",
]

for row in clean_rows:
    cols = ", ".join(row.keys())
    vals = ", ".join(escape_sql(v) for v in row.values())
    stmt = f"""INSERT INTO public.supplier_master ({cols}) VALUES ({vals})
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
    updated_at = CURRENT_TIMESTAMP;"""
    sql_lines.append(stmt)

with open(OUT_SQL, 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_lines) + "\n")

print(f"Generated {len(clean_rows)} INSERT statements in {OUT_SQL}")
