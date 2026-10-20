# Code to Schema Mismatches — Silver Muller ERP

> In-depth analysis of divergences between PostgreSQL `schema.sql`, Spring Boot `@Entity` JPA classes, Spring Data repositories, and React UI forms.

---

## 1. Discrepancy Catalog

### Mismatch 1: Master Table Duality (`master` vs `item_master`)
- **Database DDL:** Contains both legacy table `master` (id, code, description, store_name, opening_balance) AND modern table `public.item_master` (id, item_code, item_name, specifications, hsn_code, min_stock, max_stock).
- **Backend Code:** `InventoryTransactionService` joins against `master`, while `PurchaseProcessingService` and `ItemMasterController` query `item_master`.
- **Frontend Code:** `ItemMasterFormPage.jsx` saves data into `item_master`, but `InventoryTransactionPage.jsx` selects items from `master`.
- **Consequence:** New items created in the UI do not appear in the Inventory Transaction dropdown unless manually synchronized into both tables!

### Mismatch 2: Column Naming Inconsistencies (snake_case vs camelCase)
- **Database DDL:** Standard PostgreSQL `snake_case` (`delivery_date`, `payment_terms`, `approved_by`).
- **Java Entities:** Standard Java `camelCase` (`deliveryDate`, `paymentTerms`).
- **Native SQL Queries:** Several custom queries in repositories write raw SQL strings with missing `@Column(name = "...)` mappings, resulting in runtime `PSQLException: column "deliverydate" does not exist`.

### Mismatch 3: Hardcoded IDs and Enums
- **Database DDL:** Tables `department` and `transaction_type` rely on auto-incrementing BIGSERIAL IDs.
- **Frontend / Service Code:** Multiple frontend files hardcode department names (e.g. `"Stores"`, `"Production"`, `"Moulding"`) or assume ID = 1 is Store. If seed scripts insert rows in a different order, stock postings route to the wrong department.

---

## 2. Table Naming Divergence Matrix

| Database Table (`schema.sql`) | Java Entity Name | JPA Repository | Frontend Component | Issue / Risk |
|---|---|---|---|---|
| `companies` | `Company` | `CompanyRepository` | `CompanyMasterFormPage` | Aligned |
| `master` | `MasterItem` | `MasterRepository` | `InventoryTransactionPage` | Legacy entity |
| `public.item_master` | `ItemMaster` | `ItemMasterRepository` | `ItemMasterFormPage` | Modern catalog entity |
| `fg_bom` | `FgBom` | `FgBomRepository` | `MouldingBOMTransferPage` | Aligned |
| `purchase_orders` | `PurchaseOrder` | `PurchaseOrderRepository` | `PurchaseOrderPage` | Aligned |
| `job_work_stock_ledger` | `JobWorkStockLedger`| `JobWorkLedgerRepository` | `JobWorkPage (Ledger)` | Aligned |
