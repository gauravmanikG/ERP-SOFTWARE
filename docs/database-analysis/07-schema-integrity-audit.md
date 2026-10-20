# Database Schema Integrity & Risk Audit — Silver Muller ERP

> Rigorous architectural audit identifying missing foreign keys, duplicate schemas, typing inconsistencies, concurrency hazards, and normalization flaws.

---

## 1. Risk Matrix & Severity Summary

| Finding ID | Severity | Category | Affected Tables / Objects | Impact |
|---|---|---|---|---|
| **RISK-01** | **CRITICAL** | Duplicate Schema / Shadow Tables | `sms_inventory.*` vs `public.*` | 6 master tables are completely duplicated across two schemas, causing data divergence and confusion. |
| **RISK-02** | **CRITICAL** | Duplicate Table Definitions in DDL | `stock_alert_rule`, `stock_alert` | Defined twice in `schema.sql` with conflicting column structures. |
| **RISK-03** | **HIGH** | Missing Foreign Key Enforcements | `fg_bom`, `pr_clubbing_batch_items`, `goods_receipt_note_items` | Foreign references stored as loose string codes (`item_code`) without database foreign key integrity. |
| **RISK-04** | **HIGH** | Inconsistent Primary Key Data Types | `companies` (UUID) vs All other tables (BIGSERIAL/BIGINT) | Joining companies with transactional tables requires UUID-to-BIGINT casting or loose string joins. |
| **RISK-05** | **HIGH** | Monolithic Schema Execution | `schema.sql` (2,756 lines) via `mode=always` | Production startups execute massive DDL script; risks race conditions and table locking on Render cloud. |
| **RISK-06** | **MEDIUM** | Polymorphic Untyped Relationships | `job_work_history`, `job_work_attachments` | Storing `entity_type` and `entity_id` prevents relational integrity and cascading deletes. |
| **RISK-07** | **MEDIUM** | Unchecked Negative Stock Balances | `inventory_transaction` | `quantity` is numeric without department-level balance CHECK constraints, allowing negative inventory. |
| **RISK-08** | **LOW** | Missing Soft-Delete Consistency | Various transactional tables | Mix of `status = 'CANCELLED'`, hard DELETEs, and active boolean flags. |

---

## 2. Detailed Findings

### RISK-01: Dual PostgreSQL Schemas (`public` vs `sms_inventory`)
- **Evidence:** Lines 220–350 and lines 1100–1250 of `schema.sql` define identical tables under `sms_inventory` (`item_master`, `department_master`, `operation_master`, `category_master`, `procurement_master`, `process_master`).
- **Root Cause:** A historical attempt to isolate inventory master tables into a dedicated schema was abandoned, but the DDL was never cleaned up.
- **Remediation:** Verify zero runtime queries target `sms_inventory`, archive existing data, and safely drop schema `sms_inventory` in Target Redesign.

### RISK-02: Duplicate Table Definitions in `schema.sql`
- **Evidence:** `CREATE TABLE IF NOT EXISTS stock_alert_rule` and `stock_alert` are defined at line 370 and duplicated at line 410 with subtle column naming differences.
- **Root Cause:** Copy-paste merge artifact in `schema.sql`.
- **Remediation:** Consolidate into a single canonical definition.

### RISK-03: Soft Foreign Keys (String Code References)
- **Evidence:** In `goods_receipt_note_items`, items are linked via `item_code VARCHAR(100)` rather than `item_id BIGINT REFERENCES item_master(id)`.
- **Impact:** If an item code is edited in master settings, historical GRN rows become orphaned or point to invalid references.
