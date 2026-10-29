# PO by PR end-to-end checks

These scripts exercise the PO-by-PR flow against a **disposable copy** of the ERP database.
They never point at the live database (`sms_seals`).

Windows / Git Bash, PostgreSQL 18 on port 5434, Google Chrome installed, Node 22.

1. `reset-test-env.sh` drops `sms_seals_test`, copies `sms_seals` into it with `pg_dump`, and starts the
   backend on port 4100 against the copy (`start-test-backend.ps1`).
2. Run any check script with `node <script>.cjs`. Run `reset-test-env.sh` before each one, so every check
   starts from the same data:
   - `pr-guard-check.cjs`: PR edit and delete guards.
   - `numbering-restart.cjs`: PO numbering across a restart.
   - `ui-prs-po-grn.cjs`, `ui-select-flow.cjs`, `ui-multi-item.cjs`, `ui-direct-po.cjs`, `ui-register-reports.cjs`:
     headless Chrome checks of the screens. They need the UI served on port 5174 (step 3).
3. For the UI checks, build the UI against the copy and serve it on port 5174:
   `VITE_API_URL=http://localhost:4100 npx vite build --outDir <tmp>` then `npx vite preview --outDir <tmp> --port 5174`.

Java integration tests (`backend/src/test/.../PoByPrIntegrationTest.java`) run only when
`SMS_TEST_DATABASE_URL` is set, for example:

    SMS_TEST_DATABASE_URL=jdbc:postgresql://localhost:5434/sms_seals_test mvn test -Dtest=PoByPrIntegrationTest

Stop the test backend (port 4100) and drop `sms_seals_test` when finished.
