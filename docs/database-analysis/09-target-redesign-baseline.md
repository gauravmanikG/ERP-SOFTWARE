# Target Database Redesign Baseline — Silver Muller ERP

> Strategic architectural baseline and preliminary recommendations for each existing table. Prepares the foundation for future schema normalization, multi-tenant isolation, and Flyway migration.

---

## 1. Table Treatment Classification

Each discovered table is classified into one of seven strategic architectural categories:

| Treatment Category | Count | Strategic Rationale |
|---|---|---|
| **Keep As-Is** | 35 | Mature, normalized tables with proper PKs, FKs, and active service integrations. |
| **Keep but Improve** | 28 | Retain core table structure, but add missing foreign keys, check constraints, audit columns (`created_by`, `updated_by`), and index optimizations. |
| **Merge Tables** | 8 | Eliminate redundant pairs (e.g. unify `master` into `item_master`, consolidate PR clubbing batch items). |
| **Split Tables** | 2 | Split monolithic tables with excessive nullable columns into header/detail structures. |
| **Deprecate / Drop** | 8 | Remove legacy shadow schema `sms_inventory.*` and obsolete temporary staging tables. |
| **Total** | **81** | |

---

## 2. Detailed Table-by-Table Treatment

### Core Inventory & Master Data
- `companies`: **Keep but Improve**. Add foreign key relationships from all transactional header tables to support multi-tenancy.
- `master`: **Merge**. Migrate all active rows into `public.item_master` and deprecate table `master`.
- `public.item_master`: **Keep but Improve**. Add FK to `category_master(id)`, `department_master(id)`, and `hsn_tax_master(id)`.
- `department`: **Merge**. Merge into `public.department_master`.
- `transaction_type`: **Keep but Improve**. Enforce unique constraint and convert to standard database ENUM or immutable reference table.
- `inventory_transaction`: **Keep but Improve**. Add non-negative stock balance validation and foreign key to unified `item_master`.

### Procurement & Purchasing
- `purchase_requisitions` & `items`: **Keep but Improve**. Add foreign keys to `item_master` and `department_master`.
- `pr_clubbing_*`: **Keep As-Is**. Well structured batch allocation design.
- `rfq_headers` & `items`: **Keep As-Is**. Solid relational design.
- `vendor_quotations` & `items`: **Keep As-Is**.
- `purchase_orders`: **Keep but Improve**. Standardize status enum values and link directly to multi-tenant `companies.company_code`.
- `goods_receipt_notes` & `items`: **Keep but Improve**. Replace string `item_code` with strict FK `item_id`.

### Job Work Subcontracting
- `job_workers`, `job_work_orders`, `job_work_challans`, `job_work_receipts`: **Keep As-Is**. Very robust, comprehensive subcontracting lifecycle model.
- `job_work_stock_ledger`: **Keep but Improve**. Ensure indexed compound key `(worker_id, item_code, created_at)` for fast reconciliation.
- `job_work_history` & `attachments`: **Keep but Improve**. Retain polymorphic model with added validation constraints.

### Legacy Shadow Schema
- `sms_inventory.item_master`: **Deprecate / Drop**.
- `sms_inventory.department_master`: **Deprecate / Drop**.
- `sms_inventory.operation_master`: **Deprecate / Drop**.
- `sms_inventory.category_master`: **Deprecate / Drop**.
- `sms_inventory.procurement_master`: **Deprecate / Drop**.
- `sms_inventory.process_master`: **Deprecate / Drop**.
