# Target Redesign & Migration Checklist — Silver Muller ERP

> Actionable prerequisites, governance checklist, and Flyway migration roadmap for transitioning from monolithic `schema.sql` to enterprise-grade automated database migrations.

---

## 1. Migration Prerequisites Checklist

- [ ] **Step 1: Baseline Production Snapshot**
  - Execute a full PostgreSQL dump of the Render cloud database before any DDL changes (`pg_dump -Fc`).
- [ ] **Step 2: Establish Master Item Single Source of Truth**
  - Finalize business decision to unify `master` and `public.item_master`.
  - Write a one-time data reconciliation script to ensure all item codes in `inventory_transaction` exist in `item_master`.
- [ ] **Step 3: Drop Legacy Schema `sms_inventory`**
  - Verify zero backend JPA entities or raw SQL references point to `sms_inventory`.
  - Execute `DROP SCHEMA sms_inventory CASCADE;` in the target migration script.
- [ ] **Step 4: Adopt Flyway Migration Tooling**
  - Add `flyway-core` and `flyway-database-postgresql` dependencies to backend `pom.xml`.
  - Configure `spring.flyway.enabled=true` and set `spring.sql.init.mode=never`.
  - Package initial clean schema as `V1__initial_schema.sql`.
- [ ] **Step 5: Enforce Strict Foreign Key Constraints**
  - Convert natural string keys (`item_code`, `department`, `vendor_code`) to strict BIGINT relational foreign keys.
  - Implement `ON DELETE RESTRICT` on master records to prevent accidental deletion of referenced parts.
- [ ] **Step 6: Standardize Multi-Tenancy Keying**
  - Ensure every primary transactional table contains `company_id UUID REFERENCES companies(id)`.

---

## 2. Risk Mitigation & Rollback Plan

1. **Dual-Run Migration Testing:** Run Flyway migrations on a temporary staging PostgreSQL instance populated with sanitized production data before touching production.
2. **Backward Compatibility:** Maintain view aliases (`CREATE OR REPLACE VIEW master AS SELECT ... FROM item_master`) during phase 1 to avoid breaking legacy queries while refactoring services.
