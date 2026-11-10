# Silver Muller Seals — SOFTWARE

## Tech stack

| Layer     | Tech                                                    |
|-----------|----------------------------------------------------------|
| Frontend  | React 19, HTML, CSS, JavaScript (Vite 8 + Tailwind 3)     |
| Backend   | Spring Boot 4.1 (Java 17+)                                 |
| Database  | PostgreSQL                                                  |

## Folder structure

```
silver-muller-seals/
├── frontend/                 # Vite + React
│   ├── vite.config.js        # dev proxy: /api -> http://localhost:4000
│   └── src/modules/          # crm, engineering, home, inventory, maintenance, masters, purchase, settings
├── backend/                  # Spring Boot + PostgreSQL API
│   ├── run.ps1               # loads .env, starts the API on :4000
│   └── src/main/
│       ├── java/com/silvermuller/seals/
│       │   ├── common/       # config (CORS, startup data, migrations), exceptions, health
│       │   └── modules/      # crm, inventory, maintenance, masters, purchase
│       └── resources/
│           ├── schema.sql    # every table (DDL only, runs on each start)
│           └── seed-data.sql # default rows, seeded once per database
└── docs/                     # startup-data-rules.md and module notes
```

## 1. Set up PostgreSQL

Pick whichever is easiest for you:

**Option A — local Postgres** (recommended — data stays on disk)
```
createdb -h localhost -p 5434 -U postgres sms_seals
```
This project defaults to `localhost:5434` (Windows PostgreSQL service). Avoid Docker’s `:5432` unless that container uses a named volume.

**Option B — hosted Postgres** (Supabase, Neon, Railway, RDS, etc.)
Create a database there and copy the connection details it gives you.

## 2. Start the backend (Spring Boot)

Requires Java 17+ and Maven.

```
cd backend
# Windows (loads .env and uses persistent local Postgres on :5434):
.\run.ps1

# Or manually:
# set SPRING_DATASOURCE_URL / USERNAME / PASSWORD, then:
mvn spring-boot:run
```

The app runs on `http://localhost:4000` and creates or upgrades its tables
on startup (`schema.sql` is safe to re-run; startup never resets data, see
`docs/startup-data-rules.md`).

Check it's talking to the database: open `http://localhost:4000/api/health`
— you should see `{"ok":true,"db":"connected"}`. If PostgreSQL is unreachable it
returns HTTP 503 `{"ok":false,"db":"disconnected"}`. `GET /api/health/live` only
says the API process is responsive (it never touches the database).

To build a runnable jar instead:
```
mvn clean package
java -jar target/seals-backend.jar
```

### Keeping the backend running (automatic restart)

`run.ps1` is a supervisor, not just a launcher:

- **Crash / killed / out of memory** — the API is started again (10 s; quick
  repeated startup failures back off to 20 s, 40 s, then every 60 s).
- **Hung** (running but not answering `/api/health/live` 3 times, 15 s apart) —
  it is stopped and started again.
- **Database down** — no restart (restarting cannot fix it); the API reconnects
  by itself when PostgreSQL is back.
- Only one supervisor runs at a time. Logs: `backend\logs\supervisor.log`
  (restart events) and `backend\logs\backend-*.out.log` (API output, last 10 runs).
- Memory is capped (Maven `-Xmx384m`, API `-Xmx1024m`; override with
  `MAVEN_OPTS` / `BACKEND_JVM_OPTS` in `backend\.env`) so the two JVMs cannot
  eat the PC's RAM and get processes killed for low memory.

The frontend has the same supervisor: `frontend\run-frontend.ps1`.

**Keep the whole app live (recommended, once per PC)** — from the repo root:
`.\install-autostart.ps1 -StartNow`. It registers two hidden Task Scheduler tasks
(`SilverMullerSeals-Backend`, `SilverMullerSeals-Frontend`) that start 30 s after
Windows sign-in **and re-check every 2 minutes**, so even if a supervisor itself
is killed (Task Manager, a closed window, a tool freeing memory) it is back within
2 minutes. A deliberate stop is respected until you start again.

| Task | Command (repo root) |
|------|---------------------|
| Install keep-alive + start now | `.\install-autostart.ps1 -StartNow` |
| Start (after a deliberate stop) | `.\start-dev.ps1` |
| Stop on purpose (stays stopped) | `.\stop-all.ps1` (or `backend\stop-backend.ps1` / `frontend\stop-frontend.ps1`) |
| Remove the keep-alive tasks | `.\uninstall-autostart.ps1` |
| Run one in a window instead | `backend\run.ps1` / `frontend\run-frontend.ps1` (Ctrl+C stops it) |

Killing `java.exe` or `node.exe` by hand does not stop the app — the supervisor
restarts it. Use `stop-all.ps1`.

**Docker alternative** (from the repo root, uses the same local PostgreSQL and
`backend/.env`): `docker compose up -d --build`. The container has
`restart: unless-stopped` (restarted after a crash and when Docker starts) and a
health check on `/api/health/live`; `docker compose ps` shows `healthy`. Run
either Docker or `run.ps1`, not both — both use port 4000. In Docker Desktop,
enable *Settings → General → Start Docker Desktop when you sign in*.

## 3. Start the frontend

In a second terminal:
```
cd frontend
npm install
npm run dev
```
Opens `http://localhost:5173`. Every screen calls the API on the same origin
(`/api/...`, built from `frontend/src/shared/api/apiBase.js`); Vite's dev proxy
forwards those calls to the backend on port 4000, so no backend address is
hard-coded anywhere. Only when the frontend is served from a different host
than the API does it call the API directly: set `VITE_API_URL` at build time and
allow the frontend's origin with `app.cors.allowed-origins` in
`application.properties` (override with the `APP_CORS_ALLOWED_ORIGINS` env var).

## Hosting on another PC or a server

See **[docs/hosting.md](docs/hosting.md)**. In short: the backend serves the ERP screens itself, so a hosted install
is one program on one address (`http://<server>:4000/`). Build it with `npm run build` (frontend) then
`mvn clean package` (backend), or run `docker compose up -d --build`. Set `APP_BOOTSTRAP_PASSWORD` before the first
start of any install other people can reach, and never commit `backend/.env` or real credentials.
