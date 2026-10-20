# PO by PR end-to-end checks

These scripts exercise the PO-by-PR flow against a **disposable copy** of the ERP database.
They never point at the live database (`sms_seals`).

Windows / Git Bash, PostgreSQL 18 on port 5434, Google Chrome installed, Node 22.

1. `reset-test-env.sh` drops `sms_seals_test`, copies `sms_seals` into it with `pg_dump`, and starts the
   backend on port 4100 against the copy (`start-test-backend.ps1`).
2. `node e2e-po-by-pr.cjs` — API checks (rates, eligibility, orders, refusals, concurrency, GRN, guards).
3. Run `reset-test-env.sh` again, then `node pr-guard-check.cjs` — PR edit and delete guards.
4. Build the UI against the copy and serve it on port 5174:
   `VITE_API_URL=http://localhost:4100 npx vite build --outDir <tmp>` then `npx vite preview --outDir <tmp> --port 5174`.
   Run `reset-test-env.sh` again, then `node ui-po-by-pr.cjs` — headless Chrome checks.

Java integration tests (`backend/src/test/.../PoByPrIntegrationTest.java`) run only when
`SMS_TEST_DATABASE_URL` is set, for example:

    SMS_TEST_DATABASE_URL=jdbc:postgresql://localhost:5434/sms_seals_test mvn test -Dtest=PoByPrIntegrationTest

Stop the test backend (port 4100) and drop `sms_seals_test` when finished.
