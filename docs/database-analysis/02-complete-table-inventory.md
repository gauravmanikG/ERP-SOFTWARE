# Complete Table Inventory — Silver Muller ERP

> All tables extracted from `backend/src/main/resources/schema.sql`.  
> Columns, types, constraints, and FKs documented per table.  
> PKs marked **PK**, FKs marked **FK**, and NOT NULL marked **(NN)**.

---

## CORE (unschema'd — public schema, legacy naming)

### 1. `companies`
> Company Master — multi-tenant root entity.  
> PK: UUID (gen_random_uuid), GIN index on name+code for full-text search.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| company_code | TEXT | NN, UNIQUE |
| company_name | TEXT | NN |
| legal_name | TEXT | |
| short_name | TEXT | |
| business_type | TEXT | DEFAULT 'Manufacturing' |
| industry | TEXT | |
| logo | TEXT | base64 data URL |
| status | TEXT | DEFAULT 'Active' |
| pan_no | TEXT | |
| gstin | TEXT | |
| cin_llpin | TEXT | |
| tan | TEXT | |
| msme_registration | TEXT | |
| factory_license_no | TEXT | |
| iec | TEXT | |
| pf_establishment_code | TEXT | |
| esi_code | TEXT | |
| professional_tax_no | TEXT | |
| pollution_certificate_no | TEXT | |
| registered_office | TEXT | |
| factory_address | TEXT | |
| branch_address | TEXT | |
| city | TEXT | |
| state | TEXT | |
| country | TEXT | DEFAULT 'India' |
| pin_code | TEXT | |
| created_at | TIMESTAMPTZ | NN, DEFAULT now() |
| updated_at | TIMESTAMPTZ | NN, DEFAULT now() |

---

### 2. `department`
> Simple department list used by the core inventory transaction engine.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| name | VARCHAR(255) | NN, UNIQUE |

**Seeded:** Production, Maintenance, Quality Control, Stores, Administration, Store, Power Press Die Making, CNC, Moulding, Finishing, Burning, Packing, FG STORE, Dispatch, Rejection Store, Rework-Burning, Gate, etc.

---

### 3. `transaction_type`
> Lookup for types of inventory movement.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| type | VARCHAR(50) | NN, UNIQUE |

**Seeded:** Material Transfer, Internal Material Return, Rejection Tfd to Burning, Material Send for Job work, FG Dismantling & SFG Recovery, Rework, BOM FG Transfer Receipt, etc.

---

### 4. `master`
> Material Master — core item registry for inventory operations.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| code | VARCHAR(100) | NN, UNIQUE |
| description | VARCHAR(255) | NN |
| category | VARCHAR(100) | NN, DEFAULT 'General' |
| unit_of_measurement | VARCHAR(50) | NN |
| opening_balance | NUMERIC(15,2) | NN, DEFAULT 0, CHECK >=0 |
| store_name | VARCHAR(100) | NN |

**Indexes:** `idx_inv_tx_master_id` on `inventory_transaction.master_id`

---

### 5. `inventory_transaction`
> Central inventory movement ledger. Every stock movement is an append-only row.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| transaction_number | VARCHAR(50) | Formatted number |
| slip_number | VARCHAR(100) | Legacy field, now nullable |
| transaction_type_id | BIGINT | NN, FK → transaction_type(id) |
| master_id | BIGINT | NN, FK → master(id) |
| from_department_id | BIGINT | NN, FK → department(id) |
| to_department_id | BIGINT | FK → department(id) |
| quantity | NUMERIC(15,2) | NN, CHECK > 0 |
| transaction_date | TIMESTAMPTZ | NN, DEFAULT now() |
| remarks | TEXT | |
| reversed_transaction_id | BIGINT | FK → inventory_transaction(id) — for reversals |

**Indexes:** transaction_number, slip_number, master_id, transaction_type_id

---

### 6. `moulding_bom_mapping`
> Maps moulded items to their parent metal shell items (1:N BOM relationship).

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| moulded_item_id | BIGINT | NN, FK → master(id) ON DELETE CASCADE |
| metal_shell_item_id | BIGINT | NN, FK → master(id) ON DELETE CASCADE |
| active | BOOLEAN | NN, DEFAULT TRUE |
| created_at | TIMESTAMPTZ | NN, DEFAULT now() |

**Constraint:** UNIQUE (moulded_item_id, metal_shell_item_id)

---

### 7. `fg_bom`
> Finished Goods Bill of Materials — exploded BOM with component quantities per category.  
> Each row = one FG product code; columns = integer counts per component category.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| sms_new_part_no | VARCHAR(100) | |
| old_code | VARCHAR(100) | NN, UNIQUE |
| description | TEXT | |
| bom_count | INTEGER | Total BOM components |
| outer_metal_shell..jali | INTEGER | One column per BOM category (30+ columns) |

**Note:** This is a wide, denormalized BOM table. Each BOM category is a separate integer column. Seeded with 300+ product codes.

---

### 8. `stock_alert_rule`
> Alert rule definition — min/max thresholds per item+category+department.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| item_code | VARCHAR(100) | NN |
| category_name | VARCHAR(255) | NN |
| department_name | VARCHAR(255) | NN |
| min_quantity | NUMERIC(15,2) | |
| max_quantity | NUMERIC(15,2) | |
| created_at | TIMESTAMPTZ | NN |

**Constraint:** UNIQUE (item_code, category_name, department_name)  
**Note:** Appears TWICE in schema.sql (lines 460-469 and 517-526) — duplicate CREATE IF NOT EXISTS (idempotent, no error).

---

### 9. `stock_alert`
> Generated alert instances from the StockAlertService scheduler.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| rule_id | BIGINT | (soft FK to stock_alert_rule) |
| item_code | VARCHAR(100) | NN |
| category_name | VARCHAR(255) | NN |
| department_name | VARCHAR(255) | NN |
| kind | VARCHAR(32) | NN (BELOW_MIN / ABOVE_MAX etc.) |
| closing_balance | NUMERIC(15,2) | NN |
| threshold | NUMERIC(15,2) | NN |
| title | TEXT | NN |
| message | TEXT | NN |
| unread | BOOLEAN | NN, DEFAULT TRUE |
| resolved | BOOLEAN | NN, DEFAULT FALSE |
| created_at | TIMESTAMPTZ | NN |
| updated_at | TIMESTAMPTZ | NN |

**Note:** Also appears TWICE (duplicate CREATE IF NOT EXISTS).

---

## PUBLIC SCHEMA — MASTER TABLES

### 10. `public.item_master`
> Full item catalogue with dimensions, images, OEM cross-references, and lead times.  
> Mirror exists at `sms_inventory.item_master`.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| group_name | VARCHAR(255) | |
| subgroup | VARCHAR(255) | |
| group_code | VARCHAR(255) | |
| old_code | VARCHAR(255) | |
| main_fg_code | VARCHAR(255) | |
| sms_new_part_no | VARCHAR(255) | |
| description_size | TEXT | |
| fg_outsource | VARCHAR(255) | |
| sfg_outsource | VARCHAR(255) | |
| outsource_combo_fg_sfg | VARCHAR(255) | |
| purchased_uom | VARCHAR(100) | |
| consumption_uom | VARCHAR(100) | |
| inner_diameter | VARCHAR(255) | |
| outer_diameter | VARCHAR(255) | |
| width | VARCHAR(255) | |
| thickness | VARCHAR(255) | |
| segment | VARCHAR(255) | |
| region | VARCHAR(255) | |
| application | VARCHAR(255) | |
| ref_no | VARCHAR(255) | |
| oem | VARCHAR(255) | |
| corteco_no | VARCHAR(255) | |
| category | VARCHAR(255) | |
| image | TEXT | base64 |
| material | VARCHAR(255) | |
| color | VARCHAR(255) | |
| uom | VARCHAR(100) | |
| price | NUMERIC(15,2) | |
| type | VARCHAR(255) | |
| fitting_position | VARCHAR(255) | |
| swirl_type | VARCHAR(255) | |
| file_name | VARCHAR(255) | |
| domestic_exports | VARCHAR(255) | |
| cross_reference | VARCHAR(255) | |
| hsn_code | VARCHAR(50) | |
| drawing_image | TEXT | |
| safety_lead_time | NUMERIC(10,2) | |
| procurement_lead_time | NUMERIC(10,2) | |
| total_lead_time | NUMERIC(10,2) | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

### 11. `public.department_master`
> Rich department registry with codes, sequences, and categories.  
> Separate from the simple `department` table.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| dept_code | VARCHAR(50) | |
| dept_number | INT | |
| department_name | VARCHAR(255) | NN, UNIQUE |
| process_sequence | NUMERIC(10,2) | NN |
| category | VARCHAR(100) | |
| status | VARCHAR(50) | DEFAULT 'ACTIVE' |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Virtual departments added for Job Work:**  
- `External Job Work` (JW-EXT) — material with workers  
- `Quality Hold` (QH-HOLD) — received material awaiting inspection  
- `Scrap Yard` (SCRAP-YD) — disposed scrap after approval

---

### 12. `public.category_master`
> Item category definitions with BOM consumption rules.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| category_name | VARCHAR(255) | NN, UNIQUE |
| bom_consumption | VARCHAR(255) | DEFAULT '' |
| category_code | VARCHAR(100) | DEFAULT '' |
| short_code | VARCHAR(100) | DEFAULT '' |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Seeded with 20+ categories:** OUTER METAL SHELL, INNER METAL SHELL, SPRING, OUTER MOULDED, INNER MOULDED, FELT, PTFE, etc.

---

### 13. `public.operation_master`
> Manufacturing operation types used for BOM and Job Work.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| operation_name | VARCHAR(255) | NN, UNIQUE |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

### 14. `public.process_master`
> Manufacturing process codes (seal type processes).

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| process_code | VARCHAR(50) | NN, UNIQUE |
| process_description | VARCHAR(255) | NN |
| status | VARCHAR(20) | DEFAULT 'ACTIVE' |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

### 15. `public.procurement_master`
> Procurement type master (In House / Outsource / Buy+InHouse / Imported).

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| procurement_type | VARCHAR(100) | NN, UNIQUE |
| procurement_name | VARCHAR(100) | |
| status | VARCHAR(20) | DEFAULT 'ACTIVE' |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

### 16. `public.supplier_master`
> Vendor / Supplier registry. Referenced by Job Workers.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| supplier_id | VARCHAR(50) | NN, UNIQUE |
| supplier_code | VARCHAR(50) | NN, UNIQUE |
| supplier_name | VARCHAR(255) | NN |
| company_id | VARCHAR(50) | NN, DEFAULT 'COMP-001' |
| supplier_type | VARCHAR(50) | DEFAULT 'MATERIAL' |
| gstin | VARCHAR(50) | |
| pan | VARCHAR(30) | |
| udyam_no | VARCHAR(50) | |
| msme_category | VARCHAR(50) | DEFAULT 'NOT_MSME' |
| gst_registration_type | VARCHAR(50) | NN, DEFAULT 'REGISTERED' |
| tds_section_id | VARCHAR(50) | DEFAULT 'TDS-194C' |
| contact_person | VARCHAR(255) | |
| email | VARCHAR(255) | |
| phone | VARCHAR(50) | |
| payment_terms_id | VARCHAR(50) | DEFAULT 'PT-30' |
| currency | VARCHAR(10) | DEFAULT 'INR' |
| status | VARCHAR(30) | NN, DEFAULT 'ACTIVE' |
| address | TEXT | |
| city | VARCHAR(100) | |
| state | VARCHAR(100) | |
| state_code | VARCHAR(10) | |
| pincode | VARCHAR(20) | |
| created_at | TIMESTAMPTZ | NN |
| created_by | VARCHAR(50) | NN |
| updated_at | TIMESTAMPTZ | NN |
| updated_by | VARCHAR(50) | NN |

**Indexes:** supplier_code, supplier_name, gstin, state

---

### 17. `public.customer_master`
> Customer registry with credit limits.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| customer_id | VARCHAR(50) | NN, UNIQUE |
| customer_code | VARCHAR(50) | NN, UNIQUE |
| customer_name | VARCHAR(255) | NN |
| company_id | VARCHAR(50) | NN |
| customer_type | VARCHAR(50) | DEFAULT 'OEM' |
| gstin | VARCHAR(50) | |
| pan | VARCHAR(30) | |
| credit_limit | NUMERIC(15,2) | DEFAULT 500000 |
| currency | VARCHAR(10) | DEFAULT 'INR' |
| status | VARCHAR(30) | NN, DEFAULT 'ACTIVE' |
| address | TEXT | |
| city / state / state_code / pincode | VARCHAR | |
| created_at / updated_at | TIMESTAMPTZ | NN |
| created_by / updated_by | VARCHAR(50) | NN |

---

### 18. `public.machine_master`
> Machine registry for maintenance module.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| s_no | INT | |
| machine_no | VARCHAR(50) | NN |
| description | VARCHAR(255) | NN |
| department | VARCHAR(100) | |
| location | VARCHAR(150) | |
| specification | TEXT | |
| capacity | VARCHAR(150) | |
| make | VARCHAR(255) | |
| remarks | TEXT | |
| category | VARCHAR(100) | DEFAULT 'General' |
| status | VARCHAR(50) | DEFAULT 'ACTIVE' |
| created_at / updated_at | TIMESTAMPTZ | |

---

### 19. `public.hsn_tax_master`
> HSN/SAC code tax rate registry. Seeded with 37 codes relevant to seals manufacturing.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| hsn_sac_code | VARCHAR(20) | NN, UNIQUE |
| description | VARCHAR(255) | NN |
| type | VARCHAR(20) | DEFAULT 'GOODS' |
| gst_rate | NUMERIC(5,2) | NN |
| cgst_rate | NUMERIC(5,2) | NN |
| sgst_rate | NUMERIC(5,2) | NN |
| igst_rate | NUMERIC(5,2) | NN |
| cess_rate | NUMERIC(5,2) | DEFAULT 0 |
| chapter | VARCHAR(10) | |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMPTZ | NN |

---

## PUBLIC SCHEMA — PURCHASE MODULE

### 20. `public.purchase_requisitions`
> Purchase Requisition header.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| pr_number | VARCHAR(50) | NN, UNIQUE |
| pr_date | DATE | NN |
| required_date | DATE | |
| requisitioner | VARCHAR(100) | |
| department | VARCHAR(100) | |
| store | VARCHAR(100) | |
| preferred_vendor | VARCHAR(255) | |
| priority | VARCHAR(50) | DEFAULT 'Normal' |
| requirement_type | VARCHAR(100) | |
| procurement_method | VARCHAR(100) | DEFAULT 'Competitive Quotation' |
| purpose | TEXT | |
| remarks | TEXT | |
| status | VARCHAR(50) | NN, DEFAULT 'Draft' |
| created_by | VARCHAR(100) | |
| approved_by | VARCHAR(100) | |
| approved_at | TIMESTAMPTZ | |
| rejection_reason | TEXT | |
| pr_type | VARCHAR(50) | DEFAULT 'Direct Material' |
| cost_center | VARCHAR(100) | |
| project_reference | VARCHAR(100) | |
| cancellation_reason | TEXT | |
| created_at / updated_at | TIMESTAMPTZ | NN |

---

### 21. `public.purchase_requisition_items`
> PR line items.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| pr_id | BIGINT | NN, FK → purchase_requisitions(id) ON DELETE CASCADE |
| pr_number | VARCHAR(50) | NN |
| item_code | VARCHAR(100) | NN |
| item_name | VARCHAR(255) | |
| description | TEXT | |
| uom | VARCHAR(50) | NN |
| req_qty | NUMERIC(15,2) | NN |
| ordered_qty | NUMERIC(15,2) | DEFAULT 0 |
| remaining_qty | NUMERIC(15,2) | DEFAULT 1 |
| est_rate | NUMERIC(15,2) | |
| est_total | NUMERIC(15,2) | |
| remarks | TEXT | |
| category | VARCHAR(255) | DEFAULT 'FG' |
| hsn_code | VARCHAR(50) | |
| drawing_no | VARCHAR(100) | |
| manufacturer_brand | VARCHAR(100) | |
| required_by_date | VARCHAR(50) | |
| created_at | TIMESTAMPTZ | NN |

---

### 22. `public.rfq_headers`
> Request for Quotation header.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| rfq_number | VARCHAR(50) | NN, UNIQUE |
| rfq_date | DATE | NN |
| due_date | DATE | NN |
| pr_number | VARCHAR(50) | NN |
| department | VARCHAR(100) | |
| title | VARCHAR(255) | NN |
| status | VARCHAR(50) | DEFAULT 'OPEN' |
| selected_vendors_json | TEXT | JSON snapshot of invited vendors |
| delivery_location | VARCHAR(255) | |
| payment_terms | VARCHAR(100) | |
| terms_conditions | TEXT | |
| created_by | VARCHAR(100) | NN |
| created_at / updated_at | TIMESTAMPTZ | NN |

---

### 23. `public.rfq_items`
> RFQ line items.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| rfq_id | BIGINT | NN, FK → rfq_headers(id) ON DELETE CASCADE |
| rfq_number | VARCHAR(50) | NN |
| pr_number | VARCHAR(50) | |
| item_code | VARCHAR(100) | NN |
| item_name | VARCHAR(255) | NN |
| category | VARCHAR(100) | |
| uom | VARCHAR(50) | |
| required_qty | NUMERIC(15,2) | NN |
| target_date | DATE | |
| remarks | TEXT | |
| created_at | TIMESTAMPTZ | NN |

---

### 24. `public.vendor_quotations`
> Vendor quotation (VQ) header with revision tracking.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| quotation_number | VARCHAR(50) | NN, UNIQUE |
| vendor_id | BIGINT | (soft FK to supplier_master) |
| vendor_code | VARCHAR(50) | NN |
| vendor_name | VARCHAR(255) | NN |
| quotation_date | DATE | NN |
| valid_until | DATE | NN |
| subtotal_amount | NUMERIC(15,2) | NN |
| tax_amount | NUMERIC(15,2) | NN |
| final_amount | NUMERIC(15,2) | NN |
| status | VARCHAR(50) | DEFAULT 'Draft' |
| revision_number | INT | NN, DEFAULT 1 |
| is_latest | BOOLEAN | NN, DEFAULT TRUE |
| parent_quotation_id | BIGINT | Self-ref for revisions |
| pr_id / pr_number | BIGINT / VARCHAR | Link back to PR |
| created_at / updated_at | TIMESTAMPTZ | NN |

---

### 25. `public.vendor_quotation_items`
> VQ line items with tax calculation.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| quotation_id | BIGINT | NN, FK → vendor_quotations(id) ON DELETE CASCADE |
| item_code | VARCHAR(100) | NN |
| quoted_quantity | NUMERIC(15,2) | NN |
| unit_rate | NUMERIC(15,2) | NN |
| tax_percent | NUMERIC(5,2) | NN |
| line_total | NUMERIC(15,2) | NN |
| effective_unit_cost | NUMERIC(15,4) | NN |
| category | VARCHAR(255) | DEFAULT 'FG' |

---

### 26. `public.vendor_quotation_history`
> Audit trail for quotation actions.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| quotation_id | BIGINT | NN, FK → vendor_quotations(id) ON DELETE CASCADE |
| action | VARCHAR(50) | NN |
| action_by | VARCHAR(100) | NN |
| action_at | TIMESTAMPTZ | NN |
| comments | TEXT | |
| details_json | TEXT | |

---

### 27. `public.vendor_quotation_comments`
> Comments thread on a quotation.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| quotation_id | BIGINT | NN, FK → vendor_quotations(id) ON DELETE CASCADE |
| author | VARCHAR(100) | NN |
| comment | TEXT | NN |
| created_at | TIMESTAMPTZ | NN |

---

### 28. `public.purchase_proposals`
> Comparative purchase proposal document (pre-PO approval stage).  
> PK is a VARCHAR (UUID-like string), not BIGSERIAL.

| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(100) | PK |
| proposal_number | VARCHAR(50) | NN, UNIQUE |
| pr_number | VARCHAR(50) | |
| status | VARCHAR(50) | DEFAULT 'DRAFT' |
| source_quotation_number | VARCHAR(50) | |
| source_quotation_id | BIGINT | |
| grand_total | NUMERIC(15,2) | |
| details_json | TEXT | Full line items serialized as JSON |
| created_at / updated_at | VARCHAR / TIMESTAMPTZ | |

---

### 29. `public.purchase_orders`
> Standard Material Purchase Order.  
> PK is VARCHAR (UUID-like string).

| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(100) | PK |
| po_number | VARCHAR(50) | NN, UNIQUE |
| status | VARCHAR(50) | NN, DEFAULT 'DRAFT' |
| vendor_code / vendor_name | VARCHAR | NN |
| grand_total | NUMERIC(15,2) | |
| validity_date | DATE | NULL = legacy PO (no expiry) |
| po_type | VARCHAR(50) | DEFAULT 'STANDARD' |
| revision_number | INT | DEFAULT 0 |
| clubbing_batch_number | VARCHAR(50) | |
| clubbing_batch_id | BIGINT | |
| details_json | TEXT | Items as JSON blob |
| created_at / updated_at | TIMESTAMPTZ | NN |

---

### 30. `public.purchase_order_validity_history`
> Logs each time a PO validity date is extended.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| po_number | VARCHAR(50) | NN |
| action | VARCHAR(20) | DEFAULT 'EXTENDED' |
| old_validity_date | DATE | |
| new_validity_date | DATE | NN |
| changed_by | VARCHAR(100) | NN |
| reason | TEXT | NN |
| changed_at | TIMESTAMPTZ | NN |

---

### 31. `public.po_revisions`
> PO amendment / revision log.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| po_number | VARCHAR(50) | NN |
| revision_number | INT | NN |
| changed_by | VARCHAR(100) | NN |
| change_reason | TEXT | NN |
| changes_json | TEXT | NN |
| created_at | TIMESTAMPTZ | NN |

---

### 32. `public.purchase_order_delivery_schedules`
> Planned delivery lot schedule for a PO.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| po_id | BIGINT | (soft FK) |
| po_number | VARCHAR(50) | NN |
| item_code | VARCHAR(100) | NN |
| lot_number | INT | NN |
| scheduled_date | DATE | NN |
| scheduled_qty | NUMERIC(15,2) | NN |
| received_qty | NUMERIC(15,2) | DEFAULT 0 |
| balance_qty | NUMERIC(15,2) | NN |
| status | VARCHAR(30) | DEFAULT 'SCHEDULED' |

---

### 33. `public.purchase_order_payment_milestones`
> Commercial payment milestones linked to PO lots.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| po_number | VARCHAR(50) | NN |
| milestone_sequence | INT | NN |
| milestone_title | VARCHAR(150) | NN |
| trigger_event | VARCHAR(50) | NN |
| milestone_amount | NUMERIC(15,2) | NN |
| payment_status | VARCHAR(30) | DEFAULT 'PENDING' |
| paid_amount | NUMERIC(15,2) | DEFAULT 0 |

---

### 34. `public.goods_receipt_notes`
> GRN header — physical receipt against a PO.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| grn_number | VARCHAR(50) | NN, UNIQUE |
| grn_date | DATE | NN |
| po_number | VARCHAR(50) | NN |
| vendor_code / vendor_name | VARCHAR | NN |
| vendor_challan_no | VARCHAR(100) | NN |
| status | VARCHAR(50) | NN, DEFAULT 'POSTED' |
| total_received_qty | NUMERIC(15,2) | |
| total_accepted_qty | NUMERIC(15,2) | |
| total_rejected_qty | NUMERIC(15,2) | |
| created_at / updated_at | TIMESTAMPTZ | NN |

---

### 35. `public.goods_receipt_note_items`
> GRN line items with quality disposition.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| grn_id | BIGINT | NN, FK → goods_receipt_notes(id) ON DELETE CASCADE |
| item_code | VARCHAR(100) | NN |
| challan_qty | NUMERIC(15,2) | NN |
| received_qty | NUMERIC(15,2) | NN |
| accepted_qty | NUMERIC(15,2) | NN |
| rejected_qty | NUMERIC(15,2) | NN |
| unit_rate | NUMERIC(15,2) | NN |

---

### 36-38. PR Clubbing Tables

**`public.pr_clubbing_batches`** — A consolidated batch grouping many PR lines.  
**`public.pr_clubbing_batch_items`** — Each unique item in the batch with totals.  
**`public.pr_clubbing_allocations`** — Links individual PR items to batch items, with PO allocation tracking.

---

## PUBLIC SCHEMA — SERVICE PO

### 39. `public.service_po_categories` — Service category lookup
### 40. `public.service_purchase_orders` — Service PO header (90+ columns, full GST model)
### 41. `public.service_po_schedules` — Planned milestones/occurrences
### 42. `public.service_po_acceptances` — Service Entry Sheets (SES)
### 43. `public.service_po_invoices` — Invoice verification (no GRN)
### 44. `public.service_po_status_history` — Approval/audit trail
### 45. `public.service_po_validity_history` — Validity extension log
### 46. `public.service_po_revisions` — Amendment revisions
### 47. `public.service_po_attachments` — Binary attachments (BYTEA)

---

## PUBLIC SCHEMA — CAPITAL PO

### 48. `public.capital_po_asset_categories` — CAPEX category lookup
### 49. `public.capital_purchase_orders` — Capital PO header (full lifecycle)
### 50. `public.capital_po_lines` — Asset line items per PO
### 51. `public.capital_po_schedules` — Delivery/installation/commissioning/payment schedules
### 52. `public.capital_po_receipts` — Physical delivery receipts
### 53. `public.capital_po_receipt_lines` — Qty received per PO line
### 54. `public.asset_master` — Fixed asset register
### 55. `public.capital_po_history` — Approval/audit trail
### 56. `public.capital_po_validity_history` — Validity extension log
### 57. `public.capital_po_amendments` — Amendment proposals
### 58. `public.capital_po_attachments` — Binary attachments (BYTEA)

---

## PUBLIC SCHEMA — JOB WORK MODULE (14 tables)

### 59. `public.job_work_operations`
Job work operation types: CNC, Machining, Grinding, Moulding, Coating, etc.

### 60. `public.job_workers`
Approved subcontractors — linked to `supplier_master` via supplier_code FK.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| worker_code | VARCHAR(30) | NN, UNIQUE |
| supplier_code | VARCHAR(50) | NN, UNIQUE, FK → supplier_master(supplier_code) |
| legal_name | VARCHAR(255) | NN |
| gstin | VARCHAR(20) | UNIQUE |
| status | VARCHAR(20) | CHECK IN (ACTIVE/INACTIVE/BLOCKED) |

### 61. `public.job_worker_operations`
Many-to-many: which operations a job worker can perform.  
PK: (job_worker_id, operation_id)

### 62. `public.job_work_rate_contracts`
Rate contracts per worker+operation+category with validity dates.

### 63. `public.job_work_indents`
Internal request to send material for job work (store dept → APPROVER).

### 64. `public.job_work_indent_lines`
Line items of an indent — what material, quantity, and operation.

### 65. `public.job_work_orders`
Formal job work order issued to a specific worker.  
Status lifecycle: DRAFT → PENDING_APPROVAL → APPROVED → IN_PROGRESS → PARTIALLY_RECEIVED → COMPLETED → CLOSED / CANCELLED

### 66. `public.job_work_order_lines`
Material + quantity + expected output per JWO line.  
Tracks: dispatched_qty, received_qty, unused_returned_qty, accepted_qty, rejected_qty, rework_qty, scrap_qty, written_off_qty.

### 67. `public.job_work_challans`
Delivery challan issued when material is sent to worker.  
Status: POSTED / CANCELLED. Linked to `inventory_transaction`.

### 68. `public.job_work_challan_lines`
Per-item quantities on a challan + `inventory_transaction_id` FK.

### 69. `public.job_work_receipts`
Gate receipt when worker returns processed material.

### 70. `public.job_work_receipt_lines`
Per-item quantities received + quality inspection results (accepted/rejected/rework/scrap).  
Links to `inventory_transaction` for stock movements.

### 71. `public.job_work_stock_ledger`
Append-only ledger of material balance per worker/item/order.  
Tracks running `balance_after` — material currently held by each worker.

### 72. `public.job_work_history`
Polymorphic audit trail: entity_type + entity_id cover INDENT, JWO, CHALLAN, RECEIPT, WORKER.

### 73. `public.job_work_attachments`
Binary file attachments (BYTEA) — polymorphic by entity_type + entity_id.

### 74. `public.job_work_loss_policy`
Permissible process-loss % per operation (and optional category).  
Phase 2 reconciliation rule engine.

### 75. `public.job_work_adjustments`
Approval-gated adjustments: SCRAP_DISPOSAL, SHORTAGE, PROCESS_LOSS.  
Requires APPROVER role. Triggers inventory transaction on approval.

---

## SMS_INVENTORY SCHEMA (Shadow / Legacy)

### 76-81. Mirror tables (identical structure to public counterparts)

- `sms_inventory.item_master`
- `sms_inventory.department_master`
- `sms_inventory.operation_master`
- `sms_inventory.category_master`
- `sms_inventory.process_master`
- `sms_inventory.procurement_master`

---

*See `03-erd-relationships.md` for the full Entity Relationship Diagram.*
