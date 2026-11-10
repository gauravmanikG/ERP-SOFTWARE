# Hosting Silver Brain on another PC or a server

In production the ERP is **one program on one address**: the Spring Boot backend serves the ERP screens *and* the API.
Open `http://<server>:4000/` and sign in. The screens call `/api/...` on that same address, so there is no CORS setup,
no Vite and no backend address to configure.

You need **PostgreSQL** (any 14+; the app creates its own tables, using the `pgcrypto` extension) and either
**Docker** (option 1) or **Java 17+, Maven 3.9+ and Node 20.19+/22.12+** (option 2).

## Settings (environment variables)

| Variable | Needed | What it is |
|---|---|---|
| `SPRING_DATASOURCE_URL` | yes | `jdbc:postgresql://<db-host>:<port>/sms_seals` |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | yes | Database login |
| `APP_BOOTSTRAP_PASSWORD` | **yes, before the first start** on any install others can reach | First password of the two built-in accounts `superadmin@silverseals.com` and `developer@silverseals.com`. Used once, when the database is new; both accounts must change it at first sign-in. If unset, the public development default is used and a warning is logged. |
| `APP_PASSWORD_VIEW_KEY` | recommended | Secret key for the Super Admin "view password" feature. Keep it safe and never change it once set. |
| `PORT` | no (4000) | Port the ERP listens on |
| `APP_COMPANY_GST_STATE_CODE` | no (06) | GST state of the company's own registration; decides CGST+SGST vs IGST on POs |
| `APP_CORS_ALLOWED_ORIGINS` | only if the screens are served from a **different** address than the API | Comma-separated page addresses allowed to call the API |

## Option 1 — Docker (recommended for a server)

From the repository root.

**Database already exists** (for example this PC's PostgreSQL on port 5434): put the settings in `backend/.env`
(`SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `APP_PASSWORD_VIEW_KEY`, and `APP_BOOTSTRAP_PASSWORD` if the
database is new). If the database is not on this PC, also set `DOCKER_DATASOURCE_URL`. Then:

```
docker compose up -d --build
```

**Brand-new server with no PostgreSQL**: run one in Docker too (its data lives in the volume `sms-db-data`):

```
set POSTGRES_PASSWORD=<choose one>
set APP_BOOTSTRAP_PASSWORD=<first admin password>
docker compose -f docker-compose.yml -f docker-compose.db.yml up -d --build
```

(`set` is for Windows `cmd`; use `export` on Linux, or put the two values in a file named `.env` in the repository
root — it is git-ignored.) Both values are required; the start is refused without them. The image builds the
screens and the API together; secrets are never baked into it. `docker compose ps` shows `healthy` once it is up.

## Option 2 — Java on Windows or Linux

```
cd frontend
npm ci
npm run build          # makes frontend/dist
cd ../backend
mvn clean package      # copies frontend/dist into the jar; add -DskipTests to skip the tests
java -jar target/seals-backend.jar
```

Set the environment variables above first (`backend\run.ps1` loads `backend/.env` for you on Windows, and keeps the
API running with automatic restarts). Always `npm run build` **before** packaging, or the jar has no screens
(the API still works; `/` then shows nothing).

## Letting other PCs reach it

1. Find the server's address (`ipconfig` on Windows) and open `http://<that-address>:4000/` from the other PC.
2. Allow inbound TCP port **4000** in the server's firewall (Windows: Windows Defender Firewall → Inbound rules →
   New rule → Port → TCP 4000). This is a deliberate security choice for whoever manages that PC.
3. For the internet, put the ERP behind HTTPS (a reverse proxy such as nginx, IIS or a cloud load balancer
   forwarding to port 4000). The API trusts the proxy's `X-Forwarded-*` headers when the proxy is on a private
   network. Attachments are uploaded inside the request (up to about 7 MB each), so raise the proxy's body limit
   (nginx: `client_max_body_size 10m;`).

## First start on a new database

Startup creates every table, seeds the reference data once, applies the data migrations and creates the two
built-in accounts with `APP_BOOTSTRAP_PASSWORD`. Sign in as `superadmin@silverseals.com`, set a new password, then
create the real users in Settings → Users. A normal restart never deletes or resets data
(`docs/startup-data-rules.md`).

## Development mode on another PC (optional)

The Vite dev server (`npm run dev`, port 5173) is for this PC only. To open it from another PC on the network,
start it with `SMS_DEV_HOST=0.0.0.0` and allow TCP 5173 in the firewall. For anything other than development,
use the backend on port 4000 as described above.
