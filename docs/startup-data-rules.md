# Startup data rules (backend)

**Rule: an ordinary application start must never delete, reset or overwrite existing business or master data.**
Restarting the backend may only *create what is missing* (tables, columns, default rows). Anything that changes an
existing row is a deliberate, one-time, reviewed migration.

The build enforces this: `StartupSafetyGuardTest` runs in every `mvn test` (no database needed) and fails on a
violation. `StartupSafetyGuardSelfTest` proves the guard catches planted unsafe code.

## Who does what at startup

| Path | Runs | May do | Must not do |
|---|---|---|---|
| `schema.sql` (Spring SQL init) | every start | `CREATE ... IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, indexes, views | `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `DROP TABLE`, `DROP COLUMN`, column type changes, `DO $$` blocks |
| `seed-data.sql` (Spring SQL init, after schema) | every start | inserts that follow a declared **seed policy** (below) | `ON CONFLICT DO UPDATE`, `UPDATE`, `DELETE`, anything else |
| `DataInitializer` bulk seeds (`vendor_master.sql`, `customer_master.sql`, `machine_master.sql`, `init_hsn_and_phase15.sql`) | **once per database**, and only into an empty table | data `INSERT`s, `setval` | DDL (it belongs in `schema.sql`), deletes, updates |
| `StartupDataMigrations` | each migration **once per database** | change or delete existing rows, deliberately | be edited after it has shipped |
| `ItemGroupService` default groups/subgroups | each default **once per database** (via `SeedRegistry`) | insert a default the first time | re-create one the user deleted ("Reset to defaults" still restores them on request) |
| Other startup hooks (`ProcurementMigrations`, `MasterDataSchema`, `PurchaseOrderTermsService`, `@PostConstruct` in services) | every start | idempotent DDL, insert-only defaults that the app only soft-deletes (`MasterDataSchema`), reviewed exceptions | reset user-editable values |

## Seed policies: system data vs user-managed data

Every default row belongs to exactly one policy, declared above its statement (`-- seed-policy: ...`).

| Policy | Meaning | On restart | If the user deletes it |
|---|---|---|---|
| `system <reason>` | The code looks the row up by name and breaks without it. Today: transaction types `Material Transfer`, `Internal Material Return`, `Material Send for Job work`; departments `Store`, `Rejection Store`, `External Job Work`, `Quality Hold`, `Scrap Yard`. | inserted only if missing; existing values are never changed | it is **restored** on the next start (documented, intentional) |
| `once` | A user-managed default (categories, operations, procurement/process types, HSN codes, PO categories, demo items `MAT-001`..`MAT-005`, remaining departments and transaction types, bulk seed files, item groups). | inserted only the first time its key is seen in this database, then recorded in `public.app_seed_registry` | it **stays deleted**: the registry key remains, so it is never seeded again |

The registry is the tombstone. To bring back a deleted user-managed default deliberately, re-create it in the
application (or delete its `app_seed_registry` row on a test database and restart). On a database that already had
data when the registry was introduced, every existing default was recorded as already seeded.

A `once` statement in `seed-data.sql` is one plain-SQL statement (no `DO $$`, which Spring's splitter cannot run):

```sql
-- seed-policy: once user-managed defaults
WITH seed (category_name, short_code) AS (VALUES ('FELT', 'FELT')),
added AS (
  INSERT INTO public.category_master (category_name, short_code)
  SELECT s.category_name, s.short_code FROM seed s
  WHERE NOT EXISTS (SELECT 1 FROM public.app_seed_registry r WHERE r.seed_key = 'category_master:' || s.category_name::text)
  ON CONFLICT (category_name) DO NOTHING)
INSERT INTO public.app_seed_registry (seed_key, policy)
SELECT 'category_master:' || s.category_name::text, 'once' FROM seed s
ON CONFLICT (seed_key) DO NOTHING;
```

In Java, wrap the insert in `SeedRegistry.seedOnce("<table>:<key>", ...)` and mark it `// seed-policy: once`.
A plain `INSERT ... ON CONFLICT DO NOTHING` at startup re-creates deleted rows; the guard rejects it unless it is
declared `seed-policy: system <reason>` or carries a reviewed `startup-guard: allow`.
| Hibernate `ddl-auto=update` | every start | add a missing column/table | nothing else (it never changes rows). `schema.sql` must still define every entity column; `StartupIdempotencyIntegrationTest` checks this with `validate`. |

Startup is fail-fast: `spring.sql.init.continue-on-error=false`, and seed/migration failures stop the application
instead of being logged and skipped. Scripts are read as UTF-8 (`spring.sql.init.encoding=UTF-8`); without it Windows
reads them as cp1252 and stores corrupted text such as `ðŸ› ` instead of `🛠`.

## I need to...

- **Add a table or column:** add `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to `schema.sql`.
- **Add a default row (department, category, type...):** add it to the matching `seed-policy: once` statement in
  `seed-data.sql` (or `system` only if the code cannot work without it, with the reason). It is created once on each
  database, never touches an existing row, and stays deleted if a user deletes it.
- **Startup scripts are UTF-8.** The guard rejects garbled sequences such as `ðŸ` or `Â°`; that is how the duplicate
  `Bought-Out Parts` category (ID 3111, removed by migration `2026-10-24-04`) was created.
- **Change or fix existing data** (rename a default, backfill a column, remove a bad row): append a `Migration` to
  `StartupDataMigrations.MIGRATIONS` with a new id (`YYYY-MM-DD-NN-short-name`), one SQL statement and a description of
  what it changes and why it is safe. It runs once per database and is recorded in `public.app_data_migration`. Never
  edit or delete a shipped migration: its checksum is stored and startup fails if it changes. Test it on a disposable
  database first.
- **Add a new startup hook** (`ApplicationRunner`, `CommandLineRunner`, `@PostConstruct`, `@EventListener`...): review
  it against this page, then add it to `REVIEWED_STARTUP_HOOKS` in `StartupSafetyGuardTest` with the reason it is safe.
  The build fails until you do.
- **A genuinely necessary exception** in a startup path (for example a fill-only backfill that must re-check every
  start): put `-- startup-guard: allow <reason>` (SQL) or `// startup-guard: allow <reason>` (Java) directly above the
  statement. The reason must say why it cannot reset user data. Prefer a migration whenever a one-time change is enough.

## Tests

- `mvn test`: guard checks (no database).
- Restart behaviour on a **disposable** PostgreSQL database (never the live one; the test refuses `sms_seals`):

  ```
  SMS_INIT_TEST_DATABASE_URL=jdbc:postgresql://localhost:5434/<empty_test_db>
  SMS_INIT_TEST_DATABASE_PASSWORD=...
  mvn test -Dtest=StartupIdempotencyIntegrationTest
  ```

  It proves that a fresh database gets its defaults, edited values survive restarts, deleted user-managed defaults
  (and an emptied bulk-seeded table) stay deleted, missing system rows are restored, the garbled category is removed
  only when unused and never returns, demo items never duplicate/reset/reappear, migrations run exactly once, an
  edited migration or a missing seed file stops startup, and `schema.sql` alone satisfies every entity.

## Limits of the guard

It reads SQL files and the string literals inside startup methods (and the same-class methods they call). SQL that is
built from variables at runtime, or executed in another class called from a hook, is not seen; the reviewed-hook
registry and code review cover those. It cannot check that the CI pipeline sets `SMS_INIT_TEST_DATABASE_URL`.
