# Business Workflows & Data Flow — Silver Muller ERP

> Detailed functional execution paths, transaction boundaries, state lifecycles, and balance calculation algorithms.

---

## Workflow 1: Standard Procurement Lifecycle (PR → Clubbing → RFQ → PO → GRN)

### Sequence & Data Flow Diagram
```mermaid
sequenceDiagram
    autonumber
    actor Plant as Plant Supervisor
    actor Purchase as Purchase Executive
    participant PR as Purchase Requisition
    participant Club as PR Clubbing Engine
    participant RFQ as RFQ & Quotes
    participant PO as Purchase Order Engine
    participant Gate as Gate Receipt (GRN)
    participant QC as Quality Control
    participant Inv as Inventory Transaction Ledger

    Plant->>PR: Submit PR (Status: SUBMITTED)
    Note over PR: Writes purchase_requisitions & items
    Purchase->>Club: Select eligible PR items across departments
    Club->>Club: Create batch in pr_clubbing_batches & items
    Purchase->>RFQ: Send RFQ to shortlisted vendors
    RFQ->>RFQ: Receive bids in vendor_quotations & items
    Purchase->>PO: Award quotation & create PO (Status: APPROVED)
    Note over PO: Writes purchase_orders, delivery schedules, milestones
    Gate->>Gate: Supplier truck arrives -> Create GRN Draft
    Note over Gate: Writes goods_receipt_notes & items
    QC->>Gate: Perform visual & dimensional inspection
    Note over QC: Updates accepted_quantity, rejected_quantity
    Gate->>Inv: On GRN Authorization -> Trigger Stock Inward
    Note over Inv: Inserts inventory_transaction (Type: Material Receipt)
```

### Transactional Mechanics & Calculations
- **Balance Calculation:** Stock is NOT incremented when a PO is issued. Stock is incremented only upon GRN QC acceptance.
- **Atomic Boundary:** The GRN approval creates the row in `goods_receipt_notes` and inserts the corresponding inward transaction in `inventory_transaction` within a single Spring `@Transactional` boundary.
- **Traceability Link:** `goods_receipt_note_items.inventory_transaction_id` records the foreign key back to the stock ledger.

---

## Workflow 2: Job Work (Subcontracting) Processing & Reconciliation

### Sequence & Data Flow Diagram
```mermaid
sequenceDiagram
    autonumber
    actor Store as Store Manager
    actor Worker as Subcontractor (Job Worker)
    participant JWO as Job Work Order
    participant Challan as Delivery Challan
    participant Inv as Inventory Ledger
    participant Gate as Gate Receipt
    participant Ledger as Worker Stock Ledger
    participant Adj as Reconciliation & Loss Policy

    Store->>JWO: Generate Job Work Order (Status: APPROVED)
    Note over JWO: Defines input components & expected finished part
    Store->>Challan: Issue Outward Delivery Challan
    Challan->>Inv: Append Outward inventory_transaction (Send to JW)
    Challan->>Ledger: Append Stock Ledger (DEBIT worker: +Qty on hand)
    Store->>Worker: Dispatch physical goods with Form 45/Challan
    Worker-->>Gate: Return processed parts & scrap
    Gate->>Gate: Inward Receipt + QC Inspection
    Gate->>Inv: Append Inward inventory_transaction (SFG/FG Inward)
    Gate->>Ledger: Append Stock Ledger (CREDIT worker: -Consumed Qty)
    Store->>Adj: Compare variance with job_work_loss_policy
    Adj->>Ledger: Authorized write-off of scrap/burn loss in job_work_adjustments
```

### Status Lifecycle & State Machine
1. **Job Work Order:** `DRAFT` → `PENDING_APPROVAL` → `APPROVED` → `IN_PROGRESS` → `PARTIALLY_RECEIVED` → `COMPLETED` → `CLOSED` / `CANCELLED`.
2. **Delivery Challan:** `DRAFT` → `ISSUED` → `DISPATCHED` → `CLOSED`.
3. **Receipt & Inspection:** `RECEIVED` → `UNDER_INSPECTION` → `ACCEPTED` / `REJECTED` → `POSTED_TO_STOCK`.

---

## Workflow 3: Moulding BOM Consumption & Finished Goods Recovery

1. **Trigger:** Production run completes for a compound or moulded rubber seal.
2. **Formula Retrieval:** The engine queries `fg_bom` to find active component ratios and `moulding_bom_mapping` for tooling.
3. **Atomic Multi-Transaction:**
   - Raw compound is deducted from `Moulding` department via negative row in `inventory_transaction`.
   - Finished moulded seal is credited to `FG STORE` via positive row in `inventory_transaction`.
   - Process scrap/flash is logged to `Rejection Store` for recycling/burning.
