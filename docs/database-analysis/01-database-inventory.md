# Database Inventory & Schema Object Index — Silver Muller ERP

> **Source:** `backend/src/main/resources/schema.sql` (2,756 lines)  
> **Machine-Readable Export:** [`exports/schema_inventory.json`](./exports/schema_inventory.json)  
> **Detailed Column Catalog:** [`02-complete-table-inventory.md`](./02-complete-table-inventory.md)

---

## 1. Schema Overview

The database uses PostgreSQL with 2 distinct schemas:

| Schema Name | Total Tables | Primary Purpose | Status |
|---|---|---|---|
| `public` | 75 | Core transaction ledger, master records, procurement, job work, capital & service POs | **Active Production** |
| `sms_inventory` | 6 | Mirror copy of 6 master tables (`item_master`, `department_master`, `operation_master`, `category_master`, `process_master`, `procurement_master`) | **Legacy / Technical Debt** |

---

## 2. Table Count by Business Module

| Module Classification | Total Tables | Key Entities |
|---|---|---|
| **Core Inventory Engine** | 4 | `master`, `inventory_transaction`, `department`, `transaction_type` |
| **Master Data Management** | 12 | `companies`, `public.item_master`, `public.department_master`, `public.operation_master`, `public.category_master`, `supplier_master`, `customer_master`, `machine_master`, `hsn_tax_master`, `procurement_master`, `process_master`, `moulding_bom_mapping` |
| **BOM & Production** | 2 | `fg_bom`, `moulding_bom_mapping` |
| **Notifications & System Alerts** | 2 | `stock_alert_rule`, `stock_alert` |
| **Procurement: PR & RFQ** | 7 | `purchase_requisitions`, `purchase_requisition_items`, `pr_clubbing_batches`, `pr_clubbing_batch_items`, `pr_clubbing_allocations`, `rfq_headers`, `rfq_items` |
| **Procurement: Quotations & POs** | 11 | `vendor_quotations`, `vendor_quotation_items`, `vendor_quotation_history`, `vendor_quotation_comments`, `purchase_proposals`, `purchase_orders`, `purchase_order_delivery_schedules`, `purchase_order_payment_milestones`, `po_revisions`, `purchase_order_validity_history` |
| **Procurement: GRN & Quality** | 2 | `goods_receipt_notes`, `goods_receipt_note_items` |
| **Service Purchase Orders** | 9 | `service_purchase_orders`, `service_po_categories`, `service_po_schedules`, `service_po_acceptances`, `service_po_invoices`, `service_po_status_history`, `service_po_validity_history`, `service_po_revisions`, `service_po_attachments` |
| **Capital Purchase Orders & Assets** | 11 | `capital_purchase_orders`, `capital_po_lines`, `capital_po_asset_categories`, `capital_po_schedules`, `capital_po_receipts`, `capital_po_receipt_lines`, `asset_master`, `capital_po_history`, `capital_po_validity_history`, `capital_po_amendments`, `capital_po_attachments` |
| **Job Work & Subcontracting** | 17 | `job_workers`, `job_work_operations`, `job_worker_operations`, `job_work_rate_contracts`, `job_work_indents`, `job_work_indent_lines`, `job_work_orders`, `job_work_order_lines`, `job_work_challans`, `job_work_challan_lines`, `job_work_receipts`, `job_work_receipt_lines`, `job_work_stock_ledger`, `job_work_history`, `job_work_attachments`, `job_work_loss_policy`, `job_work_adjustments` |
| **Legacy Shadow Schema** | 6 | `sms_inventory.*` duplicate master tables |
| **TOTAL** | **81** | |

---

## 3. Database Sequences

| Sequence Name | Purpose | Current Strategy |
|---|---|---|
| `public.service_po_number_seq` | Auto-incrementing human readable Service PO numbers | Used by `ServicePoService` |
| `public.capital_po_number_seq` | Auto-incrementing Capital PO numbers | Used by `CapitalPoService` |
| `public.capital_receipt_number_seq` | Capital goods inward receipt number | Used by `CapitalPoService` |
| `public.asset_code_seq` | Fixed Asset tag generation (`AST-...`) | Used by `AssetMaster` |
| `public.job_work_number_seq` | Unified sequence for JW indents, orders, challans, and receipts | Used by `JobWorkService` |

---

## 4. Key Constraints & Indexes Summary

- **Primary Keys:** 81/81 tables have an explicit single or composite primary key defined.
- **Enforced Foreign Keys:** 52 explicit foreign key constraints defined in DDL.
- **Unique Constraints:** Applied to natural business numbers (`po_number`, `order_number`, `challan_number`, `receipt_number`, `company_code`, `master.code`).
- **GIN Indexes:** Present on `companies(company_name, company_code)` for multi-tenant text searching.
- **B-Tree Indexes:** Defined on critical lookup foreign keys (`idx_inv_tx_master_id`, `idx_jw_ledger_worker`, `idx_jw_orders_status`, etc.).
