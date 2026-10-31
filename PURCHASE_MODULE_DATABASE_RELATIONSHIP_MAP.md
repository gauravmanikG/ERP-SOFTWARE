# Purchase Module: Database Relationship Map

How every table in the Purchase Module is connected, which key connects it, and where in the backend each connection is made.

- **Scope:** every Purchase menu entry except **Job Work**: Suppliers, Purchase Requisition, Vendor Rate Master, Purchase Orders (Clubbed Demand, Draft POs, Direct PO, Capital PO, Service PO, PO Register), GRN, Procurement Reports, RFQ and Quotations. It also covers the masters these screens depend on.
- **Excluded:** all `job_work_*` and `job_worker*` tables, and every relationship that exists only for Job Work (for example `job_work_* → item_master`).
- **Sources analysed:** `backend/src/main/resources/schema.sql`, the runtime DDL in `MasterDataSchema.java` and `PurchaseOrderTermsService.java`, `ProcurementMigrations.java`, every non-Job-Work Java file under `modules/purchase/` and `modules/masters/`, and the purchase screens under `frontend/src/modules/purchase/`.
- **Verified against the live database** `sms_seals` (localhost:5434) on 2026-10-31 with read-only `information_schema` queries. The live database has 45 FK constraints outside Job Work, and all of them match `schema.sql`. One of them (`item_subgroup → item_group`) is not a purchase relationship, which leaves **44 purchase FKs**.
- Nothing in the code, the database or its records was changed.

Companion files: [PURCHASE_MODULE_FLOWCHART.md](PURCHASE_MODULE_FLOWCHART.md) (diagrams) and [PURCHASE_MODULE_TABLES.csv](PURCHASE_MODULE_TABLES.csv) (table inventory).

> **Update 2026-10-31: integrity fixes applied (migrations `2026-10-31-10` to `-15`).** The sections below describe the
> database *before* these fixes. [PURCHASE_MODULE_TABLES.csv](PURCHASE_MODULE_TABLES.csv) is current. What changed:
>
> - **PO lines are rows:** new table `purchase_order_items` (one row per PO and item code), kept identical to `purchase_orders.details_json` by trigger `trg_purchase_order_items_sync`. GRN lines, PR allocations and delivery lots now reference `(po_number, item_code)` with composite FKs.
> - **New FKs:** `purchase_requisition_items.item_id → item_master`, `purchase_requisitions.department_id → department_master`; GRN header, PO revisions, payment milestones, validity history and PO terms → `purchase_orders`; PO term codes → their `master_*` tables; quotations → vendor, PR, PR line, item, parent quotation; RFQ header and lines → PR; `purchase_orders` → vendor, PR and source quotation. The vendor and PR keys on `purchase_orders` are NOT VALID: 3 older rows do not match. The live database now has **72 FKs** outside Job Work.
> - **Older POs linked:** the 8 pre-PO-by-PR POs are `po_origin = 'LEGACY'`. 13 `po_pr_allocations` rows (`legacy = TRUE`, no vendor rate) link them to the PR lines they ordered, and their posted GRNs are attributed. `ordered_qty` now equals net allocations on every PR line.
> - **Department codes** are unique (4 departments renumbered DPT-018 to DPT-021).
> - **RFQ and quotation numbers** come from `document_number_counters`; quotation vendors must be Vendor Master entries; revisions store `parent_quotation_id`.
> - **Removed:** the manual `PUT …/ordered-qty` endpoint, the unused `po_id` columns, and the runtime DDL for `purchase_order_terms` (now in `schema.sql`).
> - **Indexes** were added on every FK column that had none, and on `item_master.sms_new_part_no` / `old_code`.

---

## 1. How the backend connects tables

| Relationship type | Meaning in this document | Present in Purchase? |
|---|---|---|
| **FK** | Actual PostgreSQL `FOREIGN KEY` constraint (confirmed in the live DB) | Yes: 44 constraints |
| **JPA** | Hibernate `@ManyToOne` / `@OneToMany` / `@JoinColumn` mapping | **None.** No purchase table is a JPA entity. Purchase persistence is all `JdbcTemplate` SQL. The only JPA use is a *repository lookup* of `SupplierMaster` by `supplier_code` (`SupplierMasterRepository.findBySupplierCode`). `SupplierItem` is a JPA entity with plain `Long` columns and no association mapping. |
| **JOIN** | The two tables are joined on these columns in backend SQL | Yes |
| **LOGICAL** | The application looks up, validates or filters by value, with no DB constraint | Yes, many |
| **SNAPSHOT** | A value is copied from the master when the document is saved and never looked up again (it does not follow later master edits) | Yes |
| **QTY-MIRROR** | Two quantity columns that the application keeps in step inside one transaction | Yes |
| **JSON** | The key sits inside a JSON text column (`details_json`, `selected_vendors_json`) | Yes |
| **INDIRECT** | The connection runs through another table | Yes |

**The most important structural fact:** standard purchase order lines have **no table of their own**. They are stored as a JSON array in `purchase_orders.details_json` (serialised `PurchaseItemLine` objects). Everything that relates to a PO line (`goods_receipt_note_items`, `po_pr_allocations`, `purchase_order_delivery_schedules`) connects to it **logically** through `(po_number, item_code)`. PO by PR and Direct PO write exactly one JSON line per item code, so `(po_number, item_code)` identifies a PO line.

---

## 2. Screens and their backend

| Screen (menu) | Frontend file | Endpoint base | Controller → Service | Tables written | Tables read |
|---|---|---|---|---|---|
| Suppliers | `pages/SupplierMasterPage.jsx` | `/api/suppliers` | `SupplierMasterController` → `SupplierItemService` | `supplier_master`, `supplier_item` | `item_master` |
| Purchase Requisition | `pages/PurchaseRequisitionPage.jsx` | `/api/purchase/requisitions` | `PurchaseRequisitionController` → `PurchaseRequisitionService` | `purchase_requisitions`, `purchase_requisition_items`, `procurement_audit_log`, `document_number_counters` | `department_master`, `item_master`, `purchase_orders`, `po_pr_allocations` |
| Vendor Rate Master | `newpo/VendorRateMasterScreen.jsx` | `/api/new-po/vendor-rates`, `/api/new-po/lookups/*` | `NewPoController` → `VendorRateService` | `vendor_item_rates` (insert-only) | `supplier_master`, `item_master` |
| Clubbed Demand | `newpo/ClubbedDemandScreen.jsx` | `/api/new-po/sourcing/demand`, `/drafts/assign-batch` | `SourcingController` → `SourcingService` | `po_drafts`, `po_draft_allocations`, `purchase_requisition_items.drafted_qty`, `procurement_audit_log` | `purchase_requisitions`, `purchase_requisition_items`, `item_master`, `supplier_item`, `supplier_master`, `vendor_item_rates`, `hsn_tax_master` |
| Draft POs (incl. convert) | `newpo/DraftPoScreen.jsx`, `newpo/ConvertDraftScreen.jsx` | `/api/new-po/sourcing/drafts/*` | `SourcingController` → `SourcingService` → `PoByPrService` | `po_draft_allocations`, `po_drafts`, `purchase_orders`, `po_pr_allocations`, `purchase_order_terms`, `purchase_order_delivery_schedules`, `purchase_requisition_items`, `purchase_requisitions.status`, `procurement_audit_log` | the same as Clubbed Demand, plus the master_* term tables |
| PO by PR (API used by the conversion; register detail and cancellation) | `newpo/PoRegisterScreen.jsx`, `newpo/printPo.js` | `/api/new-po/pr/*` | `PoByPrController` → `PoByPrService` | `purchase_orders`, `po_pr_allocations`, `po_revisions` (on cancel) | `goods_receipt_notes`, `goods_receipt_note_items`, `grn_item_allocations`, `po_drafts`, `po_draft_allocations`, `purchase_order_terms`, `master_*`, `supplier_master` |
| Direct PO | `newpo/DirectPoScreen.jsx` | `/api/new-po/direct/*` | `DirectPoController` → `DirectPoService` | `purchase_orders` (`po_origin='DIRECT'`), `purchase_order_terms`, `purchase_order_delivery_schedules` | `supplier_master`, `item_master`, `vendor_item_rates`, `hsn_tax_master`, `master_*` |
| PO Register | `newpo/PoRegisterScreen.jsx` | `/api/new-po/reports/all-purchase-orders`, `/api/new-po/pr/purchase-orders/{po}` | `ProcurementReportController`, `PoByPrController` | (cancel only) | `purchase_orders`, `po_pr_allocations`, `goods_receipt_*`, `grn_item_allocations`, `purchase_order_terms` |
| Capital PO | `pages/CapitalPurchaseOrderPage.jsx` | `/api/capital-pos` | `CapitalPoController` → `CapitalPoService` | all `capital_po_*`, `capital_purchase_orders`, `asset_master` | `supplier_master`, `department_master`, `purchase_requisitions`, `purchase_requisition_items`, `hsn_tax_master`, `capital_po_asset_categories` |
| Service PO | `pages/ServicePurchaseOrderPage.jsx` | `/api/service-pos` | `ServicePoController` → `ServicePoService` | all `service_po_*`, `service_purchase_orders` | `supplier_master`, `department_master`, `purchase_requisitions`, `hsn_tax_master`, `service_po_categories` |
| GRN | `pages/GoodsReceiptNotePage.jsx` | `/api/purchase/grn`, `/api/purchase/orders/{po}/schedules`, `/receipt` | `GoodsReceiptNoteController` → `GoodsReceiptNoteService` → `ReceiptAttributionService`; `PurchaseProcessingController` → `PurchaseProcessingService` | `goods_receipt_notes`, `goods_receipt_note_items`, `grn_item_allocations`, `purchase_orders.status`, `purchase_order_delivery_schedules`, `purchase_order_payment_milestones` | `purchase_orders`, `po_pr_allocations`, `service_purchase_orders` (guard), `department_master` (dropdown only) |
| PR Tracking | `newpo/TrackingReportScreen.jsx` | `/api/new-po/reports/traceability`, `/pr-status/{pr}`, `/api/new-po/sourcing/audit` | `ProcurementReportController` → `ProcurementReportService`; `SourcingService.audit` | none | see §6 |
| PR vs PO / PR vs PO vs GRN / Legacy Reconciliation | `newpo/ReportsScreen.jsx` | `/api/new-po/reports/*` | `ProcurementReportController` → `ProcurementReportService` | none | see §6 |
| RFQ | `pages/RequestForQuotationPage.jsx` | `/api/purchase/rfq` | `RfqController` → `RfqService` | `rfq_headers`, `rfq_items` (and `vendor_quotations` through the Quotations API) | `purchase_requisitions` (via the PR API), `supplier_master`, `item_master` |
| Quotations | `pages/VendorQuotationsPage.jsx` | `/api/purchase/quotations` | `VendorQuotationController` → `VendorQuotationService` | `vendor_quotations`, `vendor_quotation_items`, `vendor_quotation_history`, `vendor_quotation_comments` | `item_master`, `supplier_master` (via `/api/suppliers`), `purchase_requisitions` |
| HSN / SAC master | (used by the PR, PO, Capital and Service screens) | `/api/purchase/hsn-master` | `HsnTaxMasterController` | `hsn_tax_master` | - |
| PO term masters | (Masters screens) | `/api/masters/{key}` | `MasterDataController` | `master_mode_of_payment`, `master_payment_terms`, `master_credit_period_basis`, `master_freight_options` | - |

---

## 3. Complete table inventory

PK = primary key, UK = unique key. "Rows" is PostgreSQL's planner estimate (`reltuples`) at analysis time. `-1` means the table has never been analysed (empty or small), not that the count is unknown to the app.

### 3.1 Standard procurement (PR → Draft → PO → GRN)

| # | Table | Role | PK | Other keys | Defined at |
|---|---|---|---|---|---|
| 1 | `purchase_requisitions` | PR header | `id` BIGSERIAL | UK `pr_number` | schema.sql:389 |
| 2 | `purchase_requisition_items` | PR line. Holds the **quantity state** of the whole flow: `req_qty`, `ordered_qty`, `drafted_qty`, `remaining_qty` | `id` | FK `pr_id` | schema.sql:416 (+634–642, 1706) |
| 3 | `po_drafts` | Vendor-wise draft PO (at most one OPEN draft per vendor) | `id` | UK `draft_number`; partial UK `vendor_code WHERE status='OPEN'`; FK `vendor_code` | schema.sql:1718 |
| 4 | `po_draft_allocations` | One PR line's quantity inside a draft (`reserved / converted / released`) | `id` | UK `(draft_id, pr_item_id)`; FKs `draft_id`, `pr_item_id` | schema.sql:1732 |
| 5 | `purchase_orders` | Standard PO header. **Lines are in `details_json`** | `id` VARCHAR (`PO-xxxxxxxx`) | UK `po_number` | schema.sql:445 (+644–654, 1688–1699) |
| 6 | `po_pr_allocations` | **Bridge PO ↔ PR line**: the share of one PO line that came from one PR line, with the vendor rate used | `id` | UK `(po_number, pr_item_id)`; FKs `po_number`, `pr_item_id`, `rate_id`, `draft_allocation_id`; CHECK `ck_po_pr_alloc_released` (added by `ProcurementMigrations`) | schema.sql:1644 (+1664, 1752) |
| 7 | `purchase_order_terms` | Optional commercial terms, 1:1 with a PO | `po_number` | - | `PurchaseOrderTermsService.java:39` (runtime DDL) |
| 8 | `purchase_order_delivery_schedules` | Delivery lots per PO item | `id` | - | schema.sql:681 |
| 9 | `purchase_order_payment_milestones` | Payment milestones per PO | `id` | - | schema.sql:702 |
| 10 | `po_revisions` | Audit row per PO change (written when a PO-by-PR order is cancelled) | `id` | - | schema.sql:668 |
| 11 | `purchase_order_validity_history` | Validity extension history | `id` | - | schema.sql:656 |
| 12 | `goods_receipt_notes` | GRN header (DRAFT / POSTED) | `id` | UK `grn_number` | schema.sql:494 |
| 13 | `goods_receipt_note_items` | GRN line (received / accepted / rejected / pending) | `id` | FK `grn_id` | schema.sql:533 |
| 14 | `grn_item_allocations` | **Bridge GRN line ↔ PO-by-PR allocation**: the accepted quantity attributed to each allocation | `id` | UK `(grn_item_id, allocation_id)`; FKs `grn_item_id`, `allocation_id` | schema.sql:1669 (+1684) |
| 15 | `vendor_item_rates` | Vendor Rate Master: insert-only price history | `id` | UK `(supplier_code, item_id, effective_from)`; FKs `supplier_code`, `item_id` | schema.sql:1628 |

### 3.2 RFQ and quotations

| # | Table | Role | PK | Other keys | Defined at |
|---|---|---|---|---|---|
| 16 | `rfq_headers` | Request for quotation | `id` | UK `rfq_number` | schema.sql:568 |
| 17 | `rfq_items` | RFQ line | `id` | FK `rfq_id` | schema.sql:592 |
| 18 | `vendor_quotations` | Vendor quotation header, with a revision chain | `id` | UK `quotation_number` | schema.sql:295 |
| 19 | `vendor_quotation_items` | Quotation line | `id` | FK `quotation_id` | schema.sql:339 |
| 20 | `vendor_quotation_history` | Quotation action log | `id` | FK `quotation_id` | schema.sql:363 |
| 21 | `vendor_quotation_comments` | Quotation comments | `id` | FK `quotation_id` | schema.sql:375 |

### 3.3 Capital PO (CAPEX)

| # | Table | Role | PK | Other keys | Defined at |
|---|---|---|---|---|---|
| 22 | `capital_po_asset_categories` | Asset sub-groups (FIXED_ASSET / INVENTORY) | `id` | UK `(parent_group, name)` | schema.sql:1004 |
| 23 | `capital_purchase_orders` | Capital PO header | `id` | UK `po_number`, UK `client_request_id` | schema.sql:1020 |
| 24 | `capital_po_lines` | Capital PO line | `id` | UK `(capital_po_id, line_no)`; FKs `capital_po_id`, `pr_item_id` | schema.sql:1100 |
| 25 | `capital_po_schedules` | Delivery / installation / commissioning / payment plan | `id` | UK `(capital_po_id, schedule_type, sequence_no)`; FKs | schema.sql:1153 |
| 26 | `capital_po_receipts` | Physical receipt | `id` | UK `receipt_number`, UK `(capital_po_id, idempotency_key)` | schema.sql:1173 |
| 27 | `capital_po_receipt_lines` | Receipt line | `id` | UK `(receipt_id, po_line_id)` | schema.sql:1192 |
| 28 | `asset_master` | Fixed asset register (one row per unit) | `id` | UK `asset_code`, UK `(receipt_line_id, unit_no)`, partial UK `serial_number` | schema.sql:1203 |
| 29 | `capital_po_history` | Status / approval trail | `id` | FK | schema.sql:1231 |
| 30 | `capital_po_validity_history` | Validity extensions | `id` | FK | schema.sql:1244 |
| 31 | `capital_po_amendments` | Amendment proposals | `id` | UK `(capital_po_id, revision_no)`, partial UK one PENDING per PO | schema.sql:1255 |
| 32 | `capital_po_attachments` | Files (BYTEA) | `id` | FKs | schema.sql:1273 |

Sequences: `capital_po_number_seq`, `capital_receipt_number_seq`, `asset_code_seq` (`CapitalPoService.java:1243-1248`).

### 3.4 Service PO

| # | Table | Role | PK | Other keys | Defined at |
|---|---|---|---|---|---|
| 33 | `service_po_categories` | Service sub-groups | `id` | UK `(parent_group, name)` | schema.sql:759 |
| 34 | `service_purchase_orders` | Service PO header (pricing is on the header; there are no lines) | `id` | UK `po_number` | schema.sql:771 |
| 35 | `service_po_schedules` | Planned occurrences / milestones | `id` | UK `(service_po_id, sequence_no)` | schema.sql:891 |
| 36 | `service_po_acceptances` | Service entry sheet | `id` | UK `acceptance_number`; partial UK `schedule_id` | schema.sql:908 |
| 37 | `service_po_invoices` | Invoice verification | `id` | UK `(vendor_code, invoice_number)` | schema.sql:933 |
| 38 | `service_po_status_history` | Status / approval trail | `id` | FK | schema.sql:950 |
| 39 | `service_po_validity_history` | Validity extensions | `id` | FK | schema.sql:963 |
| 40 | `service_po_revisions` | Revisions | `id` | UK `(service_po_id, revision_number)` | schema.sql:973 |
| 41 | `service_po_attachments` | Files (BYTEA) | `id` | FK | schema.sql:984 |

Sequence: `service_po_number_seq` (`ServicePoService.java:1135`).

### 3.5 Masters and support tables used by Purchase

| # | Table | Role | PK | Business key used by Purchase | Defined at |
|---|---|---|---|---|---|
| 42 | `supplier_master` | Vendor master | `id` | **`supplier_code`** (UK); `id` is used only by `supplier_item` and `vendor_quotations.vendor_id` | schema.sql:155 |
| 43 | `supplier_item` | Which items a vendor supplies | `id` | UK `(supplier_id, item_id)` | schema.sql:193 |
| 44 | `item_master` | Item master | `id` | **`sms_new_part_no`, then `old_code`** (neither is unique; see §5) | schema.sql:20 |
| 45 | `department_master` | Departments | `id` | `department_name` (UK) for PR; `dept_code` for Capital and Service PO | schema.sql:114 |
| 46 | `hsn_tax_master` | HSN/SAC → GST rates | `id` | `hsn_sac_code` (UK) | schema.sql:616 |
| 47 | `master_mode_of_payment` | PO term master | `id` | `code` (UK) | `MasterDataSchema.java:28` |
| 48 | `master_payment_terms` | PO term master | `id` | `code` (UK) | same |
| 49 | `master_credit_period_basis` | PO term master | `id` | `code` (UK) | same |
| 50 | `master_freight_options` | PO term master | `id` | `code` (UK) | same |
| 51 | `document_number_counters` | PR / PO / GRN / DRAFT numbering | `(doc_type, year)` | - | schema.sql:1710 |
| 52 | `procurement_audit_log` | Insert-only audit for PR, DRAFT and PO actions | `id` | `entity_ref` (indexed) | schema.sql:1755 |

**Present in the database but not connected to Purchase backend logic** (listed so the inventory is complete):

- `item_master_lookup` (view): not referenced by any Java code.
- `item_group` and `item_subgroup`: read only by the PR screen's item filter (`/api/inventory/item-groups`); no purchase table stores their keys.
- `procurement_master`, `process_master`, `category_master` and `operation_master`: inventory/engineering masters with no purchase reference.
- `customer_master` and `machine_master`: other modules.
- `app_setting`, `app_data_migration` and `app_seed_registry`: system tables.

---

## 4. Relationship register

Columns: **Source table.column → Target table.column**, **Type**, **Purpose**, **Where in the backend**.
FK delete rules are given only when they are not `NO ACTION`.

### 4.1 Requisition

| ID | Source | Target | Type | Purpose | Backend reference |
|---|---|---|---|---|---|
| R01 | `purchase_requisition_items.pr_id` | `purchase_requisitions.id` | **FK** (ON DELETE CASCADE) + **JOIN** | PR line belongs to PR | schema.sql:418; JOIN `pr.id = pri.pr_id` in `PoByPrService.java:49-53`, `SourcingService.java:73,182,311,679,917`, `ProcurementReportService.java:42,329`, `PurchaseRequisitionService.java:790` |
| R02 | `purchase_requisition_items.pr_number` | `purchase_requisitions.pr_number` | LOGICAL (denormalised copy) | Status roll-up and legacy quantity updates by PR number | `PurchaseRequisitionService.java:561,575,671-685` |
| R03 | `purchase_requisitions.department` | `department_master.department_name` | LOGICAL (validated on save) | PR must name an existing department. **It matches on the department *name*, not a code** | `PurchaseRequisitionService.java:402-405` |
| R04 | `purchase_requisition_items.item_code` | `item_master.sms_new_part_no`, else `item_master.old_code` | LOGICAL (validated on save) | PR line must be a real item. Resolution order: part number first, then old code, then lowest `id` | `PurchaseRequisitionService.java:416-421`; the same rule in `PoByPrService.java:790-795`, `SourcingService.java:845-866`, `DirectPoService.java:250-254` |
| R05 | `purchase_requisition_items.uom` | `item_master.purchased_uom` (else `item_master.uom`) | SNAPSHOT | PR line takes the item's purchase UoM | `PurchaseRequisitionService.java:417,422-427` |
| R06 | `purchase_requisition_items.hsn_code` | `hsn_tax_master.hsn_sac_code` | LOGICAL | HSN on the PR line wins over the item's HSN when a PO is priced | `PoByPrService.java:649-658`; `SourcingService.java:881-886` |
| R07 | `procurement_audit_log.entity_ref` (when `entity_type='PR'`) | `purchase_requisitions.pr_number` | LOGICAL (polymorphic) | Audit of PR create, edit and approval decisions | `ProcurementAudit.java:21`; `PurchaseRequisitionService.java:365,546` |
| R08 | `purchase_orders.pr_number` | `purchase_requisitions.pr_number` | LOGICAL (header, nullable) | "Generated POs" list on the PR screen. Set only when **all** lines of the PO come from one PR (`PoByPrService.java:732`); NULL for Direct PO | `PurchaseRequisitionService.java:286-291,309-314` |

### 4.2 Vendor master, item links and rates

| ID | Source | Target | Type | Purpose | Backend reference |
|---|---|---|---|---|---|
| R10 | `supplier_item.supplier_id` | `supplier_master.id` | **FK** (CASCADE) + **JOIN** | Vendor supplies item | schema.sql:199; JOIN `s.id = si.supplier_id` `SourcingService.java:901` |
| R11 | `supplier_item.item_id` | `item_master.id` | **FK** (CASCADE) | Vendor supplies item | schema.sql:200; checked in `SourcingService.java:291-297` |
| R12 | `vendor_item_rates.supplier_code` | `supplier_master.supplier_code` | **FK** + **JOIN** | Rate belongs to a vendor | schema.sql:1630; JOIN `VendorRateService.java:78`; `SourcingService.java:903` (LATERAL) |
| R13 | `vendor_item_rates.item_id` | `item_master.id` | **FK** + **JOIN** | Rate belongs to an item | schema.sql:1631; JOIN `VendorRateService.java:79` |
| R14 | `vendor_item_rates` → `supplier_item` | through `supplier_master.supplier_code` → `supplier_master.id` = `supplier_item.supplier_id`, and `vendor_item_rates.item_id` = `supplier_item.item_id` | INDIRECT + **JOIN** (LATERAL) | A vendor is suggested only when **both** a `supplier_item` link and an effective rate exist | `SourcingService.java:898-906` |
| R15 | `purchase_requisition_items.item_code` → `vendor_item_rates` | via `item_master.id` (R04) and the vendor chosen | INDIRECT | Effective rate = latest row with `effective_from <= PO date` | `VendorRateService.java:98-109` |

### 4.3 Sourcing drafts

| ID | Source | Target | Type | Purpose | Backend reference |
|---|---|---|---|---|---|
| R20 | `po_drafts.vendor_code` | `supplier_master.supplier_code` | **FK** + **JOIN** | Draft is for one vendor | schema.sql:1721; JOIN `SourcingService.java:637-640`, `ProcurementReportService.java:354` |
| R21 | `po_draft_allocations.draft_id` | `po_drafts.id` | **FK** + **JOIN** | Draft line belongs to draft | schema.sql:1734; JOIN `ProcurementReportService.java:333,336,353`, `PoByPrService.java:332` |
| R22 | `po_draft_allocations.pr_item_id` | `purchase_requisition_items.id` | **FK** + **JOIN** | Draft line reserves part of a PR line | schema.sql:1735; JOIN `SourcingService.java:674-679` |
| R23 | `po_draft_allocations.pr_number` | `purchase_requisitions.pr_number` | LOGICAL (copy) | Search and filter by PR number | `SourcingService.java:351,373` |
| R24 | `po_draft_allocations.(reserved_qty − converted_qty − released_qty)` | `purchase_requisition_items.drafted_qty` | QTY-MIRROR | `drafted_qty` is the sum of open draft quantity; both are changed together under the PR line's row lock | `SourcingService.java:350-355,426-428,616-618`; `PurchaseRequisitionService.java:641-667` |
| R25 | `procurement_audit_log.entity_ref` (when `entity_type='DRAFT'`) | `po_drafts.draft_number` | LOGICAL | Draft CREATED / ASSIGNED / RELEASED_TO_SOURCING / CONVERTED_TO_PO | `SourcingService.java:359,435,552,667` |

### 4.4 Purchase order

| ID | Source | Target | Type | Purpose | Backend reference |
|---|---|---|---|---|---|
| R30 | `purchase_orders.vendor_code` | `supplier_master.supplier_code` | LOGICAL (validated: exists and ACTIVE) + JPA repository lookup | PO vendor | `PoByPrService.java:561-566`, `DirectPoService.java:119-121`; `PurchaseProcessingService.java:108,180` (`findBySupplierCode`) |
| R31 | `purchase_orders.vendor_name`, `vendor_gstin`, `vendor_pan`, `contact_person`, `phone`, `email`, `shipping_address`, `payment_terms` | `supplier_master.supplier_name`, `gstin`, `pan`, `contact_person`, `phone`, `email`, `address`+`city`+`state`+`pincode`, `payment_terms_id` | SNAPSHOT | Vendor details printed on the PO | `PurchaseProcessingService.java:180-191`; inserted at `PoByPrService.java:760-773`, `DirectPoService.java:226-244` |
| R32 | GST split on every PO line | `supplier_master.gstin` (first 2 characters) compared with company state `'27'` | LOGICAL | IGST when the vendor's GSTIN state ≠ 27, otherwise CGST + SGST | `PurchaseProcessingService.java:105-140` |
| R33 | `purchase_orders.department`, `requested_by` | `purchase_requisitions.department`, `requisitioner` (of the first selected PR line) | SNAPSHOT | PO header shows the requesting department | `PoByPrService.java:731-736,766` |
| R34 | `purchase_orders.details_json[].itemCode` | `item_master.sms_new_part_no` / `old_code` | JSON + LOGICAL | PO line's item | built in `PoByPrService.java:661-689`, `DirectPoService.java:174-186` |
| R35 | `purchase_orders.details_json[].hsnCode` | `hsn_tax_master.hsn_sac_code` (`is_active = TRUE`) | JSON + LOGICAL (validated) | GST rate of the PO line | `PoByPrService.java:654-658`, `DirectPoService.java:169`, `PurchaseProcessingService.java:83-99` |
| R36 | `item_master.hsn_code` | `hsn_tax_master.hsn_sac_code` | LOGICAL | Fallback HSN when the PR line or Direct PO line has none | `PurchaseProcessingService.java:71-79`, `PoByPrService.java:797-800`, `DirectPoService.java:164-165` |
| R37 | `purchase_orders.details_json[].unitRate` | `vendor_item_rates.offered_unit_price` | SNAPSHOT | PO price comes from the effective vendor rate (Direct PO keeps no `rate_id`) | `DirectPoService.java:159-182` |
| R38 | `purchase_orders.source_quotation_number` / `source_quotation_id` | `vendor_quotations.quotation_number` / `id` | LOGICAL (legacy) | Columns are loaded and re-saved; **no current endpoint creates a PO from a quotation** | `PurchaseProcessingService.java:368,381,432-433` |
| R39 | `PurchaseItemLine.sourceQuotationNumber` (inside `details_json`) | `vendor_quotations.quotation_number` | JSON + LOGICAL | Overrides the payment terms with the quotation's | `PurchaseProcessingService.java:193-203` |
| R40 | `purchase_order_terms.po_number` | `purchase_orders.po_number` | LOGICAL (1:1, PK, **no FK**) | Optional PO terms, saved in the PO's create transaction | `PurchaseOrderTermsService.java:72-91,94-101`; called from `PoByPrService.java:533`, `DirectPoService.java:97` |
| R41 | `purchase_order_terms.mode_of_payment_code` | `master_mode_of_payment.code` | LOGICAL (validated: exists and `is_active`) | Term dropdown | `PurchaseOrderTermsService.java:25-30,54-69`; name lookup `PoByPrService.java:402-415` |
| R42 | `purchase_order_terms.payment_terms_code` | `master_payment_terms.code` | LOGICAL (validated) | Term dropdown | same |
| R43 | `purchase_order_terms.credit_period_basis_code` | `master_credit_period_basis.code` | LOGICAL (validated) | Term dropdown | same |
| R44 | `purchase_order_terms.freight_option_code` | `master_freight_options.code` | LOGICAL (validated) | Term dropdown | same |
| R45 | `purchase_order_delivery_schedules.po_number` | `purchase_orders.po_number` | LOGICAL | Delivery lots. Rows are replaced on save (DELETE + INSERT) | `PurchaseProcessingService.java:488-530` |
| R46 | `purchase_order_delivery_schedules.(po_number, item_code)` | PO line in `purchase_orders.details_json` | LOGICAL (validated: lot quantities ≤ PO quantity) | Lot belongs to a PO item | `DeliveryLots.validate` called at `PoByPrService.java:727`, `DirectPoService.java:133` |
| R47 | `purchase_order_delivery_schedules.po_id` | (nothing) | unused | Column exists (BIGINT) but no insert sets it, and `purchase_orders.id` is VARCHAR, so it could not reference that column | `PurchaseProcessingService.java:522-528` |
| R48 | `purchase_order_payment_milestones.(po_number, linked_lot_number)` | `purchase_order_delivery_schedules.(po_number, lot_number)` | LOGICAL | Receiving a lot marks the linked milestone DUE. **No code inserts milestone rows**; only this UPDATE exists | `PurchaseProcessingService.java:547-552` |
| R49 | `po_revisions.po_number` | `purchase_orders.po_number` | LOGICAL | Audit row written when a PO-by-PR order is cancelled | `PoByPrService.java:487-497` |
| R50 | `purchase_order_validity_history.po_number` | `purchase_orders.po_number` | LOGICAL (schema intent only) | **No Java code reads or writes this table** | schema.sql:656 |
| R51 | `procurement_audit_log.entity_ref` (when `entity_type='PO'`) | `purchase_orders.po_number` | LOGICAL | PO CREATED_FROM_DRAFT | `SourcingService.java:554` |

### 4.5 PO ↔ PR bridge (`po_pr_allocations`)

| ID | Source | Target | Type | Purpose | Backend reference |
|---|---|---|---|---|---|
| R60 | `po_pr_allocations.po_number` | `purchase_orders.po_number` | **FK** + **JOIN** | Allocation belongs to a PO | schema.sql:1646; JOIN `PoByPrService.java:307`, `ProcurementReportService.java:38,45,89,215,261,334,371` |
| R61 | `po_pr_allocations.pr_item_id` | `purchase_requisition_items.id` | **FK** + **JOIN** | The PR line the quantity came from | schema.sql:1647; JOIN `PoByPrService.java:329`, `ProcurementReportService.java:217,263`, `PurchaseRequisitionService.java:790` |
| R62 | `po_pr_allocations.rate_id` | `vendor_item_rates.id` | **FK** | The exact rate row used to price the PO | schema.sql:1652; written `PoByPrService.java:537-540` |
| R63 | `po_pr_allocations.draft_allocation_id` | `po_draft_allocations.id` | **FK** (nullable) + **LEFT JOIN** | The draft line the PO quantity was converted from | schema.sql:1752; set at `SourcingService.java:543`; JOIN `PoByPrService.java:331`, `ProcurementReportService.java:372` |
| R64 | `po_pr_allocations.pr_number` | `purchase_requisitions.pr_number` | LOGICAL (copy) + **JOIN on value** | Reports join PR headers through this copy rather than through `pr_item_id → pr_id` | JOIN `pr.pr_number = a.pr_number` `ProcurementReportService.java:90,216,262`; filters `PurchaseRequisitionService.java:780-781` |
| R65 | `po_pr_allocations.(po_number, item_code)` | PO line in `purchase_orders.details_json` | LOGICAL | PO by PR writes one PO line per item; allocations of the same item sum to that line's quantity | `PoByPrService.java:623-690` |
| R66 | `po_pr_allocations.(allocated_qty − released_qty)` | `purchase_requisition_items.ordered_qty` | QTY-MIRROR | Every allocation calls `reserveOrdered`, and every cancellation calls `releaseOrdered`, on the same PR line in the same transaction | `PoByPrService.java:536-543,471-479`; `PurchaseRequisitionService.java:586-619` |
| R67 | `purchase_requisition_items.ordered_qty − Σ net allocations` | (none) | derived | "Ordered outside PO by PR" (legacy orders that cannot be traced to a PO line) | `PoByPrService.java:299-301`; `ProcurementReportService.java:64` |

### 4.6 Goods receipt

| ID | Source | Target | Type | Purpose | Backend reference |
|---|---|---|---|---|---|
| R70 | `goods_receipt_note_items.grn_id` | `goods_receipt_notes.id` | **FK** (CASCADE) + **JOIN** | GRN line belongs to GRN | schema.sql:535; JOIN `n.id = gi.grn_id` in `PoByPrService.java:255,339,423,463`, `ProcurementReportService.java:40,84-88,151,339,380`, `PurchaseProcessingService.java:331`, `ReceiptAttributionService.java:66` |
| R71 | `goods_receipt_notes.po_number` | `purchase_orders.po_number` | LOGICAL (indexed `idx_grn_po`; PO is locked `FOR UPDATE` at posting) | GRN is against one PO | `GoodsReceiptNoteService.java:281-282,295-297`; `ReceiptAttributionService.java:40-41` |
| R72 | `goods_receipt_note_items.(po_number, item_code)` | PO line in `purchase_orders.details_json` | LOGICAL (validated at posting) | Over-receipt check uses the PO quantity read from the database, never the quantity the client sent | `GoodsReceiptNoteService.java:350-365,568-596` |
| R73 | `goods_receipt_notes.vendor_code`, `vendor_name`, `vendor_gstin`, `po_date`, `pr_number` | `purchase_orders` (same columns) | SNAPSHOT (sent by the GRN screen from the pending-PO list) | GRN header display | `GoodsReceiptNoteService.java:397-434` |
| R74 | `goods_receipt_note_items.grn_number`, `po_number` | `goods_receipt_notes.grn_number`, `po_number` | LOGICAL (copy) | Line-level filtering by PO / GRN number | `GoodsReceiptNoteService.java:476-493` |
| R75 | `grn_item_allocations.grn_item_id` | `goods_receipt_note_items.id` | **FK** + **JOIN** | Which GRN line was attributed | schema.sql:1671; JOIN `g.grn_item_id = gi.id` (all report queries) |
| R76 | `grn_item_allocations.allocation_id` | `po_pr_allocations.id` | **FK** + **JOIN** | Which PO-by-PR allocation (hence which PR line) the accepted quantity fulfils | schema.sql:1672; JOIN `PoByPrService.java:421`, `ProcurementReportService.java:39,338` |
| R77 | Posting a GRN | `purchase_orders.status` | LOGICAL write-back | `COMPLETED` when every PO line's accepted quantity ≥ its ordered quantity, `PARTIALLY RECEIVED` when any is accepted; unchanged when nothing is accepted | `GoodsReceiptNoteService.java:511-550` |
| R78 | `goods_receipt_notes.po_number` | `service_purchase_orders.po_number` | LOGICAL **negative guard** | A Service PO number can never be received through a GRN | `ServicePoService.java:750-758`, called at `GoodsReceiptNoteService.java:285` and `PurchaseProcessingService.java:535` |
| R79 | GRN validity check | `purchase_orders.validity_date` | LOGICAL | An expired PO blocks saving or posting a GRN | `PoValidity.assertNotExpired` at `GoodsReceiptNoteService.java:281-282`, `PurchaseProcessingService.java:536-537` |
| R80 | `/api/purchase/orders/{po}/receipt` `(po_number, item_code, lot_number)` | `purchase_order_delivery_schedules` | LOGICAL write | The GRN screen posts accepted quantity per delivery lot after the GRN is saved | `GoodsReceiptNotePage.jsx:432-445` → `PurchaseProcessingService.java:533-546` |
| R81 | `goods_receipt_notes.store_location` | (fixed list on screen, plus `department_master.department_name`) | UI only | The dropdown offers four fixed stores and all department names. The backend only checks that the field is not blank | `GoodsReceiptNotePage.jsx:1063-1069`; `GoodsReceiptNoteService.java:270-272` |

### 4.7 RFQ and quotations

| ID | Source | Target | Type | Purpose | Backend reference |
|---|---|---|---|---|---|
| R90 | `rfq_items.rfq_id` | `rfq_headers.id` | **FK** (CASCADE) | RFQ line belongs to RFQ | schema.sql:594 |
| R91 | `rfq_headers.pr_number` | `purchase_requisitions.pr_number` | LOGICAL (not validated by backend) | RFQ raised for a PR; `/rfq/by-pr/{pr}` | `RfqService.java:98` |
| R92 | `rfq_items.pr_number`, `rfq_items.rfq_number` | `purchase_requisitions.pr_number`, `rfq_headers.rfq_number` | LOGICAL (copy) | Line-level filtering | `RfqService.java:201` |
| R93 | `rfq_items.item_code` | `item_master` (code chosen on screen) | LOGICAL (UI only) | Item being enquired | `RequestForQuotationPage.jsx` (`/api/inventory/items`) |
| R94 | `rfq_headers.selected_vendors_json[]` | `supplier_master` rows (`id`, `supplier_code`, `supplier_name`) | JSON | Invited vendors (no constraint) | `RequestForQuotationPage.jsx:579,625-626` |
| R95 | `vendor_quotation_items.quotation_id` | `vendor_quotations.id` | **FK** (CASCADE) + **JOIN** | Quotation line belongs to quotation | schema.sql:341; JOIN `VendorQuotationService.java:210,687,739,787,846,875` |
| R96 | `vendor_quotation_history.quotation_id` | `vendor_quotations.id` | **FK** (CASCADE) | Action log | schema.sql:365 |
| R97 | `vendor_quotation_comments.quotation_id` | `vendor_quotations.id` | **FK** (CASCADE) | Comments | schema.sql:377 |
| R98 | `vendor_quotations.parent_quotation_id` | `vendor_quotations.id` | LOGICAL self-reference (**no FK**) | Revision chain: each revision is a new row with `-R<n>`; the parent row gets `is_latest = FALSE` | `VendorQuotationService.java:561-597` |
| R99 | `vendor_quotations.vendor_id` | `supplier_master.id` | LOGICAL (**no FK**) | The screen sends `supplier_master.id` from `/api/suppliers` | `VendorQuotationsPage.jsx:648-655` |
| R100 | `vendor_quotations.vendor_code`, `vendor_name` | `supplier_master.supplier_code`, `supplier_name` | SNAPSHOT | All analytics group by `vendor_code`. If no code is sent, the backend generates `VEND-<vendorId>` | `VendorQuotationService.java:323,826-880` |
| R101 | `vendor_quotations.pr_id` / `pr_number` | `purchase_requisitions.id` / `pr_number` | LOGICAL (**no FK**) | Quotation raised against a PR | `VendorQuotationsPage.jsx:373-374`; `VendorQuotationService.java:434-443` |
| R102 | `vendor_quotation_items.pr_item_id` | `purchase_requisition_items.id` | LOGICAL (**no FK**) | Quoted line ↔ PR line | `VendorQuotationsPage.jsx:367`; `VendorQuotationService.java:509-512` |
| R103 | `vendor_quotation_items.item_id` | `item_master.id` | LOGICAL (**no FK**) | Stored only if the client sends it | `VendorQuotationService.java:158-159,509-512` |
| R104 | `vendor_quotation_items.item_code` | `item_master.sms_new_part_no` | LOGICAL | "Previous purchase rate" falls back to `item_master.price` | `VendorQuotationService.java:748-752` |
| R105 | `rfq_headers` ↔ `vendor_quotations` | through `pr_number` (R91 + R101) | INDIRECT | No stored RFQ key on a quotation. The RFQ screen matches bids to invited vendors by `vendorName` / `vendorId` in the browser | `RequestForQuotationPage.jsx:1985-1987` |

### 4.8 Capital PO

| ID | Source | Target | Type | Purpose | Backend reference |
|---|---|---|---|---|---|
| C01 | `capital_po_lines.capital_po_id` | `capital_purchase_orders.id` | **FK** (CASCADE) + **JOIN** | Line belongs to PO | schema.sql:1102; JOIN `CapitalPoService.java:144,1064` |
| C02 | `capital_po_lines.pr_item_id` | `purchase_requisition_items.id` | **FK** + **JOIN** (correlated) | Capital line ordered against a PR line | schema.sql:1135; `CapitalPoService.java:139-146,1058-1072` |
| C03 | `capital_purchase_orders.pr_number` | `purchase_requisitions.pr_number` | LOGICAL (validated) | Header PR reference. Eligible PRs are `pr_type = 'Capital Goods / Asset'` with status Approved / Partially Ordered | `CapitalPoService.java:139-140,911` |
| C04 | Capital availability | `purchase_requisition_items.remaining_qty − Σ capital_po_lines.quantity` (non-DRAFT/REJECTED/CANCELLED POs) | LOGICAL (derived) | Capital PO **does not** update `ordered_qty`; it computes availability itself | `CapitalPoService.java:1058-1072` |
| C05 | `capital_purchase_orders.vendor_code` (+ address / GSTIN / PAN / state snapshot) | `supplier_master.supplier_code` | LOGICAL + SNAPSHOT | Vendor | `CapitalPoService.java:854` |
| C06 | `capital_purchase_orders.department_code`, `department_name` | `department_master.dept_code`, `department_name` (looked up by `department_master.id`) | SNAPSHOT | Requesting department | `CapitalPoService.java:881` |
| C07 | `capital_po_lines.asset_category` | `capital_po_asset_categories.name` (`parent_group='Assets'`, active) | LOGICAL (validated) | Asset category and its treatment | `CapitalPoService.java:995,650` |
| C08 | `capital_po_lines.hsn_code` | `hsn_tax_master.hsn_sac_code` (`type='GOODS'`, active) | LOGICAL (validated) | GST on asset lines | `CapitalPoService.java:1002` |
| C09 | `capital_purchase_orders.charges_sac_code` | `hsn_tax_master.hsn_sac_code` (`type='SERVICE'`, active) | LOGICAL (validated) | GST on freight / installation charges | `CapitalPoService.java:929` |
| C10 | `capital_po_schedules.capital_po_id` / `line_id` | `capital_purchase_orders.id` / `capital_po_lines.id` | **FK** (CASCADE) | Plan rows | schema.sql:1155-1156 |
| C11 | `capital_po_receipts.capital_po_id` | `capital_purchase_orders.id` | **FK** + **JOIN** | Receipt against PO | schema.sql:1176; `CapitalPoService.java:642` |
| C12 | `capital_po_receipt_lines.receipt_id` | `capital_po_receipts.id` | **FK** (CASCADE) + **JOIN** | Receipt line | schema.sql:1194; `CapitalPoService.java:642,794` |
| C13 | `capital_po_receipt_lines.po_line_id` | `capital_po_lines.id` | **FK** + **JOIN** | Which PO line was received | schema.sql:1195; `CapitalPoService.java:642,793` |
| C14 | `asset_master.capital_po_id`, `capital_po_line_id`, `receipt_line_id` | `capital_purchase_orders.id`, `capital_po_lines.id`, `capital_po_receipt_lines.id` | **FK** ×3 | One asset per received unit | schema.sql:1215-1217 |
| C15 | `capital_po_history` / `capital_po_validity_history` / `capital_po_amendments` `.capital_po_id` | `capital_purchase_orders.id` | **FK** | Audit trails | schema.sql:1233,1246,1257 |
| C16 | `capital_po_attachments.capital_po_id` / `line_id` / `receipt_id` | PO / line / receipt | **FK** (CASCADE) ×3 | Files | schema.sql:1275-1277 |
| C17 | `capital_po_receipts.vendor_code` | `capital_purchase_orders.vendor_code` | SNAPSHOT | Receipt vendor | schema.sql:1179 |

### 4.9 Service PO

| ID | Source | Target | Type | Purpose | Backend reference |
|---|---|---|---|---|---|
| S01 | `service_po_schedules.service_po_id` | `service_purchase_orders.id` | **FK** (CASCADE) | Planned occurrences | schema.sql:893 |
| S02 | `service_po_acceptances.service_po_id` / `schedule_id` | `service_purchase_orders.id` / `service_po_schedules.id` | **FK** ×2 | Service entry sheet (one acceptance per schedule, unless rejected) | schema.sql:911-912,928 |
| S03 | `service_po_invoices.service_po_id` / `acceptance_id` | `service_purchase_orders.id` / `service_po_acceptances.id` | **FK** ×2 | Invoice verification | schema.sql:935-936 |
| S04 | `service_po_status_history` / `validity_history` / `revisions` `.service_po_id` | `service_purchase_orders.id` | **FK** | Audit trails | schema.sql:952,965,975 |
| S05 | `service_po_attachments.service_po_id` | `service_purchase_orders.id` | **FK** (CASCADE) | Files | schema.sql:986 |
| S06 | `service_purchase_orders.vendor_code` (+ snapshot) | `supplier_master.supplier_code` | LOGICAL + SNAPSHOT | Vendor | `ServicePoService.java:769` |
| S07 | `service_purchase_orders.department_code`, `department_name` | `department_master.dept_code`, `department_name` (by `id`) | SNAPSHOT | Department | `ServicePoService.java:804` |
| S08 | `service_purchase_orders.pr_number` | `purchase_requisitions.pr_number` | LOGICAL (validated exists) | Optional PR reference; no PR quantity is touched | `ServicePoService.java:818` |
| S09 | `service_purchase_orders.service_category` | `service_po_categories.name` (`parent_group='Service'`, active) | LOGICAL (validated) | Category | `ServicePoService.java:849` |
| S10 | `service_purchase_orders.sac_code` (+ `gst_rate`, `cess_rate`, `sac_description`) | `hsn_tax_master.hsn_sac_code` (`type='SERVICE'`) | LOGICAL + SNAPSHOT | Tax rates are always taken from the master | `ServicePoService.java:873` |
| S11 | `service_po_invoices.vendor_code` | `service_purchase_orders.vendor_code` | LOGICAL | Duplicate-invoice guard `UNIQUE (vendor_code, invoice_number)` | schema.sql:945 |
| S12 | `service_purchase_orders.po_number` | `goods_receipt_notes.po_number` / delivery-schedule receipts | LOGICAL negative guard | Service POs never use GRN | `ServicePoService.java:750-758` |

### 4.10 Numbering and audit (shared support)

| ID | Source | Target | Type | Purpose | Backend reference |
|---|---|---|---|---|---|
| D01 | `document_number_counters (doc_type='PR', year)` | `purchase_requisitions.pr_number` | LOGICAL | `PR-YYYY-NNNNN`. The counter is moved past `MAX` of the stored numbers | `DocumentNumbers.java:24-27,52-84` |
| D02 | `document_number_counters ('PO', year)` | `purchase_orders.po_number` | LOGICAL | `PO-YYYY-NNNNN` (PO by PR and Direct PO) | `PurchaseProcessingService.java:307-314` |
| D03 | `document_number_counters ('GRN', year)` | `goods_receipt_notes.grn_number` | LOGICAL | `GRN-YYYY-NNNNN` | `GoodsReceiptNoteService.java:253-260` |
| D04 | `document_number_counters ('DRAFT', year)` | `po_drafts.draft_number` | LOGICAL | `DRAFT-YYYY-NNN` | `SourcingService.java:662-663` |
| D05 | RFQ number / quotation number | `MAX(rfq_headers.id)` / `MAX(vendor_quotations.id)+1` | LOGICAL | Not counter-based | `RfqService.java:108`; `VendorQuotationService.java:339` |
| D06 | Capital / Service PO numbers | PostgreSQL sequences | sequence | `capital_po_number_seq`, `capital_receipt_number_seq`, `asset_code_seq`, `service_po_number_seq` | `CapitalPoService.java:1243-1248`; `ServicePoService.java:1135` |

---

## 5. Key resolution rules (how values are matched)

1. **Item:** `purchase_requisition_items.item_code`, `po_draft_allocations.item_code`, `po_pr_allocations.item_code`, `details_json[].itemCode` and `goods_receipt_note_items.item_code` all hold the same code string. To reach `item_master.id`:
   ```sql
   SELECT id FROM item_master
   WHERE sms_new_part_no = :code OR old_code = :code
   ORDER BY (sms_new_part_no = :code) DESC, id LIMIT 1
   ```
   (`PoByPrService.java:790-795`). Neither column is unique, so the lowest `id` wins on ties. `vendor_item_rates` and `supplier_item` are the only purchase tables that store `item_master.id` directly. Note: `PurchaseProcessingService.calculate` uses a slightly different HSN fallback (`ORDER BY id LIMIT 1`, without part-number priority) at `PurchaseProcessingService.java:73-75`.
2. **Vendor:** every standard-flow document stores `supplier_master.supplier_code` (`vendor_code`). Only `supplier_item.supplier_id` and `vendor_quotations.vendor_id` store `supplier_master.id`. Two of these vendor links are real FKs: `po_drafts.vendor_code` and `vendor_item_rates.supplier_code`.
3. **Department:** PR stores **`department_master.department_name`**. Capital PO and Service PO receive a `department_master.id` and store `dept_code` + `department_name`.
4. **HSN:** PR line `hsn_code` first, then `item_master.hsn_code`; must exist in `hsn_tax_master` with `is_active = TRUE`.
5. **Effective vendor rate** (`VendorRateService.java:103-107`):
   ```sql
   SELECT * FROM vendor_item_rates
   WHERE supplier_code = :vendor AND item_id = :itemId AND effective_from <= :poDate
   ORDER BY effective_from DESC, created_at DESC LIMIT 1
   ```
6. **PO line identity:** `(po_number, item_code)` into `purchase_orders.details_json`.

---

## 6. Reports: tables, JOINs and calculations

All new-PO reports are in `ProcurementReportService.java` (read-only) and exposed under `/api/new-po/reports/*` by `ProcurementReportController.java`.

### 6.1 PO vs PR (`/reports/po-vs-pr`, `poVsPr`, lines 32-75)
- **Driving table:** `purchase_requisition_items pri JOIN purchase_requisitions pr ON pr.id = pri.pr_id`.
- **Correlated subqueries:**
  - `po_pr_allocations a WHERE a.pr_item_id = pri.id`, which gives `Σ(allocated_qty − released_qty)` and the PO numbers.
  - `po_pr_allocations a JOIN purchase_orders p ON p.po_number = a.po_number`, which gives the vendor names.
  - `grn_item_allocations g JOIN po_pr_allocations a ON a.id = g.allocation_id JOIN goods_receipt_note_items gi ON gi.id = g.grn_item_id JOIN goods_receipt_notes n ON n.id = gi.grn_id WHERE n.status='POSTED'`, which gives `Σ g.accepted_qty`.
- **Filters:** PR number, PO number (EXISTS on allocations), vendor (EXISTS allocations ⋈ purchase_orders.vendor_code).
- **Calculations:**
  - `orderedOutsidePoByPr = max(ordered_qty − allocatedNet, 0)`
  - `remainingToOrder = max(req_qty − ordered_qty, 0)`
  - `pendingReceipt = max(allocatedNet − received, 0)`
  - `lifecycle`: OPEN / PARTIALLY_ORDERED / FULLY_ORDERED_AWAITING_RECEIPT / ELIGIBLE_FOR_CLOSURE (lines 197-202).

### 6.2 PR vs PO vs GRN (`/reports/po-vs-pr-vs-grn`, `poVsPrVsGrn`, lines 78-119)
- **Driving table:** `po_pr_allocations a JOIN purchase_orders p ON p.po_number = a.po_number JOIN purchase_requisitions pr ON pr.pr_number = a.pr_number`.
- **Subqueries:**
  - received (accepted) = `Σ grn_item_allocations.accepted_qty` for `g.allocation_id = a.id` on POSTED GRNs
  - PO-line rejected = `Σ goods_receipt_note_items.rejected_qty WHERE gi.po_number = a.po_number AND gi.item_code = a.item_code` (POSTED), which is a **logical** join through `(po_number, item_code)`
  - GRN numbers = `string_agg(n.grn_number)`
- **Calculations:**
  - `netOrdered = allocated − released`
  - `pendingReceipt = max(net − received, 0)`
  - `rejectedDisposition = RETAINED_NOT_RETURNED` if rejected > 0

### 6.3 PR vs PO (`/reports/pr-vs-po`, `prVsPo`, lines 209-243) and item summary (`/reports/pr-vs-po/item-summary`, lines 249-306)
- **JOINs:**
  - `po_pr_allocations a`
  - `JOIN purchase_orders p ON p.po_number = a.po_number`
  - `JOIN purchase_requisitions pr ON pr.pr_number = a.pr_number`
  - `JOIN purchase_requisition_items pri ON pri.id = a.pr_item_id`
- **Filter:** `pr.pr_date` between from/to.
- **Calculations:**
  - `daysGap = CAST(p.po_date AS DATE) − pr.pr_date` (`purchase_orders.po_date` is VARCHAR and is cast)
  - `poQty = allocated − released`
  - `balanceQty = req_qty − ordered_qty`
- **Item summary:**
  - groups by `item_code`
  - `amount = Σ(poQty × a.unit_price)`, so each PO is priced at its own rate
  - `prQty` / `balanceQty` are summed once per distinct `pr_item_id`

### 6.4 PR Tracking / Traceability (`/reports/traceability`, `traceability` lines 323-487; export `traceabilityFlat` lines 494-532; `/reports/pr-status/{pr}` lines 558-588)
1. **Lines:** `purchase_requisition_items pri JOIN purchase_requisitions pr ON pr.id = pri.pr_id`.
   - **Vendor filter:** EXISTS through `po_draft_allocations ⋈ po_drafts (d.vendor_code)` OR through `po_pr_allocations ⋈ purchase_orders (p.vendor_code)`.
   - **Document filter:** PR number, draft number (`po_draft_allocations ⋈ po_drafts`), PO number (`po_pr_allocations`) or GRN number (`po_pr_allocations ⋈ grn_item_allocations ⋈ goods_receipt_note_items ⋈ goods_receipt_notes`).
2. **Drafts per line:** `po_draft_allocations da JOIN po_drafts d ON d.id = da.draft_id JOIN supplier_master s ON s.supplier_code = d.vendor_code`.
3. **POs per line:** `po_pr_allocations a JOIN purchase_orders p ON p.po_number = a.po_number LEFT JOIN po_draft_allocations da ON da.id = a.draft_allocation_id LEFT JOIN po_drafts d ON d.id = da.draft_id`.
4. **GRNs per allocation:** `grn_item_allocations g JOIN goods_receipt_note_items gi ON gi.id = g.grn_item_id JOIN goods_receipt_notes n ON n.id = gi.grn_id WHERE n.status='POSTED'`.
5. **Calculations:**
   - `readyForSourcing = req − ordered − drafted` (approved PRs only)
   - `awaiting = Σ net PO qty − Σ accepted`
   - **stage:** AWAITING_APPROVAL → READY_FOR_SOURCING → IN_DRAFT → AWAITING_RECEIPT → ORDERED_UNTRACKED → COMPLETED
6. **Audit panel:** `/api/new-po/sourcing/audit` reads `procurement_audit_log WHERE entity_ref = ?` (`SourcingService.java:628-633`).

### 6.5 Legacy Reconciliation (`/reports/legacy-reconciliation`, lines 125-191)
1. `purchase_orders p WHERE NOT EXISTS (po_pr_allocations a WHERE a.po_number = p.po_number)`, with a count of POSTED `goods_receipt_notes` by `po_number`. This produces PO_WITHOUT_PR_ALLOCATION and PO_NAMES_PR_WITHOUT_ALLOCATION.
2. `goods_receipt_note_items gi JOIN goods_receipt_notes n ON n.id = gi.grn_id WHERE POSTED AND NOT EXISTS (grn_item_allocations g WHERE g.grn_item_id = gi.id)`. This produces UNATTRIBUTED_RECEIPT.
3. `purchase_requisition_items WHERE ordered_qty > Σ(po_pr_allocations net)`. This produces PR_QUANTITY_WITHOUT_ALLOCATION.

### 6.6 PO Register (`/reports/all-purchase-orders`, lines 594-617) and PO detail (`/pr/purchase-orders/{po}`, `PoByPrService.poDetail` lines 316-385)
- **Register:** `purchase_orders` with subqueries on `po_pr_allocations` (count, `string_agg(pr_number)`).
  - `origin` = `po_origin` if set; otherwise PO_BY_PR if allocations exist, else LEGACY (`PoByPrService.originOf`).
- **Detail:**
  - header from `purchase_orders`
  - allocations `JOIN purchase_requisition_items JOIN purchase_requisitions LEFT JOIN po_draft_allocations LEFT JOIN po_drafts`
  - received per allocation from `grn_item_allocations ⋈ goods_receipt_note_items ⋈ goods_receipt_notes`
  - vendor address from `supplier_master WHERE supplier_code = ?`
  - terms from `purchase_order_terms` with names from the four `master_*` tables
  - `receiptPosition` = Σ received / accepted / rejected / pending from `goods_receipt_note_items ⋈ goods_receipt_notes WHERE gi.po_number = ? AND gi.item_code = ?` (lines 245-271)

### 6.7 GRN pending POs (`/api/purchase/grn/pending-pos`, `GoodsReceiptNoteService.java:166-250`)
- **Sources:**
  - PO list from the **in-memory PO cache**, which is loaded from `purchase_orders` (`PurchaseProcessingService.loadOrdersFromDb`, line 396)
  - PR numbers per PO = `string_agg(DISTINCT pr_number)` from `po_pr_allocations GROUP BY po_number`
  - received per line = `Σ goods_receipt_note_items.accepted_qty WHERE po_number = ? AND item_code = ? AND grn_id IN (POSTED GRNs)`
- **Calculation:** `balance = ordered − accepted`. CANCELLED and COMPLETED POs are excluded.

### 6.8 Quotation analytics (`VendorQuotationService.java`)
| Endpoint | Tables / JOIN | Calculation |
|---|---|---|
| `/quotations/summary` (lines 186-198) | `vendor_quotations` (`is_latest = TRUE`) | counts: total, under review, selected, expiring in 7 days, distinct vendors, received in last 14 days |
| `/quotations` list (lines 206-213) | `vendor_quotations q INNER JOIN vendor_quotation_items it ON it.quotation_id = q.id` (only when filtering by item) | - |
| `/quotations/comparison` (lines 676-772) | `vendor_quotations q INNER JOIN vendor_quotation_items it ON it.quotation_id = q.id WHERE it.item_code = ? AND q.is_latest`; previous rate from the same join for the same vendor, else `item_master.price WHERE sms_new_part_no = item_code` | `effective_unit_cost × requiredQty`; lowest flagged; `diff = cost − lowest`, `diff% = diff × 100 / lowest` |
| `/quotations/price-history` (lines 780-800) | `vendor_quotation_items it JOIN vendor_quotations q ON q.id = it.quotation_id` | ordered by quotation date, revision |
| `/quotations/vendor-analysis` (lines 826-880) | `vendor_quotations`, `vendor_quotation_items ⋈ vendor_quotations` grouped by `vendor_code` | submitted, selected, `selectionRate% = selected / submitted × 100`, distinct items, `Σ final_amount`, latest price per item |

### 6.9 Capital / Service PO registers
`CapitalPoService.java:730-770` lists `capital_purchase_orders` with subqueries on `capital_po_lines` (categories, asset summary, line count) and on `capital_po_amendments` (pending). `ServicePoService.java:635-660` lists `service_purchase_orders` with filters. Neither register joins the standard-flow tables.

### 6.10 Backend calculations shared by every standard PO (`PurchaseProcessingService.calculate`, lines 46-286)
For each line:
- `gross = qty × rate`
- `discount = min(gross × disc% + manualDiscount, gross)`
- `taxable = gross − discount`
- `tax% = hsn_tax_master.gst_rate` (default 18)
- `tax = taxable × tax%`, then IGST if the vendor's GSTIN state is not `27`, otherwise CGST = SGST = tax / 2
- `lineTotal = taxable + tax + otherCharges`

For the vendor group (the PO): `vendorTotal = Σ taxable + Σ tax + freight + other + roundOff`. These figures are stored in `purchase_orders.items_gross`, `total_discount`, `taxable_amount`, `total_tax`, `delivery_charges`, `other_charges`, `round_off` and `grand_total`.

---

## 7. Quantity rules that bind the tables together

| Quantity | Definition | Where it is enforced |
|---|---|---|
| Ready for sourcing | `pri.req_qty − pri.ordered_qty − pri.drafted_qty` (PR status Approved / Partially Ordered) | `SourcingService.java:74`, `PoByPrService.java:60-62` |
| In draft | `pri.drafted_qty` = Σ open `po_draft_allocations (reserved − converted − released)` | `PurchaseRequisitionService.reserveDrafted / releaseDrafted` |
| Ordered | `pri.ordered_qty` (all workflows) | `reserveOrdered / releaseOrdered / updateItemOrderedQty` |
| Ordered through PO by PR | Σ `po_pr_allocations (allocated_qty − released_qty)` per `pr_item_id` | `PoByPrService.java:288-292` |
| Remaining | `pri.remaining_qty = max(req − ordered, 0)` (stored) | updated together with `ordered_qty` |
| Received (fulfilment) | Σ `grn_item_allocations.accepted_qty` on POSTED GRNs | `ReceiptAttributionService.java:39-91` (oldest allocation first) |
| PO received | Σ `goods_receipt_note_items.accepted_qty` on POSTED GRNs per `(po_number, item_code)` | `GoodsReceiptNoteService.java:190-194,352-356,524-528` |
| PR status | `Approved` → `Partially Ordered` → `Fully Ordered` from Σ ordered vs Σ requested | `PurchaseRequisitionService.java:671-687` |
| PO status | `APPROVED` (on create) → `PARTIALLY RECEIVED` → `COMPLETED`; `CANCELLED` | `GoodsReceiptNoteService.java:511-550`; `PoByPrService.java:484` |

**Lock order on writes** (deadlock avoidance): vendor advisory lock (draft creation) → `po_drafts` row → `po_draft_allocations` rows → `purchase_requisition_items` rows by `id`; GRN posting and PO cancellation both lock the `purchase_orders` row first (`SourcingService.java:38-40`, `ReceiptAttributionService.java:22`).

---

## 8. Observations found during analysis

These are facts about the current structure. **Nothing was changed.**

1. **PO lines are JSON.** There is no `purchase_order_items` table, so GRN lines, allocations and delivery lots reach a PO line only by `(po_number, item_code)`, with no FK.
2. **`purchase_order_validity_history`**: no Java reads or writes it.
3. **`purchase_order_payment_milestones`**: no code inserts rows. Only the status UPDATE in `recordScheduleReceipt` exists.
4. **`purchase_order_delivery_schedules.po_id`** and **`purchase_order_payment_milestones.po_id`** are BIGINT, are never populated, and could not reference `purchase_orders.id` (VARCHAR).
5. **`purchase_orders.source_quotation_*`**: no current endpoint creates a PO from a quotation. The columns are only loaded and re-saved.
6. **`purchase_order_terms.po_number`** is the PK but has **no FK** to `purchase_orders.po_number`. Integrity relies on both rows being written in the same transaction.
7. **Reports join PR headers on `po_pr_allocations.pr_number = purchase_requisitions.pr_number`** (a copied value) rather than through `pr_item_id → purchase_requisition_items.pr_id`. The results are the same while the copy is consistent.
8. **PR "Generated POs"** uses `purchase_orders.pr_number`, which is NULL for POs built from several PRs. Those POs are found only through `po_pr_allocations`, which the GRN pending list and the reports use.
9. **Item resolution by `sms_new_part_no OR old_code`**: neither column is unique, so two items sharing a code resolve to the lowest `id`.
10. **Quotation links** (`vendor_id`, `pr_id`, `pr_item_id`, `item_id`, `parent_quotation_id`) have no FKs.
11. **Capital PO** checks PR availability itself and does not change `purchase_requisition_items.ordered_qty`. **Service PO** only validates that `pr_number` exists.
12. **`item_master_lookup`** (view) is not used by any purchase code.

---

## 9. Backend source files

| File | Path |
|---|---|
| schema.sql | `backend/src/main/resources/schema.sql` |
| PurchaseRequisitionService | `backend/src/main/java/com/silvermuller/seals/modules/purchase/service/PurchaseRequisitionService.java` |
| PurchaseProcessingService | `backend/src/main/java/com/silvermuller/seals/modules/purchase/service/PurchaseProcessingService.java` |
| GoodsReceiptNoteService | `backend/src/main/java/com/silvermuller/seals/modules/purchase/service/GoodsReceiptNoteService.java` |
| RfqService | `backend/src/main/java/com/silvermuller/seals/modules/purchase/service/RfqService.java` |
| VendorQuotationService | `backend/src/main/java/com/silvermuller/seals/modules/purchase/service/VendorQuotationService.java` |
| DocumentNumbers | `backend/src/main/java/com/silvermuller/seals/modules/purchase/service/DocumentNumbers.java` |
| ProcurementAudit | `backend/src/main/java/com/silvermuller/seals/modules/purchase/service/ProcurementAudit.java` |
| QuantityRules | `backend/src/main/java/com/silvermuller/seals/modules/purchase/service/QuantityRules.java` |
| PoByPrService | `backend/src/main/java/com/silvermuller/seals/modules/purchase/newpo/PoByPrService.java` |
| SourcingService | `backend/src/main/java/com/silvermuller/seals/modules/purchase/newpo/SourcingService.java` |
| DirectPoService | `backend/src/main/java/com/silvermuller/seals/modules/purchase/newpo/DirectPoService.java` |
| VendorRateService | `backend/src/main/java/com/silvermuller/seals/modules/purchase/newpo/VendorRateService.java` |
| ReceiptAttributionService | `backend/src/main/java/com/silvermuller/seals/modules/purchase/newpo/ReceiptAttributionService.java` |
| ProcurementReportService | `backend/src/main/java/com/silvermuller/seals/modules/purchase/newpo/ProcurementReportService.java` |
| ProcurementMigrations | `backend/src/main/java/com/silvermuller/seals/modules/purchase/newpo/ProcurementMigrations.java` |
| DeliveryLots | `backend/src/main/java/com/silvermuller/seals/modules/purchase/newpo/DeliveryLots.java` |
| PoValidity | `backend/src/main/java/com/silvermuller/seals/modules/purchase/model/PoValidity.java` |
| CapitalPoService | `backend/src/main/java/com/silvermuller/seals/modules/purchase/capitalpo/CapitalPoService.java` |
| ServicePoService | `backend/src/main/java/com/silvermuller/seals/modules/purchase/servicepo/ServicePoService.java` |
| HsnTaxMasterController | `backend/src/main/java/com/silvermuller/seals/modules/purchase/controller/HsnTaxMasterController.java` |
| PurchaseOrderTermsService | `backend/src/main/java/com/silvermuller/seals/modules/masters/PurchaseOrderTermsService.java` |
| MasterDataSchema / MasterDataDefinitions | `backend/src/main/java/com/silvermuller/seals/modules/masters/` |
| SupplierMasterController / SupplierItemService | `backend/src/main/java/com/silvermuller/seals/modules/inventory/` |
| Controllers | `.../purchase/controller/*`, `.../purchase/newpo/*Controller.java`, `.../capitalpo/CapitalPoController.java`, `.../servicepo/ServicePoController.java` |
| Frontend screens | `frontend/src/modules/purchase/pages/*.jsx`, `frontend/src/modules/purchase/newpo/*.jsx`; menu in `frontend/src/shared/layout/modulesData.jsx:136-189` |
