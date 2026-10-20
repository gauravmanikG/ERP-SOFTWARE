# Module-Specific Entity Relationship Diagrams — Silver Muller ERP

---

## 1. Core Inventory Ledger ERD

The core inventory engine is an append-only transaction ledger that calculates real-time stock balances across warehouse departments without storing fragile mutable summary totals.

```mermaid
erDiagram
    DEPARTMENT ||--o{ INVENTORY_TRANSACTION : "from_department_id / to_department_id"
    TRANSACTION_TYPE ||--o{ INVENTORY_TRANSACTION : "transaction_type_id"
    MASTER ||--o{ INVENTORY_TRANSACTION : "master_id"
    
    DEPARTMENT {
        BIGSERIAL id PK
        VARCHAR_255 name UK
    }

    TRANSACTION_TYPE {
        BIGSERIAL id PK
        VARCHAR_50 type UK
    }

    MASTER {
        BIGSERIAL id PK
        VARCHAR_100 code UK
        VARCHAR_255 description
        VARCHAR_100 category
        VARCHAR_50 unit_of_measurement
        NUMERIC opening_balance
        VARCHAR_100 store_name
    }

    INVENTORY_TRANSACTION {
        BIGSERIAL id PK
        VARCHAR_50 transaction_number
        VARCHAR_100 slip_number
        BIGINT transaction_type_id FK
        BIGINT master_id FK
        BIGINT from_department_id FK
        BIGINT to_department_id FK
        NUMERIC quantity
        TIMESTAMP transaction_date
        TEXT remarks
    }
```

---

## 2. Procurement & Purchasing ERD

Tracks the requisition lifecycle from internal PR to PR clubbing consolidation, RFQs, multi-vendor quotations, rate comparison, purchase order release, and goods receipt (GRN).

```mermaid
erDiagram
    PURCHASE_REQUISITIONS ||--o{ PURCHASE_REQUISITION_ITEMS : "pr_id"
    PR_CLUBBING_BATCHES ||--o{ PR_CLUBBING_BATCH_ITEMS : "batch_id"
    PR_CLUBBING_BATCH_ITEMS ||--o{ PR_CLUBBING_ALLOCATIONS : "batch_item_id"
    RFQ_HEADERS ||--o{ RFQ_ITEMS : "rfq_id"
    RFQ_HEADERS ||--o{ VENDOR_QUOTATIONS : "rfq_id"
    VENDOR_QUOTATIONS ||--o{ VENDOR_QUOTATION_ITEMS : "quotation_id"
    SUPPLIER_MASTER ||--o{ VENDOR_QUOTATIONS : "vendor_id"
    SUPPLIER_MASTER ||--o{ PURCHASE_ORDERS : "supplier_id"
    PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_DELIVERY_SCHEDULES : "po_id"
    PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_PAYMENT_MILESTONES : "po_id"
    PURCHASE_ORDERS ||--o{ GOODS_RECEIPT_NOTES : "po_id"
    GOODS_RECEIPT_NOTES ||--o{ GOODS_RECEIPT_NOTE_ITEMS : "grn_id"

    PURCHASE_REQUISITIONS {
        BIGSERIAL id PK
        VARCHAR_50 pr_number UK
        VARCHAR_50 status
        VARCHAR_100 department
        VARCHAR_100 requested_by
        TIMESTAMP created_at
    }

    PURCHASE_REQUISITION_ITEMS {
        BIGSERIAL id PK
        BIGINT pr_id FK
        VARCHAR_100 item_code
        NUMERIC quantity
        VARCHAR_50 uom
        NUMERIC approved_quantity
        VARCHAR_50 status
    }

    PURCHASE_ORDERS {
        BIGSERIAL id PK
        VARCHAR_50 po_number UK
        BIGINT supplier_id FK
        VARCHAR_50 po_type
        VARCHAR_50 status
        NUMERIC grand_total
        VARCHAR_100 approval_status
        DATE po_date
    }

    GOODS_RECEIPT_NOTES {
        BIGSERIAL id PK
        VARCHAR_50 grn_number UK
        BIGINT po_id FK
        VARCHAR_50 challan_number
        VARCHAR_50 invoice_number
        VARCHAR_50 status
        DATE grn_date
    }

    GOODS_RECEIPT_NOTE_ITEMS {
        BIGSERIAL id PK
        BIGINT grn_id FK
        VARCHAR_100 item_code
        NUMERIC received_quantity
        NUMERIC accepted_quantity
        NUMERIC rejected_quantity
        VARCHAR_50 qc_status
    }
```

---

## 3. Job Work (Subcontracting) ERD

Tracks external manufacturing processing, dispatch challans, material accountability, worker stock ledgers, return receipts, quality grading, and scrap/loss adjustments.

```mermaid
erDiagram
    JOB_WORKERS ||--o{ JOB_WORKER_OPERATIONS : "job_worker_id"
    JOB_WORK_OPERATIONS ||--o{ JOB_WORKER_OPERATIONS : "operation_id"
    JOB_WORKERS ||--o{ JOB_WORK_RATE_CONTRACTS : "worker_id"
    JOB_WORK_INDENTS ||--o{ JOB_WORK_INDENT_LINES : "indent_id"
    JOB_WORKERS ||--o{ JOB_WORK_ORDERS : "worker_id"
    JOB_WORK_ORDERS ||--o{ JOB_WORK_ORDER_LINES : "order_id"
    JOB_WORK_ORDERS ||--o{ JOB_WORK_CHALLANS : "order_id"
    JOB_WORK_ORDERS ||--o{ JOB_WORK_RECEIPTS : "order_id"
    JOB_WORK_CHALLANS ||--o{ JOB_WORK_CHALLAN_LINES : "challan_id"
    JOB_WORK_RECEIPTS ||--o{ JOB_WORK_RECEIPT_LINES : "receipt_id"
    JOB_WORKERS ||--o{ JOB_WORK_STOCK_LEDGER : "worker_id"
    JOB_WORK_ORDERS ||--o{ JOB_WORK_ADJUSTMENTS : "order_id"
    JOB_WORK_CHALLANS ||--o{ INVENTORY_TRANSACTION : "inventory_transaction_id"
    JOB_WORK_RECEIPTS ||--o{ INVENTORY_TRANSACTION : "inventory_transaction_id"

    JOB_WORKERS {
        BIGSERIAL id PK
        VARCHAR_50 worker_code UK
        VARCHAR_255 worker_name
        VARCHAR_20 gstin
        VARCHAR_20 pan_no
        VARCHAR_20 status
    }

    JOB_WORK_ORDERS {
        BIGSERIAL id PK
        VARCHAR_50 order_number UK
        BIGINT worker_id FK
        VARCHAR_50 status
        DATE issue_date
        DATE expected_delivery_date
    }

    JOB_WORK_CHALLANS {
        BIGSERIAL id PK
        VARCHAR_50 challan_number UK
        BIGINT order_id FK
        BIGINT worker_id FK
        VARCHAR_50 status
        BIGINT inventory_transaction_id FK
    }

    JOB_WORK_RECEIPTS {
        BIGSERIAL id PK
        VARCHAR_50 receipt_number UK
        BIGINT order_id FK
        BIGINT worker_id FK
        VARCHAR_50 status
        BIGINT inventory_transaction_id FK
    }

    JOB_WORK_STOCK_LEDGER {
        BIGSERIAL id PK
        BIGINT worker_id FK
        VARCHAR_100 item_code
        BIGINT order_id FK
        VARCHAR_50 entry_type
        NUMERIC quantity
        NUMERIC balance_after
    }
```

---

## 4. Capital Purchase Orders & Fixed Assets ERD

Tracks high-value capital asset procurement, milestone schedules, inspection, capitalization into `asset_master`, and depreciation schedules.

```mermaid
erDiagram
    CAPITAL_PURCHASE_ORDERS ||--o{ CAPITAL_PO_LINES : "capital_po_id"
    CAPITAL_PURCHASE_ORDERS ||--o{ CAPITAL_PO_SCHEDULES : "capital_po_id"
    CAPITAL_PURCHASE_ORDERS ||--o{ CAPITAL_PO_RECEIPTS : "capital_po_id"
    CAPITAL_PURCHASE_ORDERS ||--o{ CAPITAL_PO_AMENDMENTS : "capital_po_id"
    CAPITAL_PO_RECEIPTS ||--o{ CAPITAL_PO_RECEIPT_LINES : "receipt_id"
    CAPITAL_PO_LINES ||--o{ ASSET_MASTER : "capital_po_line_id"

    CAPITAL_PURCHASE_ORDERS {
        BIGSERIAL id PK
        VARCHAR_50 po_number UK
        BIGINT supplier_id FK
        NUMERIC total_amount
        VARCHAR_50 status
    }

    CAPITAL_PO_LINES {
        BIGSERIAL id PK
        BIGINT capital_po_id FK
        VARCHAR_255 asset_description
        NUMERIC quantity
        NUMERIC unit_price
        NUMERIC total_price
    }

    ASSET_MASTER {
        BIGSERIAL id PK
        VARCHAR_50 asset_code UK
        VARCHAR_255 asset_name
        BIGINT capital_po_line_id FK
        DATE capitalization_date
        NUMERIC original_cost
        VARCHAR_50 status
    }
```
