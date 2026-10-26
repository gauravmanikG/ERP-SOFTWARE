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
— you should see `{"ok":true,"db":"connected"}`.

To build a runnable jar instead:
```
mvn clean package
java -jar target/seals-backend.jar
```

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
  (Render, Railway, Fly.io, an EC2 box, etc.), point
  `SPRING_DATASOURCE_URL`/`SPRING_DATASOURCE_USERNAME`/`SPRING_DATASOURCE_PASSWORD`
  at your production Postgres instance, and set the frontend's
  `VITE_API_URL` env var to that backend's public URL before building the
  frontend with `npm run build`, and set `APP_CORS_ALLOWED_ORIGINS` on the
  backend to the frontend's public URL.
