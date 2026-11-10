// "Backend" section of the Documentation module: the engineering behind the ERP.
//
// Every claim here is backed by code in backend/ (file names are given so anyone can verify them).
// KEEP THIS FILE CURRENT: when a backend capability is added or changed, add or update its entry in the same change
// (see CLAUDE.md, "Documentation rule"). Live counts (endpoints, tables, permissions, migrations) are NOT written here:
// the page reads them from GET /api/docs/system, so they are always exact.

export const BACKEND_INTRO = {
  title: "Built like a bank ledger, not a spreadsheet",
  text: "Silver Brain's backend is a Spring Boot 4 (Java 17) service on PostgreSQL. It was designed around one idea: the numbers must always be right. Quantities cannot be over-ordered or over-received even when many people click at the same moment, history is never overwritten, every step is attributed to a real signed-in person, and a restart can never damage data. The service watches itself and restarts automatically if it fails."
};

export const STACK = [
  ["Language / framework", "Java 17, Spring Boot 4.1 (Spring MVC, JDBC, JPA in validate-only mode), Jackson 3 for JSON"],
  ["Database", "PostgreSQL (with pgcrypto for password hashing and encryption)"],
  ["Frontend", "React 19 + Vite 8 (Tailwind CSS 3), served separately; every screen calls the API on its own origin (/api, one setting in shared/api/apiBase.js), so no backend address is hard-coded"],
  ["Packaging", "One executable jar (seals-backend.jar) that serves the ERP screens and the API from one address, or a Docker image of the same with a health check"],
  ["Operations", "Self-healing supervisor (run.ps1), Windows auto-start task, docker-compose with restart policy"],
  ["Testing", "JUnit 5: unit tests, guard tests and integration tests on disposable databases"]
];

// Each highlight: title, tag (short badge), headline (one line), points (how it works), files (where to verify).
export const HIGHLIGHTS = [
  {
    group: "Reliability & operations",
    items: [
      {
        title: "Self-healing backend and frontend (automatic restart)",
        tag: "New",
        headline: "If the API or the UI server crashes, runs out of memory, freezes — or even if its supervisor is killed — it comes back by itself. No one has to notice first.",
        points: [
          "Supervisor (backend/run.ps1): restarts the API whenever it exits — crash, out-of-memory, killed process, database unavailable at startup.",
          "Watchdog: checks /api/health/live every 15 seconds; three failures in a row after start-up means the API is hung, so it is stopped and started again.",
          "Smart backoff: a healthy run restarts after 10 s; repeated start-up failures back off to 20 s, 40 s, then every 60 s, so a broken configuration never hammers the machine.",
          "Out-of-memory protection: the JVM runs with ExitOnOutOfMemoryError, so it exits cleanly (and is restarted) instead of limping along.",
          "Single instance: a system-wide lock guarantees only one supervisor runs, so a manual start and the auto-start task can never collide.",
          "Memory caps: Maven and the API JVM have fixed heap limits, so they cannot grow into the PC's free RAM and get processes killed for low memory.",
          "The frontend has the same supervisor and watchdog: frontend/run-frontend.ps1 (Vite in development mode; in production mode a small redirect from port 5173 to 4000).",
          "Watchdog for the watchdogs: install-autostart.ps1 registers two hidden Windows tasks that start both supervisors 30 s after sign-in and re-check every 2 minutes, so a supervisor that is itself killed is back within 2 minutes. A deliberate stop (stop-all.ps1) is respected until start-dev.ps1 is run.",
          "Per-run logs with rotation in backend/logs and frontend/logs.",
          "Tested for real: killed the process (back in ~60 s), froze it (watchdog detected and restarted it), started a second copy (refused), stopped it cleanly (nothing left behind)."
        ],
        files: ["backend/run.ps1", "frontend/run-frontend.ps1", "install-autostart.ps1", "stop-all.ps1", "start-dev.ps1"]
      },
      {
        title: "Real health checks: liveness vs readiness",
        tag: "New",
        headline: "The system distinguishes 'the API is frozen' from 'the database is down' — and reacts correctly to each.",
        points: [
          "GET /api/health/live answers only whether the API process responds. It never touches the database, so a database outage can never trigger pointless restart loops.",
          "GET /api/health really checks PostgreSQL within 3 seconds on a dedicated thread pool: 200 {ok:true, db:connected}, or 503 {ok:false, db:disconnected}. A dead database can never hang the health check.",
          "When PostgreSQL comes back, the connection pool reconnects by itself — no restart needed.",
          "Verified: dropping the test database turned readiness to 503 in 3.2 s while liveness stayed healthy and the container was not restarted."
        ],
        files: ["common/controller/HealthController.java"]
      },
      {
        title: "Production-grade container",
        tag: "New",
        headline: "One command runs the backend in Docker with restart-on-failure and health monitoring.",
        points: [
          "Multi-stage build: dependencies cached in their own layer, so code changes rebuild quickly.",
          "Runs as a non-root user; heap sized from the container's memory limit (MaxRAMPercentage).",
          "HEALTHCHECK on /api/health/live; docker-compose restart: unless-stopped; log rotation (10 MB × 5).",
          "Secrets never enter the image (.dockerignore excludes .env); they are supplied at run time.",
          "Ready for cloud platforms such as AWS ECS, which replace unhealthy containers automatically."
        ],
        files: ["backend/Dockerfile", "docker-compose.yml", ".dockerignore"]
      },
      {
        title: "Runs on any PC from one address",
        headline: "A hosted install is one program: http://<server>:4000/ opens the ERP and its API calls stay on that same address.",
        points: [
          "The jar carries the built screens (pom.xml copies frontend/dist into static/), so no Vite, CORS setup or backend address is needed on the server.",
          "Every screen builds its API URLs from one setting (frontend/src/shared/api/apiBase.js); nothing points at localhost.",
          "A new database is set up on first start; the built-in accounts get the first password from APP_BOOTSTRAP_PASSWORD instead of a public default.",
          "Docker: the image builds screens and API together; docker-compose.db.yml adds PostgreSQL for a server that has none and refuses to start without a database password and a first admin password.",
          "Behind an HTTPS reverse proxy the API reads its X-Forwarded-* headers (server.forward-headers-strategy=native)."
        ],
        files: ["docs/hosting.md", "backend/pom.xml", "backend/Dockerfile", "docker-compose.yml", "docker-compose.db.yml", "modules/admin/AdminSeeder.java", "frontend/src/shared/api/apiBase.js"]
      },
      {
        title: "Production release with one command",
        tag: "New",
        headline: "release.ps1 builds, checks and installs a production release on this PC, verifies it answers, and puts the previous release back by itself if it does not.",
        points: [
          "One jar (release/seals-backend.jar) holds the API and the minified screens; the supervisor runs it instead of Maven, so start-up takes seconds and needs less memory. Code edits reach users only with the next release.",
          "Built in release/build, so building never disturbs the running app; the ERP is down only for the ~30 s swap.",
          "Checks before installing: documentation check, frontend build, unit tests, and that the jar really contains the screens. -FullTests also runs every database test.",
          "After installing it waits for /api/health/live and the ERP page; if they do not answer within 4 minutes the previous release (or development mode, on a first release) is started again. release.ps1 -Rollback goes back on demand.",
          "Screens load on first open: the start-up download is about 90 KB of app code plus React and icons (it was one 3 MB file). A tab left open across a release reloads itself once when it needs a screen file that the new release replaced.",
          "Script and style files have content-hashed names and are cached by browsers for a year; the page itself is never cached, so a release is picked up on the next visit. Text responses are gzip-compressed.",
          "Every response carries nosniff, SAMEORIGIN framing and same-origin referrer headers; a screen that fails shows a Reload / Home message instead of a blank page.",
          "Port 5173 redirects to port 4000 in production mode, so old bookmarks keep working. SMS_MODE=dev switches both supervisors back to Maven + Vite."
        ],
        files: ["release.ps1", "backend/run.ps1", "frontend/run-frontend.ps1", "frontend/scripts/redirect-to-backend.mjs", "frontend/vite.config.js", "frontend/src/shared/utils/lazyPage.js", "frontend/src/shared/components/ScreenBoundary.jsx", "common/config/WebUiConfig.java"]
      }
    ]
  },
  {
    group: "Security",
    items: [
      {
        title: "Role-based access control, enforced on the server",
        headline: "Hiding a button is only a convenience — the server re-checks every change against the user's permissions.",
        points: [
          "A single catalog defines every controllable entity and action (module.entity:action, e.g. purchase.pr:approve), across Engineering, Purchase, Inventory, Maintenance, CRM and Settings.",
          "An interceptor runs before every API call: no session → 401; inactive account → 403; temporary password not yet changed → only password change allowed; every write is matched to its permission rule and refused without it.",
          "Unlisted write endpoints are denied by default, not allowed by default.",
          "Role templates (Purchase Executive, Purchase Manager, Department User, Store Operator, Quality Inspector, Site Acceptor, Accounts, Master Data Officer, Auditor) are starting points refined per user; Super Admin and Developer are wildcard roles.",
          "Tests prove every rule names a real permission and that approve / reject need their own permission."
        ],
        files: ["modules/admin/security/ApiAccessInterceptor.java", "modules/admin/rbac/PermissionCatalog.java", "modules/admin/security/ActionRules.java"]
      },
      {
        title: "Who did it — taken from the session, never from the browser",
        headline: "Every create, approve, reject, convert and receive is recorded under the signed-in user. A name typed in the browser can never be recorded instead.",
        points: [
          "The interceptor stores the verified user on the request; services read the actor from there (RequestActor).",
          "The procurement activity trail joins a PR, its drafts, POs and GRNs into one timeline of who did what and when."
        ],
        files: ["modules/admin/security/RequestActor.java", "modules/purchase/activity/"]
      },
      {
        title: "Passwords done properly",
        headline: "Passwords are bcrypt-hashed inside PostgreSQL and verified there; plaintext is never read back.",
        points: [
          "Hashing with pgcrypto crypt() and gen_salt('bf'); sign-in compares hashes in the database.",
          "Sessions are random 256-bit tokens with a 12-hour expiry, stored server-side and revocable.",
          "Temporary passwords force a change before the user can do anything else.",
          "Optional Super Admin 'view password' keeps a separately encrypted copy (pgp_sym_encrypt with a key from the environment); sign-in never uses it, and with no key configured nothing is stored at all."
        ],
        files: ["modules/admin/auth/AuthService.java", "modules/admin/security/PasswordVault.java"]
      }
    ]
  },
  {
    group: "Data integrity",
    items: [
      {
        title: "Concurrency-safe quantity engine",
        headline: "Two buyers can click 'order' on the last units at the same instant — exactly one succeeds.",
        points: [
          "One formula for every path: available to order = requested − ordered − reserved in drafts, checked on every write.",
          "Every quantity write locks the rows it changes (SELECT … FOR UPDATE — used in 40+ places) and refuses with 409 Conflict if the quantity is no longer available.",
          "A fixed lock order everywhere (PO → allocations → PR lines; vendor advisory lock → draft → draft lines → PR lines) prevents deadlocks.",
          "PostgreSQL advisory locks serialise per-vendor draft creation and other critical sections.",
          "Integration tests race a new order against a legacy change for the last units and prove only one wins."
        ],
        files: ["modules/purchase/service/PurchaseRequisitionService.java", "modules/purchase/newpo/SourcingService.java", "modules/purchase/newpo/PoByPrService.java"]
      },
      {
        title: "All-or-nothing transactions",
        headline: "Converting a draft to a PO, posting a GRN or cancelling a PO either completes entirely or changes nothing.",
        points: [
          "Draft → PO moves quantity out of the draft, creates the PO, its allocations, terms and delivery schedule, and updates PR status in one transaction.",
          "GRN posting attributes accepted quantity to the PR allocations it fulfils in the same transaction.",
          "PO cancellation releases every allocation back to its PR line in one transaction; a retry releases nothing twice."
        ],
        files: ["modules/purchase/newpo/SourcingService.java", "modules/purchase/service/GoodsReceiptNoteService.java"]
      },
      {
        title: "History is never overwritten",
        headline: "Old prices, posted receipts and cancelled allocations stay exactly as they were.",
        points: [
          "Vendor rates are insert-only with effective dates: a new price is a new row, so any historical PO traces to the rate in force.",
          "A posted GRN can never be edited, deleted or posted again; the same PO + vendor challan cannot be posted twice.",
          "Cancelled allocations are marked released, never deleted.",
          "Masters use soft delete and restore, so old documents always stay readable."
        ],
        files: ["modules/purchase/newpo/VendorRateService.java", "modules/purchase/service/GoodsReceiptNoteService.java"]
      },
      {
        title: "Duplicate-click and retry protection",
        headline: "A double-click or a network retry never creates a second document or moves material twice.",
        points: [
          "Client request ids (idempotency keys) on Capital PO and Job Work operations: the same request is processed once.",
          "Unique keys in the database for document numbers and business identities, so duplicates are impossible even under load."
        ],
        files: ["modules/purchase/capitalpo/CapitalPoService.java", "modules/purchase/jobwork/JobWorkService.java"]
      },
      {
        title: "Gap-free yearly document numbering",
        headline: "PR-2026-00001, PO-2026-00001, GRN-2026-00001 — assigned by the server, atomically, restarting every year.",
        points: [
          "One counter row per document type and year, incremented atomically; numbers always stay above the highest already stored.",
          "Numbers shown on a form before saving are previews only; the server assigns the real number on save."
        ],
        files: ["modules/purchase/service/DocumentNumbers.java"]
      },
      {
        title: "Receipt quality rules",
        headline: "Only accepted goods count as delivered.",
        points: [
          "On every GRN line, received = accepted + rejected + pending inspection.",
          "Accepted quantity fulfils the PO and its PR lines; rejected goods are retained and reported, never counted as delivered.",
          "Over-acceptance beyond the open PO quantity is refused (0% tolerance)."
        ],
        files: ["modules/purchase/service/GoodsReceiptNoteService.java"]
      },
      {
        title: "Tax correctness",
        headline: "GST rates are validated so a PO can never carry inconsistent tax.",
        points: [
          "HSN / SAC master: CGST + SGST must equal GST and IGST must equal GST.",
          "Direct PO and PO by PR require each item's HSN to have an active GST rate; capital and service charges carry their own SAC codes.",
          "CGST + SGST vs IGST is decided by comparing the vendor's GSTIN state with our own registration state, app.company.gst-state-code (06, Haryana — GSTIN 06AFBFS8991J1ZC). Capital and service POs take the company state on the form."
        ],
        files: ["modules/purchase/controller/HsnTaxMasterController.java", "modules/purchase/service/PurchaseProcessingService.java", "backend/src/main/resources/application.properties"]
      }
    ]
  },
  {
    group: "Safe start-up and change management",
    items: [
      {
        title: "A restart can never damage your data",
        headline: "Starting the backend may only create what is missing. It never deletes, resets or overwrites business data.",
        points: [
          "schema.sql is the single source of truth for every table and column; Hibernate only validates that the code matches it and never changes the schema itself.",
          "Default rows follow declared seed policies and are recorded in a seed registry — a default you delete or rename stays deleted or renamed forever (a 'tombstone').",
          "One-time data migrations run exactly once per database, are recorded with a checksum, and start-up fails if a shipped migration is ever edited.",
          "Fail-fast: a failing start-up statement stops the application instead of being silently skipped. All scripts are read as UTF-8, so text is never corrupted."
        ],
        files: ["resources/schema.sql", "resources/seed-data.sql", "common/config/StartupDataMigrations.java", "common/config/SeedRegistry.java", "docs/startup-data-rules.md"]
      },
      {
        title: "A test that guards the guard",
        headline: "The build itself refuses code that could reset data at start-up.",
        points: [
          "StartupSafetyGuardTest scans start-up SQL and start-up Java code for forbidden statements (DELETE, UPDATE, DROP, ON CONFLICT DO UPDATE …) on every build — no database needed.",
          "StartupSafetyGuardSelfTest plants unsafe code and proves the guard catches it.",
          "Any new start-up hook must be reviewed and registered, or the build fails.",
          "StartupIdempotencyIntegrationTest restarts against a disposable database and proves edited values survive, deleted defaults stay deleted and migrations run once."
        ],
        files: ["test/…/startupguard/StartupSafetyGuardTest.java", "test/…/startupguard/StartupIdempotencyIntegrationTest.java"]
      }
    ]
  },
  {
    group: "Quality & observability",
    items: [
      {
        title: "Tested on throwaway databases",
        headline: "Integration tests run against throwaway databases created for the run and dropped afterwards — and refuse to run against the live one.",
        points: [
          "backend/test-db.ps1 runs every test in one go: start-up and master-data tests on a brand-new empty database, purchase tests on a fresh copy of the live data (the live database is only read), then drops both.",
          "Every database test class refuses a connection to the live sms_seals database, so a mistyped setting cannot write test data into it.",
          "Unit tests cover PO validity, capital PO rules, service PO calculation and guards, PR status and guards, GRN validity, vendor rates and access rules.",
          "Purchase-order, sourcing and receipt integration tests exercise the real SQL, locks and transactions."
        ],
        files: ["backend/test-db.ps1", "backend/src/test/"]
      },
      {
        title: "Same JSON after the framework upgrade",
        headline: "Moving to Spring Boot 4 / Jackson 3 did not change a single value the screens receive; dates stay plain calendar dates.",
        points: [
          "spring.jackson.use-jackson2-defaults keeps the JSON rules the API was built with: fields in declared order, and older stored JSON (PO lines, Capital PO amendments, settings) still reads back.",
          "DATE columns are sent as yyyy-MM-dd. Jackson 3 would otherwise send a UTC timestamp, which shows the previous day on an Indian-time server; JsonConfig prevents that and JsonConfigTest guards it.",
          "Checked at upgrade time by calling every list endpoint on the old and new builds against the same copy of the data and comparing the answers."
        ],
        files: ["backend/src/main/resources/application.properties", "backend/src/main/java/com/silvermuller/seals/common/config/JsonConfig.java", "backend/src/test/java/com/silvermuller/seals/common/config/JsonConfigTest.java"]
      },
      {
        title: "Clear, consistent errors",
        headline: "Every failure comes back as a readable message with the right HTTP status — never a stack trace.",
        points: [
          "A global exception handler maps conflicts to 409, validation errors to 400, missing records to 404 and bad requests to 400 with a precise message.",
          "Business rules explain themselves, e.g. 'No rate for … is effective today. Add it in the Vendor Rate Master first.'"
        ],
        files: ["common/exception/GlobalExceptionHandler.java"]
      },
      {
        title: "Self-documenting system",
        tag: "New",
        headline: "Part of this documentation is generated from the running system itself, so it can never be out of date.",
        points: [
          "GET /api/docs/system lists every API endpoint registered in Spring, every database table with its size, the full permission catalog and the data migrations applied — read live on every visit.",
          "The screen catalog is built from the live navigation, and any screen without a guide entry is flagged automatically.",
          "'What's new' is read from the git history when the frontend starts or builds, and refreshes the moment a commit is made."
        ],
        files: ["common/docs/DocsController.java", "frontend/src/modules/documentation/"]
      }
    ]
  }
];
