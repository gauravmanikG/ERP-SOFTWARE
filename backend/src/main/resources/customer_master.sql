-- startup-guard: bulk-seed-when-empty public.customer_master
-- Customer master CUST-00001 to CUST-00033.
-- Loaded by DataInitializer ONLY when public.customer_master is empty. Data rows only: the table,
-- columns and indexes are defined in schema.sql. Enforced by StartupSafetyGuardTest.

INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    1, 'CUST-00001', 'CUST-00001', 'Ashok Leyland', 'Ashok Ley', 'COMP-001', 'DOMESTIC',
    'Domestic', '06AARCS3816N1ZQ', 'AARCS3816N', NULL, 'NOT_MSME', 'REGISTERED',
    FALSE, TRUE, 'SMRL-443', '7205808',
    'Ashok Ley', NULL, NULL, NULL, 'Deependra.Choubey@ashokleyland.com,Jayakumar@ashokleyland.com,Chhatrpal.Singh@ashokleyland.com,Vikramsingh.R@ashokleyland.com,Nagarajan.A2@ashokleyland.com
POTHIRAJ.P2@ashokleyland.com', 'Deependra.Choubey@ashokleyland.com,Jayakumar@ashokleyland.com,Chhatrpal.Singh@ashokleyland.com,Vikramsingh.R@ashokleyland.com,Nagarajan.A2@ashokleyland.com
POTHIRAJ.P2@ashokleyland.com',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'Silver Muller Rubber Ltd.(Sales)
PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028', 'Silver Muller Rubber Ltd.(Sales)
PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028', 'Silver Muller Rubber Ltd.(Sales)
PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028', 'Silver Muller Rubber Ltd.(Sales)
PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028',
    NULL, 'Haryana', '06', 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    2, 'CUST-00002', 'CUST-00002', 'Bir Auto And Tractor Agencies', 'Bir Auto', 'COMP-001', 'DOMESTIC',
    'Domestic', '07AAAPM6656Q1Z2', 'AAAPM6656Q', NULL, 'NOT_MSME', 'REGISTERED',
    TRUE, TRUE, 'Direct', NULL,
    'Bir Auto', NULL, NULL, NULL, NULL, NULL,
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'GROUND FLOOR, 2935, HAMILTON ROAD,, KASHMERE GATE, New Delhi, Delhi, 110006', 'GROUND FLOOR, 2935, HAMILTON ROAD,, KASHMERE GATE, New Delhi, Delhi, 110006', 'GROUND FLOOR, 2935, HAMILTON ROAD,, KASHMERE GATE, New Delhi, Delhi, 110006', 'GROUND FLOOR, 2935, HAMILTON ROAD,, KASHMERE GATE, New Delhi, Delhi, 110006',
    'India', 'Delhi', '07', 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    3, 'CUST-00003', 'CUST-00003', 'Dana India Private Ltd-PUNE', 'DANA-PUNE', 'COMP-001', 'DOMESTIC',
    'DOMESTIC', '27AABCD1873A1Z3', 'AABCD1873A', NULL, 'NOT_MSME', 'REGISTERED',
    TRUE, TRUE, 'Direct', NULL,
    'Prabhakaran : HCV', 'Prabhakaran : HCV', '73390 00868
95525 10464', '73390 00868
95525 10464', 'd.prabakaran@alsn.com
ratnesh.chourasiya@alsn.com
dadasaheb.thorat@alsn.com', 'd.prabakaran@alsn.com
ratnesh.chourasiya@alsn.com
dadasaheb.thorat@alsn.com',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'Plot Number 01 Gat Number 51/1-3, 52-54, 56-59,, Global Industrial Park, Post-Vasuli, Taluka Khed,, Bhamboli, Pune, Maharashtra, 410501', 'Plot Number 01 Gat Number 51/1-3, 52-54, 56-59,, Global Industrial Park, Post-Vasuli, Taluka Khed,, Bhamboli, Pune, Maharashtra, 410501', 'Plot Number 01 Gat Number 51/1-3, 52-54, 56-59,, Global Industrial Park, Post-Vasuli, Taluka Khed,, Bhamboli, Pune, Maharashtra, 410501', 'Plot Number 01 Gat Number 51/1-3, 52-54, 56-59,, Global Industrial Park, Post-Vasuli, Taluka Khed,, Bhamboli, Pune, Maharashtra, 410501',
    NULL, 'Maharashtra', '27', 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    4, 'CUST-00004', 'CUST-00004', 'Diesel Technic (M.E) Fze - Dubai', 'DT-Dubai', 'COMP-001', 'EXPORT',
    'Export', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED',
    FALSE, TRUE, 'Direct', NULL,
    'DT-Dubai', NULL, '971 48120 100', '971 48120 100', NULL, NULL,
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'USD', NULL, 'ACTIVE',
    'Silver Muller Rubber Ltd.(Sales)
PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028', 'Silver Muller Rubber Ltd.(Sales)
PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028', 'PO Box 17051, Streen N305 ,Jebel Ali Free Zone, Dubai UAE', 'Silver Muller Rubber Ltd.(Sales)
PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028',
    NULL, NULL, NULL, 'Dubai', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    5, 'CUST-00005', 'CUST-00005', 'Diesel Technic Se Germany', 'DT-Germany', 'COMP-001', 'EXPORT',
    'Export', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED',
    TRUE, TRUE, 'SMRL-443', NULL,
    'Ina Johannes
Jessica Wiegmann : Packing Mgr', 'Ina Johannes
Jessica Wiegmann : Packing Mgr', NULL, NULL, 'lea.harzmeier@dieseltechnic.com,j.wiegmann@dieseltechnic.com,Johannes@dieseltechnic.com,dannemann@dieseltechnic.com,
dannemann@dieseltechnic.com\,laeticia.kowitz@dieseltechnic.com,laeticia.kowitz@dieseltechnic.com>,j.rehling@dieseltechnic.com', 'lea.harzmeier@dieseltechnic.com,j.wiegmann@dieseltechnic.com,Johannes@dieseltechnic.com,dannemann@dieseltechnic.com,
dannemann@dieseltechnic.com\,laeticia.kowitz@dieseltechnic.com,laeticia.kowitz@dieseltechnic.com>,j.rehling@dieseltechnic.com',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'USD', NULL, 'ACTIVE',
    'Silver Muller Rubber Ltd.(Sales)
PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028', 'Silver Muller Rubber Ltd.(Sales)
PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028', 'GLOBAL AUTOMOTIVE SOLUTIONS, WEHRMANNSDAMM 5-9, 27245 KIRCHDORF/GERMANY', 'Silver Muller Rubber Ltd.(Sales)
PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028',
    NULL, NULL, NULL, 'Germany', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    6, 'CUST-00006', 'CUST-00006', 'Elpi General Trading Llc', 'ELPI', 'COMP-001', 'EXPORT',
    'Export', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED',
    TRUE, TRUE, 'Direct', NULL,
    'ELPI', NULL, NULL, NULL, 'info@elpi.com', 'info@elpi.com',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'USD', NULL, 'ACTIVE',
    'S-5, BEHIND KARACHI DARBAR RESTAURANT, AL MAKTOUM HOSPITAL ROAD, DEIRA, DUBAI, U.A.E', 'S-5, BEHIND KARACHI DARBAR RESTAURANT, AL MAKTOUM HOSPITAL ROAD, DEIRA, DUBAI, U.A.E', NULL, 'S-5, BEHIND KARACHI DARBAR RESTAURANT, AL MAKTOUM HOSPITAL ROAD, DEIRA, DUBAI, U.A.E',
    NULL, NULL, NULL, 'UAE', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    7, 'CUST-00007', 'CUST-00007', 'Elpi General Trading Llc (Deira Branch)', 'S-5, BEHIND KARACHI DARBAR RESTAURANT, AL MAKTOUM HOSPITAL ROAD, DEIRA, DUBAI, U.A.E', 'COMP-001', 'EXPORT',
    'Export', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED',
    FALSE, TRUE, 'Direct', NULL,
    'S-5, BEHIND KARACHI DARBAR RESTAURANT, AL MAKTOUM HOSPITAL ROAD, DEIRA, DUBAI, U.A.E', NULL, NULL, NULL, NULL, NULL,
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'USD', NULL, 'ACTIVE',
    'S-5, BEHIND KARACHI DARBAR RESTAURANT, AL MAKTOUM HOSPITAL ROAD, DEIRA, DUBAI, U.A.E', 'S-5, BEHIND KARACHI DARBAR RESTAURANT, AL MAKTOUM HOSPITAL ROAD, DEIRA, DUBAI, U.A.E', 'S-5, BEHIND KARACHI DARBAR RESTAURANT, AL MAKTOUM HOSPITAL ROAD, DEIRA, DUBAI, U.A.E', 'S-5, BEHIND KARACHI DARBAR RESTAURANT, AL MAKTOUM HOSPITAL ROAD, DEIRA, DUBAI, U.A.E',
    NULL, NULL, NULL, 'UAE', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    8, 'CUST-00008', 'CUST-00008', 'Europart Middle East Fzco', 'Europart', 'COMP-001', 'EXPORT',
    'Export', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED',
    TRUE, TRUE, 'Direct', NULL,
    'Vitaly
Shahzad Riaz - Purchase Exe', 'Vitaly
Shahzad Riaz - Purchase Exe', '9714-8808449

04 8808449
971 55 956 9488', '9714-8808449

04 8808449
971 55 956 9488', '1243@europart.ru
R.Shahzad@europart.net
H.Charawanan@europart.net', '1243@europart.ru
R.Shahzad@europart.net
H.Charawanan@europart.net',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'USD', NULL, 'ACTIVE',
    'Plot # M209 Street # N400 , JAFZA North, Jebel Ali Free Zone , Dubai, United Arab Emirates, Ph:-04 8808449
Fax-04 8808525, MOBILE+971 55 956 9488', 'Plot # M209 Street # N400 , JAFZA North, Jebel Ali Free Zone , Dubai, United Arab Emirates, Ph:-04 8808449
Fax-04 8808525, MOBILE+971 55 956 9488', 'Plot # M209 Street # N400 , JAFZA North, Jebel Ali Free Zone , Dubai, United Arab Emirates, Ph:-04 8808449
Fax-04 8808525, MOBILE+971 55 956 9488', 'Plot # M209 Street # N400 , JAFZA North, Jebel Ali Free Zone , Dubai, United Arab Emirates, Ph:-04 8808449
Fax-04 8808525, MOBILE+971 55 956 9488',
    'Jebel Ali Free Zone , Dubai', NULL, NULL, 'UAE', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    9, 'CUST-00009', 'CUST-00009', 'J.K. Fenner India Limited(Gurugram)', 'JK-GURGAON', 'COMP-001', 'DOMESTIC',
    'Domestic', '06AAACJ7230N2ZF', 'AAACJ7230N', NULL, 'NOT_MSME', 'REGISTERED',
    TRUE, TRUE, 'Direct', NULL,
    'Avinash Kumar :Deputy Manager', 'Avinash Kumar :Deputy Manager', '8586865307', '8586865307', 'prashant.b@jkfenner.com
avinashkumar.p@jkfenner.com', 'prashant.b@jkfenner.com
avinashkumar.p@jkfenner.com',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'C/O SEABIRD LOGISOLUTION LTD, NO.19., VILL-DABODHA,KHASRA NO.4/18,22,23,24,5//11,6//2,3,4, FARRUKHNAGAR,GURUGRAM,HARYANA-122506', 'C/O SEABIRD LOGISOLUTION LTD, NO.19., VILL-DABODHA,KHASRA NO.4/18,22,23,24,5//11,6//2,3,4, FARRUKHNAGAR,GURUGRAM,HARYANA-122506', 'C/O SEABIRD LOGISOLUTION LTD, NO.19., VILL-DABODHA,KHASRA NO.4/18,22,23,24,5//11,6//2,3,4, FARRUKHNAGAR,GURUGRAM,HARYANA-122506', 'C/O SEABIRD LOGISOLUTION LTD, NO.19., VILL-DABODHA,KHASRA NO.4/18,22,23,24,5//11,6//2,3,4, FARRUKHNAGAR,GURUGRAM,HARYANA-122506',
    NULL, 'Haryana', '06', 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    10, 'CUST-00010', 'CUST-00010', 'J.K. FENNER (INDIA) LTD (CHENNAI)', 'JK-CHENNAI', 'COMP-001', 'DOMESTIC',
    'Domestic', '33AAACJ7230N1ZJ', 'AAACJ7230N', NULL, 'NOT_MSME', 'REGISTERED',
    TRUE, TRUE, 'Direct', NULL,
    'Lion Kumar

Vikash Panchamani : Supply Chain :91-9003246132

P Vikash: Plant PURCHSE HEAD :+91-9003246132', 'Lion Kumar

Vikash Panchamani : Supply Chain :91-9003246132

P Vikash: Plant PURCHSE HEAD :+91-9003246132', '98416 53170
91761 76114 / 95856 52819', '98416 53170
91761 76114 / 95856 52819', 'Leonkumar.g@jkfenner.com,sanjeevkumar.shishpal@jkfenner.com
KUTHALAMAGESH.n@jkfenner.com
sasikumarr@jkfenner.com
saravana.kumar1@safexpress.com', 'Leonkumar.g@jkfenner.com,sanjeevkumar.shishpal@jkfenner.com
KUTHALAMAGESH.n@jkfenner.com
sasikumarr@jkfenner.com
saravana.kumar1@safexpress.com',
    'E-Mail', 'K.Kothandaraman: Sprbills@jkfenner.com', 'PT-30',
    30, 500000.00, 'INR', 'Vikash Panchamani @jkfenner.com,Saravanans@jkfenner.com', 'ACTIVE',
    'J.K-FENNER (INDIA) LTD, F-21 & 22,SIPCOT INDUSTRIAL PARK, SRIPERUMBADUR, KANCHEEPURAM-602 105, TAMIL NADU', 'J.K-FENNER (INDIA) LTD, F-21 & 22,SIPCOT INDUSTRIAL PARK, SRIPERUMBADUR, KANCHEEPURAM-602 105, TAMIL NADU', 'J.K-FENNER (INDIA) LTD, F-21 & 22,SIPCOT INDUSTRIAL PARK, SRIPERUMBADUR, KANCHEEPURAM-602 105, TAMIL NADU', 'J.K-FENNER (INDIA) LTD, F-21 & 22,SIPCOT INDUSTRIAL PARK, SRIPERUMBADUR, KANCHEEPURAM-602 105, TAMIL NADU',
    'KANCHEEPURAM', 'Tamil Nadu', '33', 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    11, 'CUST-00011', 'CUST-00011', 'Kistenmacher Auto Technik', 'KAT', 'COMP-001', 'EXPORT',
    'Export', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED',
    TRUE, TRUE, 'kohli auto', NULL,
    'KAT', NULL, NULL, NULL, 'katlogistics@kat-germany.de
Pecherska@kat-germany.de
Krause@kat-germany.de
Subramanian@kat-germany.de', 'katlogistics@kat-germany.de
Pecherska@kat-germany.de
Krause@kat-germany.de
Subramanian@kat-germany.de',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'USD', NULL, 'ACTIVE',
    'Kohli Auto Traders
WZ 76, TODAPUR, NEW DELHI 110012', 'Kohli Auto Traders
WZ 76, TODAPUR, NEW DELHI 110012', 'HOLIDAY INN, GATEWAY AVENUE, FESTIVAL CITY, DUBAI, UAE', 'Kohli Auto Traders
WZ 76, TODAPUR, NEW DELHI 110012',
    NULL, NULL, NULL, 'UAE', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    12, 'CUST-00012', 'CUST-00012', 'Lakhdatar Shyam Industries Private Limited', 'Lakhdatar', 'COMP-001', 'DOMESTIC',
    'Domestic', '09AAICR4269F1Z2', 'AAICR4269F', NULL, 'NOT_MSME', 'REGISTERED',
    TRUE, TRUE, 'Direct', NULL,
    'Mr. Shyam', 'Mr. Shyam', '01147587176, 93122 07176', '01147587176, 93122 07176', 'Lakhdatarshyaminds@gmail.com', 'Lakhdatarshyaminds@gmail.com',
    'whatsapp', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'Plot No. F-40/308, Transport Nagar Phase II,, Kanpur Road, Lukhnow, Uttar Pradesh, 226012', 'Plot No. F-40/308, Transport Nagar Phase II,, Kanpur Road, Lukhnow, Uttar Pradesh, 226012', 'Plot No. F-40/308, Transport Nagar Phase II,, Kanpur Road, Lukhnow, Uttar Pradesh, 226012', 'Plot No. F-40/308, Transport Nagar Phase II,, Kanpur Road, Lukhnow, Uttar Pradesh, 226012',
    NULL, 'Uttar Pradesh', '09', 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    13, 'CUST-00013', 'CUST-00013', 'Llc "F.A.Logistic"', 'FORUM 6', 'COMP-001', 'EXPORT',
    'Export', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED',
    TRUE, TRUE, 'Direct', NULL,
    'Sergey Suryadnov
Aleksej,', 'Sergey Suryadnov
Aleksej,', '-10117', '-10117', 'vsyannikov.u@forum-auto.ru,suryadnov.s@forum-auto.ru,sorokin.a@forum-auto.ru,
ovsyannikov.u@forum-auto.ru,viv33in@gmail.com,
suryadnov.s@forum-auto.ru,egorov.da@forum-auto.ru
ovsyannikov.u@forum-auto.ru,
sorokin.a@forum-auto.ru,viv33in@gmail.com
gorlov.o@forum-auto.ru', 'vsyannikov.u@forum-auto.ru,suryadnov.s@forum-auto.ru,sorokin.a@forum-auto.ru,
ovsyannikov.u@forum-auto.ru,viv33in@gmail.com,
suryadnov.s@forum-auto.ru,egorov.da@forum-auto.ru
ovsyannikov.u@forum-auto.ru,
sorokin.a@forum-auto.ru,viv33in@gmail.com
gorlov.o@forum-auto.ru',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'USD', NULL, 'ACTIVE',
    '4,SOLNECHNOGORORSKY PROEZD,125413, MOSCOW,RUSSIA FEDERATION', '4,SOLNECHNOGORORSKY PROEZD,125413, MOSCOW,RUSSIA FEDERATION', '4,SOLNECHNOGORORSKY PROEZD,125413, MOSCOW,RUSSIA FEDERATION', '4,SOLNECHNOGORORSKY PROEZD,125413, MOSCOW,RUSSIA FEDERATION',
    NULL, NULL, NULL, 'Russia', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    14, 'CUST-00014', 'CUST-00014', 'Meritor Hvs (India) Limited', 'MERITOR', 'COMP-001', 'DOMESTIC',
    'Domestic', '27AABCM8911G1ZH', 'AABCM8911G', NULL, 'NOT_MSME', 'REGISTERED',
    TRUE, TRUE, 'Direct', '232513',
    'Selvan Shrinivasan
Mr. Deva Accounts :8799986216', 'Selvan Shrinivasan
Mr. Deva Accounts :8799986216', '91 8799990281', '91 8799990281', 'CVA.Pune3@cummins.com,CVA.Pune2@cummins.com,Laxmikant.Somnathe@cummins.com,
Suresh.Joshi@cummins.com,
selvan.shrinivasan@cummins.com
devidas.anbhule@cummins.com
Laxmikant.Somnathe@cummins.com', 'CVA.Pune3@cummins.com,CVA.Pune2@cummins.com,Laxmikant.Somnathe@cummins.com,
Suresh.Joshi@cummins.com,
selvan.shrinivasan@cummins.com
devidas.anbhule@cummins.com
Laxmikant.Somnathe@cummins.com',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'CVA Warehouse, Gate No.34, Taluka Maval, Near Talegaon, Pune-412106, Maharashtra', 'CVA Warehouse, Gate No.34, Taluka Maval, Near Talegaon, Pune-412106, Maharashtra', 'CVA Warehouse, Gate No.34, Taluka Maval, Near Talegaon, Pune-412106, Maharashtra', 'CVA Warehouse, Gate No.34, Taluka Maval, Near Talegaon, Pune-412106, Maharashtra',
    'PUNE', 'Maharashtra', '27', 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    15, 'CUST-00015', 'CUST-00015', 'SAHNI DISTRIBUTORS PVT. LTD./DFT', 'DFT', 'COMP-001', 'DOMESTIC',
    'Domestic', '07AAFCS9276E1Z1', 'AAFCS9276E', NULL, 'NOT_MSME', 'REGISTERED',
    TRUE, TRUE, 'Direct', NULL,
    'DFT', NULL, NULL, NULL, NULL, NULL,
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'KHASRA NO-38, ROAD NO-3, DABRI VILLAGE, West Delhi, Delhi, 110045

"PLOT NO. 313, ROAD NO.3,
DABRI INDUSTRIAL AREA,
NEW DELHI-110045 (INDIA)"', NULL, 'KHASRA NO-38, ROAD NO-3, DABRI VILLAGE, West Delhi, Delhi, 110045

"PLOT NO. 313, ROAD NO.3,
DABRI INDUSTRIAL AREA,
NEW DELHI-110045 (INDIA)"', 'KHASRA NO-38, ROAD NO-3, DABRI VILLAGE, West Delhi, Delhi, 110045

"PLOT NO. 313, ROAD NO.3,
DABRI INDUSTRIAL AREA,
NEW DELHI-110045 (INDIA)"',
    NULL, 'Delhi', '07', 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    16, 'CUST-00016', 'CUST-00016', 'Sfp Products India Private Limited', 'SFP', 'COMP-001', 'DOMESTIC',
    'DOMESTIC', '07ABPCS1939M1ZM', 'ABPCS1939M', NULL, 'NOT_MSME', 'REGISTERED',
    TRUE, TRUE, 'Direct', NULL,
    'SFP', NULL, NULL, NULL, 'whatsapp', 'whatsapp',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'KOHLI AUTO TRADERS
WZ-76, TODAPUR, DELHI, SOUTH WEST DELHI, DELHI-110012', 'Sfp Products India Private Limited
HOUSE NO. 79, BLK-CW, NEW DELHI NORTH DELHI', 'KOHLI AUTO TRADERS
WZ-76, TODAPUR, DELHI, SOUTH WEST DELHI, DELHI-110012', 'KOHLI AUTO TRADERS
WZ-76, TODAPUR, DELHI, SOUTH WEST DELHI, DELHI-110012',
    'NEW DELHI', 'DELHI', '07', 'INDIA', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    17, 'CUST-00017', 'CUST-00017', 'Silver Muller Rubber Ltd.(Sales)', 'SMRL', 'COMP-001', 'DOMESTIC',
    'Domestic', '06AARCS3816N1ZQ', 'AARCS3816N', NULL, 'NOT_MSME', 'REGISTERED',
    TRUE, TRUE, 'Direct', NULL,
    'Ravi Anand', 'Ravi Anand', NULL, NULL, 'design@silvermuller.com', 'design@silvermuller.com',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028', 'PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028', 'PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028', 'PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028',
    'KUNDLI', 'Haryana', '06', 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    18, 'CUST-00018', 'CUST-00018', 'Steel Impex & Industries', 'Steel Impex', 'COMP-001', 'DOMESTIC',
    'Domestic', '27AAAFS3367A1ZI', 'AAAFS3367A', NULL, 'NOT_MSME', 'REGISTERED',
    TRUE, TRUE, 'Direct', NULL,
    'Sunil Batra', 'Sunil Batra', '-28458087', '-28458087', 'whatsapp', 'whatsapp',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'HISSA NO 6, SURVEY NO 115, GHODBUNDER VILLAGE ROAD, MIRA ROAD EAST, THANE, MAHARASHTRA- 401107', 'HISSA NO 6, SURVEY NO 115, GHODBUNDER VILLAGE ROAD, MIRA ROAD EAST, THANE, MAHARASHTRA- 401107', 'HISSA NO 6, SURVEY NO 115, GHODBUNDER VILLAGE ROAD, MIRA ROAD EAST, THANE, MAHARASHTRA- 401107', 'HISSA NO 6, SURVEY NO 115, GHODBUNDER VILLAGE ROAD, MIRA ROAD EAST, THANE, MAHARASHTRA- 401107',
    NULL, 'Maharashtra', '27', 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    19, 'CUST-00019', 'CUST-00019', 'Kohli Auto Traders', 'Kohli', 'COMP-001', 'EXPORT',
    'Export', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED',
    FALSE, TRUE, 'Direct', NULL,
    'Kohli', NULL, NULL, NULL, 'group.silverseal@gmail.com', 'group.silverseal@gmail.com',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'USD', NULL, 'ACTIVE',
    'WZ 76, TODAPUR, NEW DELHI 110012', NULL, 'WZ 76, TODAPUR, NEW DELHI 110012', 'WZ 76, TODAPUR, NEW DELHI 110012',
    NULL, NULL, NULL, NULL, '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    20, 'CUST-00020', 'CUST-00020', 'Y.S.M Spring International', 'YSM', 'COMP-001', 'DOMESTIC',
    'Domestic', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED',
    FALSE, TRUE, 'Direct', NULL,
    'YSM', NULL, NULL, NULL, 'whatsapp', 'whatsapp',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    '96/99, Bhatwara, Shahpeer Gate, Shohrab Gate, Meerut, Uttar Pradesh 250002', '96/99, Bhatwara, Shahpeer Gate, Shohrab Gate, Meerut, Uttar Pradesh 250002', '96/99, Bhatwara, Shahpeer Gate, Shohrab Gate, Meerut, Uttar Pradesh 250002', '96/99, Bhatwara, Shahpeer Gate, Shohrab Gate, Meerut, Uttar Pradesh 250002',
    NULL, 'Uttar Pradesh', NULL, 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    21, 'CUST-00021', 'CUST-00021', 'Partap Singh and Sons-GUJRAT', 'PSS-GUJRAT', 'COMP-001', 'DOMESTIC',
    'Domestic', '24AAAFP8679G1ZY', 'AAAFP8679G', NULL, 'NOT_MSME', 'REGISTERED',
    TRUE, TRUE, 'Direct', NULL,
    'Sartaj Chadha', 'Sartaj Chadha', '9892523522', '9892523522', 'sartajchadha78@gmail.com', 'sartajchadha78@gmail.com',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'UMARWADA, VPUNE KUMBHARIA ROAD, SARDAR COMPLEX, SHOP NO.B-50,ROYAL TOWNSHIP', '24, THNKER OWNER S ASSO BULIDING, OPP GOKUL HOTEL, GANDHIDHAM, Kachchh,
Gujarat, 370001', 'UMARWADA, VPUNE KUMBHARIA ROAD, SARDAR COMPLEX, SHOP NO.B-50,ROYAL TOWNSHIP', 'UMARWADA, VPUNE KUMBHARIA ROAD, SARDAR COMPLEX, SHOP NO.B-50,ROYAL TOWNSHIP',
    'SURAT', 'GUJRAT', '24', 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    22, 'CUST-00022', 'CUST-00022', 'Partap Singh and Sons-MUMBAI', 'PSS-MUMBAI', 'COMP-001', 'DOMESTIC',
    'Domestic', '27AAAFP8679G1ZS', 'AAAFP8679G', NULL, 'NOT_MSME', 'REGISTERED',
    TRUE, TRUE, 'Direct', NULL,
    'Sartaj Chadha', 'Sartaj Chadha', '9892523522', '9892523522', 'sartajchadha78@gmail.com', 'sartajchadha78@gmail.com',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'SHOP NO 5, 29-B, NAVAKAR BLDG SHOP NO 5, KENNEDY BRIDGE, OPERA HOUSE, MUMBAI', '115, TRUCK TERMINAL, NEXT TOO STEEL TOWN PETROL PUMP, KALAMBOLI, Raigad, Maharashtra, 410218', 'SHOP NO 5, 29-B, NAVAKAR BLDG SHOP NO 5, KENNEDY BRIDGE, OPERA HOUSE, MUMBAI', 'SHOP NO 5, 29-B, NAVAKAR BLDG SHOP NO 5, KENNEDY BRIDGE, OPERA HOUSE, MUMBAI',
    'KALAMBOLI', 'MAHARASHTRA', '27', 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    23, 'CUST-00023', 'CUST-00023', 'KJ', 'KJ', 'COMP-001', 'DOMESTIC',
    'Domestic', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED',
    FALSE, TRUE, 'SMRL-443', NULL,
    'KJ', NULL, NULL, NULL, NULL, NULL,
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028', 'PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028', NULL, 'PHASE-III, PLOT NO.443, EPIP HSIIDC, KUNDLI, Sonipat, Haryana, 131028',
    NULL, 'Haryana', NULL, 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    24, 'CUST-00024', 'CUST-00024', 'RSK MOTORS', 'RSK MOTORS', 'COMP-001', 'DOMESTIC',
    'DOMESTIC', '27AAMPK9641H1ZA', 'AAMPK9641H', NULL, 'NOT_MSME', 'REGISTERED',
    FALSE, TRUE, 'Direct', NULL,
    'RSK MOTORS', NULL, NULL, NULL, 'whatsapp', 'whatsapp',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    '4-C, PURSHOTTAM BUILDING, TRIBHUVAN ROAD, MUMBAI-400004', '4-C, PURSHOTTAM BUILDING, TRIBHUVAN ROAD, MUMBAI-400004', NULL, '4-C, PURSHOTTAM BUILDING, TRIBHUVAN ROAD, MUMBAI-400004',
    'TRIBHUVAN ROAD', 'MAHARASHTRA', '27', 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    25, 'CUST-00025', 'CUST-00025', 'Safety Stock', 'Safety Stock', 'COMP-001', 'EXPORT',
    'Export', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED',
    FALSE, TRUE, 'Direct', NULL,
    'Safety Stock', NULL, NULL, NULL, NULL, NULL,
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'USD', NULL, 'ACTIVE',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    26, 'CUST-00026', 'CUST-00026', 'J.K. Fenner India Limited(Export)', 'JK-EXPORT', 'COMP-001', 'DOMESTIC',
    'Domestic', '06AAACJ7230N2ZF', 'AAACJ7230N', NULL, 'NOT_MSME', 'REGISTERED',
    FALSE, TRUE, 'Direct', NULL,
    'Avinash Kumar :Deputy Manager', 'Avinash Kumar :Deputy Manager', '8586865307', '8586865307', NULL, NULL,
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'C/O SEABIRD LOGISOLUTION LTD, NO.19., VILL-DABODHA,KHASRA NO.4/18,22,23,24,5//11,6//2,3,4, FARRUKHNAGAR,GURUGRAM,HARYANA-122506', 'C/O SEABIRD LOGISOLUTION LTD, NO.19., VILL-DABODHA,KHASRA NO.4/18,22,23,24,5//11,6//2,3,4, FARRUKHNAGAR,GURUGRAM,HARYANA-122506', 'C/O SEABIRD LOGISOLUTION LTD, NO.19., VILL-DABODHA,KHASRA NO.4/18,22,23,24,5//11,6//2,3,4, FARRUKHNAGAR,GURUGRAM,HARYANA-122506', 'C/O SEABIRD LOGISOLUTION LTD, NO.19., VILL-DABODHA,KHASRA NO.4/18,22,23,24,5//11,6//2,3,4, FARRUKHNAGAR,GURUGRAM,HARYANA-122506',
    NULL, 'Haryana', '06', 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    27, 'CUST-00027', 'CUST-00027', 'VEE TEE AUTO MANUFACTURING CO. PVT. LTD.', 'VEE TEE', 'COMP-001', 'DOMESTIC',
    'Domestic', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED',
    FALSE, TRUE, 'Direct', NULL,
    'Rajesh Tiwari', 'Rajesh Tiwari', '98204 63605', '98204 63605', 'rajesh@virtechnique.com', 'rajesh@virtechnique.com',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'PLOT NO. 10, SECTOR 19D, NEAR APMC MARKET, VASHI, NAVI MUMBAI.
TEL: 022-67675000 FAX: 022-27835004', 'PLOT NO. 10, SECTOR 19D, NEAR APMC MARKET, VASHI, NAVI MUMBAI.
TEL: 022-67675000 FAX: 022-27835004', NULL, 'PLOT NO. 10, SECTOR 19D, NEAR APMC MARKET, VASHI, NAVI MUMBAI.
TEL: 022-67675000 FAX: 022-27835004',
    NULL, 'MAHARASHTRA', NULL, 'INDIA', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    28, 'CUST-00028', 'CUST-00028', 'SATYAM ENTERPRISES', 'Satyam', 'COMP-001', 'DOMESTIC',
    'Domestic', '07AAFPM5657A1ZV', 'AAFPM5657A', NULL, 'NOT_MSME', 'REGISTERED',
    FALSE, TRUE, 'Direct', NULL,
    'Rohit', 'Rohit', '9811422501', '9811422501', 'whatsapp', 'whatsapp',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    '3520/1 CHUTTANI MANZIL NICHOLSON ROAD MORI GATE DELHI 110006', 'BG 335 SANJAY GANDHI TRANSPORT NAGAR DELHI 110042
( BILLING & SHIPPING ADDRESS IMPORTANT MENTION IN BILL)', NULL, '3520/1 CHUTTANI MANZIL NICHOLSON ROAD MORI GATE DELHI 110006',
    NULL, 'Delhi', '07', 'India', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    29, 'CUST-00029', 'CUST-00029', 'NBC', 'NBC', 'COMP-001', 'DOMESTIC',
    'Domestic', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED',
    FALSE, TRUE, 'Direct', NULL,
    'Sanjeev Kumar', 'Sanjeev Kumar', '8860880244', '8860880244', 'sanjeev.kumar2@nbcbearings.in
manish.sinha@nbcbearings.in
rahul.dewedi@nbcbearings.in', 'sanjeev.kumar2@nbcbearings.in
manish.sinha@nbcbearings.in
rahul.dewedi@nbcbearings.in',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'National Engineering Industries Ltd.
(Auto Adjacencies Division)
Khatipura Road, Jaipur - 302006,
India .', 'National Engineering Industries Ltd.
(Auto Adjacencies Division)
Khatipura Road, Jaipur - 302006,
India .', NULL, 'National Engineering Industries Ltd.
(Auto Adjacencies Division)
Khatipura Road, Jaipur - 302006,
India .',
    NULL, 'RAJASTHAN', NULL, 'INDIA', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    30, 'CUST-00030', 'CUST-00030', 'FREUDENBERG-NOK', 'FNI', 'COMP-001', 'DOMESTIC',
    'Domestic', '06AAFCS0306K1ZL', 'AAFCS0306K', NULL, 'NOT_MSME', 'REGISTERED',
    FALSE, TRUE, 'Direct', NULL,
    'FNI', NULL, NULL, NULL, 'Paltu.Sana@corteco.in
,Mandeep.Sehgal@fst.com
Pankaj.Jariyal@fst.com', 'Paltu.Sana@corteco.in
,Mandeep.Sehgal@fst.com
Pankaj.Jariyal@fst.com',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'Freudenberg-NOK Pvt.Ltd.
C/O Rhenus Contract Logistics I
Pvt Ltd.
MUF10, Shail Embassy Ind.
Park, F+H Block
Situated Near SH 15A,
122506 GURGAON, HARYANA, INDIA', 'Freudenberg-NOK Pvt.Ltd.
C/O Rhenus Contract Logistics I
Pvt Ltd.
MUF10, Shail Embassy Ind.
Park, F+H Block
Situated Near SH 15A,
122506 GURGAON, HARYANA, INDIA', NULL, 'Freudenberg-NOK Pvt.Ltd.
C/O Rhenus Contract Logistics I
Pvt Ltd.
MUF10, Shail Embassy Ind.
Park, F+H Block
Situated Near SH 15A,
122506 GURGAON, HARYANA, INDIA',
    NULL, 'Haryana', '06', 'INDIA', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    31, 'CUST-00031', 'CUST-00031', 'TRUCK MOTORS', 'TM', 'COMP-001', 'EXPORT',
    'EXPORT', NULL, NULL, NULL, 'NOT_MSME', 'UNREGISTERED',
    FALSE, TRUE, 'Direct', NULL,
    'TM', NULL, NULL, NULL, 'i.efimov@tmtr.ru
a.utkin@tmtr.ru
a.iakimchenko@tmtr.ru
l.vdovina@tmtr.ru
a.dumbadze@tmtr.ru
e.petrygina@tmtr.ru
i.latfullin@tmtr.ru
a.samylkin@tmtr.ru', 'i.efimov@tmtr.ru
a.utkin@tmtr.ru
a.iakimchenko@tmtr.ru
l.vdovina@tmtr.ru
a.dumbadze@tmtr.ru
e.petrygina@tmtr.ru
i.latfullin@tmtr.ru
a.samylkin@tmtr.ru',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'USD', NULL, 'ACTIVE',
    'TME SPARE PARTS TRADING DWC-LLC
P.O. BOX 644272, DUBAI, UAE, PHONE : +97148879220, truckmotorsdubai@gmail.com', 'TME SPARE PARTS TRADING DWC-LLC
P.O. BOX 644272, DUBAI, UAE, PHONE : +97148879220, truckmotorsdubai@gmail.com', NULL, 'TME SPARE PARTS TRADING DWC-LLC
P.O. BOX 644272, DUBAI, UAE, PHONE : +97148879220, truckmotorsdubai@gmail.com',
    NULL, NULL, NULL, 'DUBAI', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    32, 'CUST-00032', 'CUST-00032', 'NEW KIM AUTO PRODUCTS', 'KIM', 'COMP-001', 'DOMESTIC',
    'Domestic', '07BDKPB5855J1ZB', 'BDKPB5855J', NULL, 'NOT_MSME', 'REGISTERED',
    FALSE, TRUE, 'Direct', NULL,
    'KIM', NULL, 'Kshitiz Bhaskar', 'Kshitiz Bhaskar', NULL, NULL,
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    'PLOT NO 191, GROUND FLOOR, DSIDC PKT M SEC 5, NEAR LABOUR CHOWK SEC 5, Bawana Industrial Area, NEW DELHI, NORTH WEST DELHI, DELHI, 110039', 'PLOT NO 191, GROUND FLOOR, DSIDC PKT M SEC 5, NEAR LABOUR CHOWK SEC 5, Bawana Industrial Area, NEW DELHI, NORTH WEST DELHI, DELHI, 110039', NULL, 'PLOT NO 191, GROUND FLOOR, DSIDC PKT M SEC 5, NEAR LABOUR CHOWK SEC 5, Bawana Industrial Area, NEW DELHI, NORTH WEST DELHI, DELHI, 110039',
    NULL, 'Delhi', '07', 'india', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;
INSERT INTO public.customer_master (
    id, customer_id, customer_code, customer_name, customer_alias, company_id, customer_type,
    domestic_export, gstin, pan, udyam_no, msme_category, gst_registration_type,
    check_by_accounts, check_by_sales, billing_source, supplier_code_sms,
    contact_person, sales_person, phone, sales_contact, email, sales_email,
    mode_of_payment_reminder, accounts_contact_details, payment_terms_id,
    credit_days, credit_limit, currency, scm, status,
    bill_to_address, ship_to_address, customer_address, address,
    city, state, state_code, country, pincode,
    created_at, created_by, updated_at, updated_by
) VALUES (
    33, 'CUST-00033', 'CUST-00033', 'TIMKEN GGB TECHNOLOGY PVT LTD', 'TIMKEN', 'COMP-001', 'DOMESTIC',
    'Domestic', '27AABCE7337G1ZN', 'AABCE7337G', NULL, 'NOT_MSME', 'REGISTERED',
    FALSE, TRUE, 'Direct', NULL,
    'TIMKEN', NULL, 'Raghavendra', 'Raghavendra', 'd.raghavendra@timken.com
swarup.mandal@timken.com', 'd.raghavendra@timken.com
swarup.mandal@timken.com',
    'E-Mail', NULL, 'PT-30',
    30, 500000.00, 'INR', NULL, 'ACTIVE',
    '6th Floor, Wing B, Unit No B603, S No. 87/1A
Plot No.187(Part). Amar Business Zone , Baner Road
Pune, 411045 GSTIN/UIN: 27AABCE7337G1ZN
State Name : Maharashtra, Code : 27', 'Plot No.109-B, GIDC,
Narmadanagar Bharuch, 392015
State Name : GUJARAT', NULL, '6th Floor, Wing B, Unit No B603, S No. 87/1A
Plot No.187(Part). Amar Business Zone , Baner Road
Pune, 411045 GSTIN/UIN: 27AABCE7337G1ZN
State Name : Maharashtra, Code : 27',
    NULL, 'MAHARASHTRA', '27', 'INDIA', '',
    CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM'
) ON CONFLICT DO NOTHING;

SELECT setval('public.customer_master_id_seq', 34, true);
