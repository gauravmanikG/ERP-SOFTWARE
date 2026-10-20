import json
import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(
    dbname="sms_seals",
    user="postgres",
    password="postgres",
    host="localhost",
    port=5434
)

cur = conn.cursor(cursor_factory=RealDictCursor)
cur.execute("SELECT * FROM public.customer_master ORDER BY id ASC;")
rows = cur.fetchall()

def serialize_row(r):
    out = {}
    for k, v in r.items():
        if k in ["created_at", "updated_at"]:
            out[k] = str(v) if v else None
        elif k == "credit_limit":
            out[k] = float(v) if v is not None else 500000.0
        else:
            out[k] = v
            
    # Also provide camelCase keys for react frontend
    camel_map = {
        "customer_id": "customerId",
        "customer_code": "customerCode",
        "customer_name": "customerName",
        "customer_alias": "customerAlias",
        "company_id": "companyId",
        "customer_type": "customerType",
        "domestic_export": "domesticExport",
        "gst_registration_type": "gstRegistrationType",
        "check_by_accounts": "checkByAccounts",
        "check_by_sales": "checkBySales",
        "billing_source": "billingSource",
        "supplier_code_sms": "supplierCodeSms",
        "contact_person": "contactPerson",
        "sales_person": "salesPerson",
        "sales_contact": "salesContact",
        "sales_email": "salesEmail",
        "mode_of_payment_reminder": "modeOfPaymentReminder",
        "accounts_contact_details": "accountsContactDetails",
        "payment_terms_id": "paymentTermsId",
        "credit_days": "creditDays",
        "credit_limit": "creditLimit",
        "bill_to_address": "billToAddress",
        "ship_to_address": "shipToAddress",
        "customer_address": "customerAddress",
        "state_code": "stateCode",
        "created_at": "createdAt",
        "created_by": "createdBy",
        "updated_at": "updatedAt",
        "updated_by": "updatedBy"
    }
    for snake, camel in camel_map.items():
        out[camel] = out.get(snake)
    return out

records = [serialize_row(r) for r in rows]

output_path = r"c:\Users\gaura\Downloads\silver-muller-seals\frontend\src\modules\crm\data\customersData.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(records, f, indent=2, ensure_ascii=False)

print(f"Exported {len(records)} customer records to {output_path}")
cur.close()
conn.close()
