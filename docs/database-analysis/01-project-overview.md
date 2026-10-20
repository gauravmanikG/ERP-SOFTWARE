# Silver Muller ERP — Project & Database Architecture Overview

> **Audit Date:** October 2026  
> **Scope:** Read-only discovery & documentation — no code or schema changes made  
> **Source file:** `backend/src/main/resources/schema.sql` (2756 lines, ~180 KB)

---

## 1. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Backend Framework | Spring Boot | 3.3.4 |
| Language | Java | 17 |
| ORM | Spring Data JPA + Hibernate | via starter |
| JDBC | Spring JDBC Template | via starter |
| Database | PostgreSQL | Latest (Render cloud) |
| Test DB | H2 In-memory | Runtime scope |
| Validation | Spring Validation | via starter |
| Frontend | React + Vite | JSX |
| Deployment | Render (Docker) | render.yaml |

### Schema Initialization Strategy
- Single `schema.sql` file auto-run by Spring Boot on every startup (`spring.sql.init.mode=always`)
- All DDL uses `IF NOT EXISTS` — fully idempotent and safe to re-run
- Migrations added as `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` at file end

---

## 2. Two PostgreSQL Schemas

| Schema | Purpose |
|---|---|
| `public` | Primary schema — all transactional tables |
| `sms_inventory` | Legacy shadow schema — mirrors 6 master tables |

The `sms_inventory` schema duplicates: `item_master`, `department_master`, `operation_master`, `category_master`, `process_master`, `procurement_master`. This is a technical debt issue (see `12-issues-and-risks.md`).

---

## 3. Module → Frontend → Backend Mapping

| Module | Frontend Page | Backend Service |
|---|---|---|
| Company Master | CompanyMasterFormPage | CompanyController |
| Inventory Engine | InventoryTransactionPage | InventoryTransactionService |
| Item Master | ItemMasterFormPage | MasterService |
| Supplier Master | SupplierMasterPage | PurchaseRequisitionService |
| Customer Master | CustomerMasterPage | CrmController |
| Machine Master | MachineMasterPage | MachineMasterService |
| Purchase Requisition | PurchaseRequisitionPage | PurchaseRequisitionService |
| RFQ | RequestForQuotationPage | RfqService |
| Vendor Quotation | VendorQuotationsPage | VendorQuotationService |
| PR Clubbing | PrClubbingTab | PrClubbingService |
| Purchase Order | PurchaseOrderPage | PurchaseProcessingService |
| GRN | GoodsReceiptNotePage | GoodsReceiptNoteService |
| Service PO | ServicePurchaseOrderPage | ServicePoService |
| Capital PO | CapitalPurchaseOrderPage | CapitalPoService |
| Job Work | JobWorkPage | JobWorkService / JobWorkReconciliationService |
| Moulding BOM | MouldingBOMTransferPage | MouldingBOMService |
| Notifications | NotificationsPage | StockAlertService |
| Analysis | DepartmentStockPage | AnalysisService |

---

## 4. Total Table Count

| Schema | Tables |
|---|---|
| public | ~62 |
| sms_inventory | 6 |
| Unschema'd core tables | 8 |
| **TOTAL** | **~76** |

---

## 5. Key Sequences

| Sequence | Used By |
|---|---|
| public.service_po_number_seq | Service PO number |
| public.capital_po_number_seq | Capital PO number |
| public.capital_receipt_number_seq | Capital receipts |
| public.asset_code_seq | Fixed asset codes |
| public.job_work_number_seq | JW Orders / Challans / Receipts |

---

*See 02-complete-table-inventory.md for column-by-column catalog.*
