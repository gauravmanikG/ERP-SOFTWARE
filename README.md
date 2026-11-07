# Silver Muller Seals — SOFTWARE

## Tech stack

| Layer     | Tech                                                    |
|-----------|----------------------------------------------------------|
| Frontend  | React, HTML, CSS, JavaScript (Vite + Tailwind)            |
| Backend   | Spring Boot (Java)                                         |
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

| Task | Command (in `backend`) |
|------|------------------------|
| Start now, in this window | `.\run.ps1` (Ctrl+C stops it and the API) |
| Start automatically at Windows sign-in | `.\install-autostart.ps1 -StartNow` |
| Stop (however it was started) | `.\stop-backend.ps1` |
| Remove the auto-start | `.\uninstall-autostart.ps1` |

Killing `java.exe` by hand does not stop the backend — the supervisor restarts
it. Use `stop-backend.ps1`.

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
Opens `http://localhost:5173`. The pages call the backend on port 4000; the
browser origins allowed to do so are set by `app.cors.allowed-origins` in
`application.properties` (override with the `APP_CORS_ALLOWED_ORIGINS` env var).

## Production notes (brief)

- Never commit `backend/.env` or real credentials — `backend/.gitignore`
  already excludes `.env`.
- For a production deploy, host the backend somewhere that runs a Java jar
  (Railway, Fly.io, an EC2 box, etc.), point
  `SPRING_DATASOURCE_URL`/`SPRING_DATASOURCE_USERNAME`/`SPRING_DATASOURCE_PASSWORD`
  at your production Postgres instance, and set the frontend's
  `VITE_API_URL` env var to that backend's public URL before building the
  frontend with `npm run build`, and set `APP_CORS_ALLOWED_ORIGINS` on the
  backend to the frontend's public URL.
