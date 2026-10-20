# Silver Muller ERP — Database Architecture Audit & Blueprint

> **Status:** Completed Read-Only Audit & Master Documentation  
> **Target System:** Silver Muller ERP (Spring Boot 3.3.4 + React + PostgreSQL)  
> **Source Evidence:** `backend/src/main/resources/schema.sql` (2,756 lines), Spring Boot JPA Entities, Repositories, Controllers, Services, and React JSX frontend modules.  
> **Audit Date:** October 2026  
> **Execution Mode:** Strictly Read-Only (Zero data modification, Zero DDL mutation)

---

## 1. Executive Summary

Silver Muller ERP is an enterprise manufacturing ERP designed for precision seal and rubber manufacturing operations. The backend is built with **Spring Boot 3.3.4 (Java 17)** utilizing **Spring Data JPA / Hibernate** alongside direct Spring JDBC queries. The database is hosted on **PostgreSQL (Render cloud)**. The frontend is built on **React 18 + Vite** with modular feature architecture.

This comprehensive audit was commissioned to establish an evidence-based blueprint of the existing database schema, cross-reference all tables with application code, evaluate data integrity risks, and provide a concrete foundation for the future target database redesign and Flyway migration.

### Key Discoveries & High-Level Metrics
- **Total Tables Discovered:** **81 unique tables** (83 `CREATE TABLE` declarations in `schema.sql` due to duplicate blocks).
- **Active PostgreSQL Schemas:** 2 schemas:
  - `public`: Primary production schema containing 75 tables covering multi-tenant companies, core inventory ledger, procurement, RFQ, purchase orders, GRN, Service POs, Capital POs, Fixed Assets, and Job Work.
  - `sms_inventory`: Shadow / duplicate schema containing 6 tables mirroring master entities (`item_master`, `department_master`, `operation_master`, `category_master`, `process_master`, `procurement_master`).
- **Sequences:** 5 dedicated sequences (`service_po_number_seq`, `capital_po_number_seq`, `capital_receipt_number_seq`, `asset_code_seq`, `job_work_number_seq`).
- **Core Ledger Architecture:** The ERP utilizes an append-only transaction ledger (`inventory_transaction`) driven by master lookup codes and department IDs.
- **Critical Risk Highlights:**
  - Presence of dual schemas (`public` vs `sms_inventory`) causing entity divergence.
  - Inconsistent identifier strategies (Mix of `UUID`, `BIGSERIAL`, and natural text codes).
  - Soft foreign keys stored as natural text (e.g. storing item code strings instead of foreign keys to `master(id)` or `item_master(id)`).
  - Schema initialization relies on `spring.sql.init.mode=always` executing a monolithic 2,756-line `schema.sql` with no automated migration tool (Flyway/Liquibase).

---

## 2. Document Index & Navigation

| Document | Purpose |
|---|---|
| [01-database-inventory.md](./01-database-inventory.md) | High-level database schema catalog and object index |
| [02-complete-table-inventory.md](./02-complete-table-inventory.md) | Column-by-column breakdown of all 81 tables with types, constraints, and keys |
| [02-complete-erd.md](./02-complete-erd.md) | Master Entity Relationship Diagram (Mermaid) with full cardinality and FK status |
| [03-module-erds.md](./03-module-erds.md) | Isolated Mermaid ERDs per business module (Core, Purchasing, Job Work, Assets) |
| [04-module-table-mapping.md](./04-module-table-mapping.md) | Functional mapping of every table to business module, entity, repository, and screen |
| [05-application-data-lineage.md](./05-application-data-lineage.md) | End-to-end traceability: Frontend Screen → API → Controller → Service → DB Table |
| [06-business-workflows.md](./06-business-workflows.md) | Step-by-step transaction flows, sequence diagrams, and balance update logic |
| [07-schema-integrity-audit.md](./07-schema-integrity-audit.md) | Rigorous risk analysis: Missing FKs, nullability, type mismatches, cascade risks |
| [08-code-schema-mismatches.md](./08-code-schema-mismatches.md) | Exact discrepancies between DDL, JPA entity annotations, JDBC, and React state |
| [09-target-redesign-baseline.md](./09-target-redesign-baseline.md) | Strategic classification: Keep, Improve, Merge, Split, or Deprecate per table |
| [10-redesign-checklist.md](./10-redesign-checklist.md) | Actionable prerequisites, governance checklist, and Flyway migration plan |
| [11-inspection-coverage.md](./11-inspection-coverage.md) | Audit coverage log, inspected source files, confidence levels, and constraints |
| [diagrams/](./diagrams/) | Standalone `.mmd` Mermaid diagram source files |
| [exports/](./exports/) | Sanitized machine-readable schema metadata (`schema_inventory.json`) |

---

## 3. Inspection Methodology & Limitations

### Methodology
1. **Source Inspection:** Static analysis of `backend/src/main/resources/schema.sql`, JPA `@Entity` models, Spring `@Repository` interfaces, Service layers, and React JSX frontend components.
2. **Safety Protocol:** Strictly read-only analysis. No credentials logged, no database mutation queries executed, no business records printed.
3. **Classification of Facts vs Inferences:**
   - **Confirmed Fact:** Explicitly defined in PostgreSQL DDL (`schema.sql`) or JPA `@Table` / `@JoinColumn` annotations.
   - **Inferred Relationship:** Foreign entity referenced via string code/ID in backend business logic or frontend select dropdowns without an explicit database-level foreign key constraint.
   - **Assumption / Potential Risk:** Architecture patterns that appear unanchored or duplicate across the codebase.

### Limitations
- The live Render cloud PostgreSQL database was not queried directly via interactive session to avoid risking live transactional locks or connection degradation; all findings are verified against the authoritative `schema.sql` and Spring Boot code.
