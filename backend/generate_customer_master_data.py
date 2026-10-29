# Regenerates backend/src/main/resources/customer_master.sql (seed inserts and column alters only).
# The table is defined in schema.sql. Inserts use ON CONFLICT DO NOTHING, so re-running never overwrites rows.
import csv
import re

csv_path = r"c:\Users\gaura\Downloads\silver-muller-seals\backend\src\main\resources\customer_source_sheet.csv"
output_sql_path = r"c:\Users\gaura\Downloads\silver-muller-seals\backend\src\main\resources\customer_master.sql"

with open(csv_path, mode="r", encoding="utf-8", errors="ignore") as f:
    reader = csv.reader(f)
    rows = list(reader)

header = rows[0]
data_rows = rows[1:]

sql_statements = [
    '-- startup-guard: bulk-seed-when-empty public.customer_master\n-- Customer master generated from customer_source_sheet.csv.\n-- Loaded by DataInitializer ONLY when public.customer_master is empty. Data rows only: the table,\n-- columns and indexes are defined in schema.sql. Enforced by StartupSafetyGuardTest.\n',
]

def sql_str(s):
    if not s:
        return "NULL"
    # replace newlines with comma space for clean SQL
    cleaned = s.replace("'", "''").strip()
    return f"'{cleaned}'"

cust_index = 1
valid_rows = 0

for r in data_rows:
    if not r or not any(r):
        continue
    
    def get_col(idx):
        return r[idx].strip() if len(r) > idx else ""

    c_name = get_col(3)
    if not c_name or c_name == "Customer Name" or "---" in c_name:
        # Check if row is purely an address continuation
        continue

    valid_rows += 1
    chk_acc_str = get_col(0).upper()
    chk_acc = "TRUE" if chk_acc_str == "TRUE" else "FALSE"
    
    code = get_col(1)
    if not code:
        code = f"CUST-{cust_index:03d}"
    cust_id = code
    cust_index += 1

    chk_sales_str = get_col(2).upper()
    chk_sales = "FALSE" if chk_sales_str == "FALSE" else "TRUE"

    bill_to = get_col(4)
    alias = get_col(5)
    state = get_col(6)
    country = get_col(7) or "India"
    ship_to = get_col(8)
    billing_source = get_col(9)
    gstin = get_col(10).replace(" ", "").upper()
    city = get_col(11)
    dom_exp = get_col(12)
    sms_code = get_col(13)
    sale_person = get_col(14)
    sale_contact = get_col(15)
    sale_email = get_col(16)
    mode_rem = get_col(17)
    accounts_info = get_col(18)
    credit_days_str = get_col(19)
    credit_days = 30
    if credit_days_str:
        m = re.search(r'\d+', credit_days_str)
        if m:
            credit_days = int(m.group(0))

    scm = get_col(20)
    customer_addr = get_col(21)
    general_addr = customer_addr or bill_to or ship_to

    # Derive PAN & state code
    pan = ""
    state_code = ""
    if len(gstin) >= 15 and gstin[:2].isdigit():
        state_code = gstin[:2]
        pan = gstin[2:12]

    gst_reg_type = "REGISTERED" if gstin else "UNREGISTERED"

    # Derive customer_type
    cust_type = "OEM"
    if dom_exp:
        if dom_exp.upper() == "EXPORT":
            cust_type = "EXPORT"
        elif "DOMESTIC" in dom_exp.upper():
            cust_type = "DOMESTIC"
    elif country in ["Dubai", "Germany", "UAE", "Russia"]:
        cust_type = "EXPORT"
        dom_exp = "EXPORT"

    stmt = f"""INSERT INTO public.customer_master (
    customer_id, customer_code, customer_name, customer_alias, company_id, customer_type, domestic_export,
    gstin, pan, gst_registration_type, check_by_accounts, check_by_sales, billing_source,
    supplier_code_sms, contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id, credit_days, credit_limit,
    currency, scm, status, bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode, created_at, created_by, updated_at, updated_by
) VALUES (
    {sql_str(cust_id)}, {sql_str(code)}, {sql_str(c_name)}, {sql_str(alias)}, 'COMP-001', {sql_str(cust_type)}, {sql_str(dom_exp)},
    {sql_str(gstin)}, {sql_str(pan)}, {sql_str(gst_reg_type)}, {chk_acc}, {chk_sales}, {sql_str(billing_source)},
    {sql_str(sms_code)}, {sql_str(sale_person or alias or c_name)}, {sql_str(sale_person)}, {sql_str(sale_contact)}, {sql_str(sale_contact)},
    {sql_str(sale_email)}, {sql_str(sale_email)}, {sql_str(mode_rem)}, {sql_str(accounts_info)}, 'PT-30', {credit_days}, 500000.00,
    'INR', {sql_str(scm)}, 'ACTIVE', {sql_str(bill_to)}, {sql_str(ship_to)}, {sql_str(customer_addr)}, {sql_str(general_addr)},
    {sql_str(city)}, {sql_str(state)}, {sql_str(state_code)}, {sql_str(country)}, '', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;"""
    sql_statements.append(stmt)


with open(output_sql_path, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_statements))

print(f"Successfully generated {output_sql_path} with {valid_rows} customer records.")
