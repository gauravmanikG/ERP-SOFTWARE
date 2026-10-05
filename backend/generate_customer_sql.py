import csv, json

file_path = r'c:\Users\gaura\Downloads\new(Sheet1).csv'

with open(file_path, mode='r', encoding='utf-8', errors='ignore') as f:
    reader = csv.reader(f)
    rows = list(reader)

sql_lines = [
    '-- Real Customer Master Data from user sheet',
    'TRUNCATE TABLE public.customer_master RESTART IDENTITY;'
]

code_counter = 1

for r in rows:
    if not r or len(r) < 4:
        continue
    
    c_name = r[3].strip() if len(r) > 3 else ''
    if not c_name or c_name == 'Customer Name' or '---' in c_name:
        continue
    
    bill_to = r[4].strip() if len(r) > 4 else ''
    alias = r[5].strip() if len(r) > 5 else ''
    state = r[6].strip() if len(r) > 6 else ''
    country = r[7].strip() if len(r) > 7 else ''
    ship_to = r[8].strip() if len(r) > 8 else ''
    billing_source = r[9].strip() if len(r) > 9 else ''
    gstin = r[10].strip() if len(r) > 10 else ''
    city = r[11].strip() if len(r) > 11 else ''
    dom_exp = r[12].strip() if len(r) > 12 else ''
    sms_code = r[13].strip() if len(r) > 13 else ''
    sales_person = r[14].strip() if len(r) > 14 else ''
    sales_contact = r[15].strip() if len(r) > 15 else ''
    sales_email = r[16].strip() if len(r) > 16 else ''

    bill_to = bill_to.replace('\n', ' ').replace("'", "''")
    sales_email = sales_email.replace('\n', ', ').replace("'", "''")
    sales_contact = sales_contact.replace('\n', ', ').replace("'", "''")
    c_name = c_name.replace("'", "''")
    alias = alias.replace("'", "''")
    state = state.replace("'", "''")
    city = city.replace("'", "''")
    sales_person = sales_person.replace("'", "''")

    pan = ''
    state_code = ''
    if gstin and len(gstin) >= 15 and gstin[:2].isdigit():
        state_code = gstin[:2]
        pan = gstin[2:12]

    cust_code = f'CUST-{code_counter:03d}'
    code_counter += 1

    cust_type = 'EXPORT' if 'Export' in c_name or 'Dubai' in c_name or country in ['Dubai', 'Germany', 'UAE', 'Russia'] or dom_exp.upper() == 'EXPORT' else ('OEM' if 'OEM' in dom_exp.upper() or not dom_exp else dom_exp.upper())
    gst_type = 'REGISTERED' if gstin else 'UNREGISTERED'
    contact = sales_person or alias or c_name

    sql = f"INSERT INTO public.customer_master (customer_id, customer_code, customer_name, company_id, customer_type, gstin, pan, contact_person, email, phone, address, city, state, state_code, gst_registration_type, credit_limit, status) VALUES ('{cust_code}', '{cust_code}', '{c_name}', 'COMP-001', '{cust_type}', '{gstin}', '{pan}', '{contact}', '{sales_email}', '{sales_contact}', '{bill_to or ship_to}', '{city}', '{state}', '{state_code}', '{gst_type}', 500000.00, 'ACTIVE');"
    sql_lines.append(sql)

output_sql = '\n'.join(sql_lines)

with open(r'c:\Users\gaura\Downloads\silver-muller-seals\backend\src\main\resources\customer_master.sql', 'w', encoding='utf-8') as f:
    f.write(output_sql)

print(f'customer_master.sql generated successfully with {len(sql_lines)-2} records!')
