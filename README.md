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
├── index.html
├── package.json              # frontend (Vite + React)
├── vite.config.js            # includes a dev proxy: /api -> http://localhost:4000
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── data/                 # colors, nav content, admin-form field definitions
│   ├── lib/
│   │   └── api.js            # frontend's REST client for the backend below
│   ├── hooks/
│   │   └── useCompanyMaster.js  # admin-screen state, calls api.js
│   ├── components/
│   └── pages/
└── backend/                  # Spring Boot + PostgreSQL API
    ├── pom.xml
    ├── .env.example           # env vars to set before running
    └── src/main/
        ├── java/com/silvermuller/seals/
        │   ├── SealsApplication.java        # entry point
        │   ├── CompanyRepository.java        # JdbcTemplate data access
        │   ├── config/CorsConfig.java
        │   ├── controller/
        │   │   ├── CompanyController.java    # GET / POST / PUT / DELETE /api/companies
        │   │   └── HealthController.java     # GET /api/health
        │   └── util/FieldMapper.java         # camelCase <-> snake_case field mapping
        └── resources/
            ├── application.properties
            └── schema.sql     # the `companies` table (auto-run on startup)
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

The app runs on `http://localhost:4000` and creates the `companies` table
automatically on startup (`schema.sql` is safe to re-run — everything is
`IF NOT EXISTS`).

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
npm install
npm run dev
```
Opens `http://localhost:5173`. In dev, Vite proxies any `/api/...` request
to the backend on port 4000 (see `vite.config.js`), so the frontend just
calls `fetch("/api/companies")` with no CORS setup needed (Spring Boot's
`CorsConfig` also allows this directly, for when you don't use the proxy).

## Where the data is now stored

The "Company Master" admin screens (Screen 1: Entry Form, Screen 2: Records)
read and write a real `companies` table in your PostgreSQL database — see
`backend/src/main/resources/schema.sql` for every column. Concretely:

- **Save** on Screen 1 → `POST /api/companies` (or `PUT .../{id}` when
  editing) → an `INSERT`/`UPDATE` against the `companies` table.
- **Screen 2's list** → `GET /api/companies` → a `SELECT * FROM companies`.
- **Delete** → `DELETE /api/companies/{id}`.
- The uploaded logo is stored as a base64 data URL in the `logo` text
  column — fine for a prototype; for production you'd typically upload the
  image to object storage (S3, Supabase Storage, etc.) and store just the
  URL instead, to keep the database small and page loads fast.

This is a genuine multi-user backend: anyone hitting the frontend (on any
device) talks to the same API and the same database, so everyone sees the
same records.

The Contact page's "Send Enquiry" form still doesn't persist anywhere — it
only flips a `sent` flag in memory. If you want those enquiries saved too,
the same pattern applies: add an `enquiries` table + a new
`EnquiryController`/`EnquiryRepository` pair in the backend, and call it
from `ContactPage.jsx`.

## Production notes (brief)

- Never commit `backend/.env` or real credentials — `backend/.gitignore`
  already excludes `.env`.
- For a production deploy, host the backend somewhere that runs a Java jar
  (Render, Railway, Fly.io, an EC2 box, etc.), point
  `SPRING_DATASOURCE_URL`/`SPRING_DATASOURCE_USERNAME`/`SPRING_DATASOURCE_PASSWORD`
  at your production Postgres instance, and set the frontend's
  `VITE_API_URL` env var to that backend's public URL (see `src/lib/api.js`)
  before building the frontend with `npm run build`.
