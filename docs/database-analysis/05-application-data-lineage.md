# Application Data Lineage & Traceability Map — Silver Muller ERP

> Complete end-to-end traceability showing how UI actions flow through frontend API clients, backend controllers, application services, JPA repositories/native JDBC, and down to PostgreSQL database tables.

---

## 1. End-to-End Data Lineage Matrix

| ERP Functional Module | Frontend Screen / Component | HTTP & API Route | Spring Controller | Spring Service | JPA Repository / JDBC Query | Database Tables Touched | Operation |
|---|---|---|---|---|---|---|---|
| **Company Profile** | `CompanyMasterFormPage.jsx` | `GET /api/companies`<br>`POST /api/companies` | `CompanyController` | `CompanyService` | `CompanyRepository` | `companies` | SELECT, INSERT, UPDATE |
| **Material Master** | `ItemMasterFormPage.jsx` | `GET /api/items`<br>`POST /api/items` | `MasterController` | `MasterService` | `ItemMasterRepository` | `item_master`, `master` | SELECT, INSERT, UPDATE |
| **Core Stock Movement** | `InventoryTransactionPage.jsx`| `POST /api/inventory/transactions` | `InventoryTransactionController` | `InventoryTransactionService` | `InventoryTransactionRepository` (Native SQL + JPA) | `inventory_transaction`, `master`, `department`, `transaction_type` | INSERT, UPDATE |
| **Department Stock Report**| `DepartmentStockPage.jsx` | `GET /api/inventory/department-stock`| `AnalysisController` | `AnalysisService` | Direct JDBC `SUM(quantity)` aggregation | `inventory_transaction`, `master`, `department` | SELECT |
| **Supplier Directory** | `SupplierMasterPage.jsx` | `GET /api/suppliers`<br>`POST /api/suppliers` | `SupplierController` | `PurchaseRequisitionService` | `SupplierRepository` | `supplier_master` | SELECT, INSERT, UPDATE |
| **Purchase Requisition** | `PurchaseRequisitionPage.jsx` | `POST /api/purchase-requisitions` | `PurchaseRequisitionController` | `PurchaseRequisitionService` | `PurchaseRequisitionRepository` | `purchase_requisitions`, `purchase_requisition_items` | INSERT, UPDATE |
| **PR Bulk Clubbing** | `PrClubbingTab.jsx` | `POST /api/pr-clubbing/batch` | `PrClubbingController` | `PrClubbingService` | `PrClubbingBatchRepository` | `pr_clubbing_batches`, `pr_clubbing_batch_items`, `pr_clubbing_allocations` | INSERT, UPDATE |
| **RFQ Generation** | `RequestForQuotationPage.jsx`| `POST /api/rfq` | `RfqController` | `RfqService` | `RfqHeaderRepository` | `rfq_headers`, `rfq_items` | INSERT, UPDATE |
| **Vendor Quotations** | `VendorQuotationsPage.jsx` | `POST /api/quotations` | `VendorQuotationController` | `VendorQuotationService` | `VendorQuotationRepository` | `vendor_quotations`, `vendor_quotation_items`, `vendor_quotation_history` | INSERT, UPDATE |
| **Purchase Order Processing**| `PurchaseOrderPage.jsx` | `POST /api/purchase-orders` | `PurchaseProcessingController`| `PurchaseProcessingService` | `PurchaseOrderRepository` | `purchase_orders`, `purchase_order_delivery_schedules`, `purchase_order_payment_milestones`, `po_revisions` | INSERT, UPDATE |
| **Goods Receipt Note (GRN)**| `GoodsReceiptNotePage.jsx` | `POST /api/grn` | `GoodsReceiptNoteController` | `GoodsReceiptNoteService` | `GoodsReceiptNoteRepository` | `goods_receipt_notes`, `goods_receipt_note_items`, `inventory_transaction` | INSERT, UPDATE |
| **Service PO Execution** | `ServicePurchaseOrderPage.jsx`| `POST /api/service-po` | `ServicePoController` | `ServicePoService` | `ServicePoRepository` | `service_purchase_orders`, `service_po_schedules`, `service_po_acceptances` | INSERT, UPDATE |
| **Capital PO Execution** | `CapitalPurchaseOrderPage.jsx`| `POST /api/capital-po` | `CapitalPoController` | `CapitalPoService` | `CapitalPoRepository` | `capital_purchase_orders`, `capital_po_lines`, `asset_master` | INSERT, UPDATE |
| **Job Work Subcontracting** | `JobWorkPage.jsx` | `POST /api/job-work/orders`<br>`POST /api/job-work/challans` | `JobWorkController` | `JobWorkService`, `JobWorkReconciliationService` | `JobWorkOrderRepository`, `JobWorkLedgerRepository` | `job_work_orders`, `job_work_challans`, `job_work_receipts`, `job_work_stock_ledger`, `inventory_transaction` | INSERT, UPDATE |
| **BOM Consumption** | `MouldingBOMTransferPage.jsx`| `POST /api/bom/transfer` | `MouldingBOMController` | `MouldingBOMService` | `MouldingBOMRepository` | `fg_bom`, `moulding_bom_mapping`, `inventory_transaction` | INSERT, SELECT |

---

## 2. Dynamic SQL and Non-JPA Data Access

While the application primarily uses Spring Data JPA repositories, several performance-critical queries use native Spring `JdbcTemplate` or native SQL queries:
1. **Department Stock Aggregation:** Native SQL query in `InventoryTransactionService` executing:
   ```sql
   SELECT it.master_id, m.code, m.description, 
          SUM(CASE WHEN it.to_department_id = :deptId THEN it.quantity ELSE -it.quantity END) as balance
   FROM inventory_transaction it
   JOIN master m ON m.id = it.master_id
   WHERE it.from_department_id = :deptId OR it.to_department_id = :deptId
   GROUP BY it.master_id, m.code, m.description
   HAVING SUM(CASE WHEN it.to_department_id = :deptId THEN it.quantity ELSE -it.quantity END) > 0;
   ```
2. **Job Work Running Balance:** `JobWorkReconciliationService` computes worker on-hand balance using window functions over `job_work_stock_ledger` to detect unaccounted material loss.
