# Silver Muller Seals ERP — working rules

Spring Boot 4 / Java 17 backend (`backend/`, port 4000) on PostgreSQL (`localhost:5434/sms_seals`), React + Vite
frontend (`frontend/`, port 5173). See `README.md` to run it and `docs/startup-data-rules.md` before touching anything
that runs at start-up.

## Documentation rule (always)

The ERP has a **Documentation** module (`frontend/src/modules/documentation/`) that new users rely on. It must describe
the software as it is **after** every change. Treat documentation as part of the change, not a follow-up:

1. **Every change that alters what a user sees or what the system does updates the docs in the same change.**
   - A screen, field, status, button or business rule → its entry in `content/guide.js` (`SCREEN_GUIDE`, keyed by the
     navigation `targetPage`; `START_HERE` for general topics).
   - A backend capability (security, integrity, reliability, operations, testing) → `content/backend.js` (`HIGHLIGHTS`).
     Only write what the code really does; name the files that prove it.
   - A workflow, lifecycle or architecture change → its Mermaid chart in `content/flowcharts.js`.
   - A new menu screen (`shared/layout/modulesData.jsx`) must get a `SCREEN_GUIDE` entry.
   - Bump `GUIDE_UPDATED` in `content/guide.js` when the guide changes.
2. **Run `npm run docs:check` in `frontend/`** before committing. It fails if a menu screen has no guide entry, a guide
   entry has no screen, or a guide links to a missing flowchart.
3. **Never hand-write live facts** (endpoint counts, table counts, permission counts, migrations). The Live System page
   and the Backend page read them from `GET /api/docs/system`; What's New reads git history automatically.
4. Describe what exists today. Mark anything planned as planned ("Coming soon", "Not built yet").

A PostToolUse hook (`.claude/settings.json` → `.claude/hooks/docs-reminder.mjs`) reminds Claude of this rule after every
edit to `frontend/src` or `backend/src`.

## Other rules

- Data safety: an ordinary start must never delete, reset or overwrite data (`docs/startup-data-rules.md`).
  `schema.sql` is the single source of truth; data fixes go through `StartupDataMigrations`.
- Tests: `backend\test-db.ps1` runs the full suite (empty throwaway database + throwaway copy of `sms_seals`; never
  writes the live `sms_seals`). `-NoCopy` skips the purchase tests, `-Test Name` runs one class.
- Production mode: when `release\seals-backend.jar` exists (made by `.\release.ps1`) the supervisors run that jar
  (ERP on http://localhost:4000/, port 5173 only redirects). Code edits reach users only after `.\release.ps1`;
  `-Rollback` restores the previous release. Without a release (or with `SMS_MODE=dev`) it is Maven + Vite.
- Backend process: `backend\run.ps1` is a supervisor with auto-restart; stop it with `backend\stop-backend.ps1`
  (killing `java.exe` only makes the supervisor restart it).
- Access control: the server enforces permissions (`ApiAccessInterceptor`, `PermissionCatalog`); the frontend's
  `auth/access.js` only hides what a user cannot open. Keep both in step when adding screens or actions.
