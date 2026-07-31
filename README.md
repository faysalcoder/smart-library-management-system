# Smart Library Management System (SLMS)

**World University of Bangladesh — Central Library**
React SPA frontend + Laravel REST API backend + PostgreSQL (Supabase)

**🌐 Live:** frontend [slms-frontend-ashy.vercel.app](https://slms-frontend-ashy.vercel.app) ·
backend [slms-backend-production.up.railway.app](https://slms-backend-production.up.railway.app) ·
source [github.com/faysalcoder/smart-library-management-system](https://github.com/faysalcoder/smart-library-management-system)

Demo login: `admin` / `librarian` / `student` / `management`, password `Password123` (see
[§Demo accounts](#demo-accounts)).

---

## What this is

A complete implementation of the Smart Library Management System specified in the
System Analysis and Design Report (Chapters 1–3): catalog management, student ID card
verification, book issue and return, automatic overdue fine calculation, reporting, and
role-based administration.

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind | SPA per requirement; design tokens generated from the Stitch design system |
| **Backend** | PHP 8.2 + Laravel 12 + Sanctum | RESTful API per requirement; PHP named in report §1.8 |
| **Database** | PostgreSQL 17 (Supabase) | Managed Postgres; the backend targets `pgsql` by default (see [§Database](#database-postgresql-via-supabase)) |
| **Auth** | Sanctum bearer tokens + RBAC | Stateless API, four roles, 21 granular permissions |
| **Hosting** | Railway (backend) + Vercel (frontend) | See [§Deploying](#deploying) |

### Repository layout

```
library management/
├── package.json          Root: `npm run dev` / `npm run deploy` (see below)
├── scripts/               dev/deploy orchestration
│
├── backend/               Laravel 12 REST API
│   ├── app/
│   │   ├── Http/          Controllers · Requests · Resources · Middleware
│   │   ├── Models/        13 Eloquent models
│   │   ├── Services/      ALL business rules live here (BR-01 … BR-15)
│   │   ├── Repositories/  Data-access contracts + Eloquent implementations
│   │   ├── Support/       Status / Roles / Permissions / AuditAction vocabularies
│   │   └── Console/       Nightly overdue sweep, backup, counter reconciliation
│   ├── database/          Migrations (8) · Seeders (5)
│   ├── nixpacks.toml      Railway build/start config
│   └── routes/api.php     Full RESTful route table
│
├── frontend/               React SPA
│   ├── vercel.json         SPA rewrite config
│   └── src/
│       ├── components/     UI kit + app shell + toasts
│       ├── pages/          22 screens (student · librarian · admin)
│       ├── lib/            API client · service layer · formatters
│       ├── store/          Auth state (Zustand)
│       └── types/          Shared TypeScript contracts
│
├── stitch_la_librer_a_slms/   Original Stitch design exports
├── SYSTEM_ARCHITECTURE.md     Software Architecture Document (MVC + layers)
├── DEVELOPMENT_PLAN.md        Design-first delivery plan
├── DESIGN_PROMPT.txt          UI/UX design brief
└── REQUIREMENTS_TRACEABILITY.md  Cross-match against the source report + DFDs
```

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | Runs both the frontend and the root dev/deploy scripts |
| PHP | 8.2+ | [XAMPP](https://www.apachefriends.org/) is the easiest route on Windows — it bundles a signed PHP build, which matters if your machine has Application Control / Smart App Control enabled (a bare downloaded `php.exe` gets blocked; XAMPP's installer doesn't) |
| Composer | 2.x | Install via [getcomposer.org](https://getcomposer.org/download/) using the PHP above |

You do **not** need a local database — the backend talks to Supabase (hosted Postgres) both
locally and in production, so there is nothing to install or run for the database.

Required PHP extensions (XAMPP enables most by default — check `php.ini`):
`pdo_pgsql`, `pgsql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `fileinfo`,
`bcmath`, `intl`, `zip`.

---

## Setup

### 1. Database (PostgreSQL via Supabase)

Create a free project at [supabase.com/dashboard](https://supabase.com/dashboard), then go to
**Project Settings → Database → Connection string → "Session pooler"** tab (not "Direct
connection" — that hostname is IPv6-only on most networks and will fail to resolve; not
"Transaction pooler" either, since its connection-pooling mode breaks prepared statements
Laravel relies on). Copy the host, username (looks like `postgres.xxxxxxxxxxxxxxxxxxxx`), and
password from there.

### 2. Backend

```powershell
cd backend
composer install
copy .env.example .env
php artisan key:generate
```

Edit `.env` with the Supabase values from step 1:

```ini
DB_CONNECTION=pgsql
DB_HOST=aws-<region>.pooler.supabase.com
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres.xxxxxxxxxxxxxxxxxxxx
DB_PASSWORD=<your Supabase database password>
DB_SSLMODE=require
```

Then create the tables and load the demo data:

```powershell
php artisan migrate --seed
```

### 3. Frontend

```powershell
cd frontend
npm install
copy .env.example .env
```

### 4. Run everything

From the **repository root** (not inside `backend/` or `frontend/`):

```powershell
npm install       # one-time: installs `concurrently`
npm run dev
```

This starts the Laravel API on **http://localhost:8000** and the Vite dev server on
**http://localhost:5173** together, in one terminal, labeled `BACKEND` / `FRONTEND`. Ctrl+C
stops both. The Vite dev server proxies `/api` to the backend, so the browser stays on a
single origin and there are no CORS surprises locally.

Open **<http://localhost:5173>**.

> `npm run dev` resolves PHP itself (checking PATH, then `C:\xampp\php\php.exe` and other
> common install locations) rather than assuming `php` is on PATH — useful right after
> installing PHP, since a Windows PATH update only takes effect in *new* terminal windows,
> not ones already open.

---

## Demo accounts

Every seeded account uses the password **`Password123`**.

| Username | Role | What you can do |
|----------|------|-----------------|
| `admin` | Administrator | Everything: users, roles, settings, audit log, fine waivers |
| `librarian` | Librarian | Issue/return, catalog, students, fines, reports |
| `student` | Student | Search, own loans, own fines (this is Sowmika, ID 4018) |
| `management` | Management | Read-only reports and dashboards |

**Demo scan values** — type these instead of scanning if you have no hardware:

- **Student cards:** `WUB-4018`, `WUB-3927`, `WUB-4102`, `WUB-3855`, `WUB-4210` …
  (the student number alone — e.g. `4018` — also works)
- **Book barcodes:** `ACC-00001` through `ACC-00075`

The seeder creates realistic history: books currently on loan, four overdue loans with
accrued fines, and one settled fine — so the dashboards, overdue monitor and reports have
meaningful data from the first login.

---

## Try the core workflow

1. Sign in as `librarian`
2. Press **Alt+I** (or click **Issue Book**)
3. Type `WUB-4018` and press **Enter** → the student panel resolves with eligibility
4. Type `ACC-00001` and press **Enter** → the book panel resolves
5. Press **Enter** again → issued, and the printable receipt opens

Then **Alt+R**, type the same barcode, press **Enter** → the return screen shows the loan,
calculates any fine, and commits on confirm.

To see the overdue path, use a barcode from one of the seeded overdue loans (visible on
**Overdue Monitor**).

---

## Deploying

From the **repository root**:

```powershell
npm run deploy
```

One command does all of the following:

1. `git add -A`, then writes a commit message **generated from the actual staged diff** —
   grouped by top-level area (`backend`, `frontend`, `docs`, …) with an added/modified/deleted
   breakdown, e.g.:
   ```
   Update backend, frontend (7 files)

   - backend: 2 modified
   - frontend: 4 modified, 1 added
   ```
   If there is nothing to commit, this step is skipped (not forced as an empty commit).
2. `git push`
3. Redeploys the backend to Railway (`railway up --service slms-backend`)
4. Rebuilds the frontend with the production API URL baked in, then redeploys it to Vercel

Useful flags (append after `--`, e.g. `npm run deploy -- --skip-backend`):

| Flag | Effect |
|------|--------|
| `--message "text"` | Use this exact commit message instead of generating one |
| `--skip-backend` | Don't touch Railway |
| `--skip-frontend` | Don't touch Vercel |
| `--no-push` | Commit locally only, skip `git push` and both redeploys |

The script lives at [scripts/deploy.js](scripts/deploy.js) and needs `npx @railway/cli` and
`npx vercel` to already be authenticated once (`npx @railway/cli login`, `npx vercel login`) —
both open a one-time browser login and then stay signed in on this machine.

---

## API

Base URL: `http://localhost:8000/api`

Every response — success or failure — uses the same envelope, so the client has exactly
one shape to handle:

```json
{
  "ok": true,
  "data": {},
  "message": "Book issued successfully.",
  "errors": {}
}
```

Paginated endpoints add a `meta` object (`current_page`, `last_page`, `per_page`, `total`).

### Status codes

| Code | Meaning |
|------|---------|
| `200` / `201` | Success |
| `401` | Not signed in, or token expired |
| `403` | Signed in, but the role lacks the permission |
| `404` | Record not found |
| `409` | **Business-rule violation** — e.g. loan limit reached, copy already issued |
| `422` | Validation failed (field errors in `errors`) |
| `429` | Rate limited |

The `409` is deliberate: it lets the UI distinguish "the system is correctly refusing this"
from "you typed something wrong".

### Key endpoints

| Method | Endpoint | Purpose | FR |
|--------|----------|---------|-----|
| POST | `/auth/login` | Sign in, returns a bearer token | FR-01 |
| GET | `/auth/me` | Rehydrate session after refresh | FR-01 |
| GET | `/dashboard` | Role-dispatched dashboard payload | — |
| GET | `/books` | Search + filter the catalog | FR-02 |
| GET | `/books/{id}` | Book detail with copies | FR-02 |
| POST | `/books` | Add a title (+ auto-generated copies) | FR-06 |
| POST | `/circulation/verify-card` | Resolve a scanned card + eligibility | FR-10 |
| GET | `/copies/lookup/{barcode}` | Resolve a scanned barcode | FR-03 |
| POST | `/circulation/issue` | Issue a book | FR-03 |
| POST | `/circulation/return/lookup` | Preview a return, incl. the fine | FR-04 |
| POST | `/circulation/return` | Commit the return | FR-04, FR-05 |
| GET | `/circulation/overdue` | Overdue monitor | FR-05 |
| POST | `/fines/{id}/collect` | Record a payment | FR-05 |
| POST | `/fines/{id}/waive` | Waive a fine (admin only) | FR-05 |
| GET | `/reports/{key}` | Run one of 8 reports | FR-08 |
| GET | `/reports/{key}/export` | Download the report as CSV | FR-08 |
| GET | `/notifications` | Fine / due-date notifications | §3.3 |
| GET | `/admin/users` | User account management | FR-09 |
| GET | `/admin/settings` | Library policy configuration | FR-09 |
| GET | `/admin/logs` | Audit trail | Security §2.10 |
| POST | `/admin/backups` | Create a database backup | FR-09, §2.10 |
| POST | `/admin/backups/{file}/restore` | Restore from a backup | FR-09 |

A ready-to-import **Postman collection** covering every endpoint is at
[docs/SLMS-API.postman_collection.json](docs/SLMS-API.postman_collection.json). Run
**Auth → Login** first; the bearer token is captured automatically for every other request.

---

## Where the business rules live

Every rule is in a **service class**, never in a controller or a component. This is the
single most important structural rule in the codebase.

| Rule | Statement | Enforced in |
|------|-----------|-------------|
| BR-01 | Only active members may borrow | `BorrowService` |
| BR-02 | At most `max_books_per_student` concurrent loans | `BorrowService` |
| BR-03 | Outstanding fine above the threshold blocks borrowing | `BorrowService` |
| BR-04 | Only an `available` copy can be issued (row-locked) | `BorrowService` |
| BR-05 | `due_date = issue_date + loan_period_days` | `BorrowService` |
| BR-06 | A return needs a matching open loan | `ReturnService` |
| BR-07 | `fine = max(0, overdue − grace) × rate`, capped | `FineCalculationService` |
| BR-08 | Return restores availability and decrements counters | `ReturnService` |
| BR-09 | Only an admin may waive, and a reason is required | `FineSettlementService` |
| BR-10 | A title with active copies cannot be deleted | `BookCatalogService` |
| BR-11 | ISBN / accession / barcode / student no. / card UID are unique | DB constraints + Form Requests |
| BR-12 | Every write produces an audit entry | `AuditLogService` |
| BR-13 | The last active admin cannot be removed or disabled | `UserAccountService` |
| BR-14 | Renewals are capped, and never allowed while overdue | `BorrowService::renew` |
| BR-15 | Reporting is strictly read-only | `ReportingService` |

Two design decisions worth knowing:

- **Fine rates are snapshot** onto the fine row when it is assessed. Changing the policy
  rate later never rewrites history.
- **Issue uses a row-level lock** (`SELECT … FOR UPDATE`) so two librarians scanning the
  same copy at the same moment cannot both succeed.

---

## Scheduled jobs

```powershell
php artisan slms:sweep-overdue          # flag overdue loans, accrue fines
php artisan slms:recalculate-counters   # repair any counter drift
```

In production, register Laravel's scheduler once and both run nightly:

```
* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## Tests

```powershell
cd backend
php artisan test
```

`tests/Unit/FineCalculationTest.php` implements the full fine matrix from
`SYSTEM_ARCHITECTURE.md` §16.1 — on time, early, 1 day, 10 days, within grace, beyond
grace, capped, and negative-day guards.

Frontend type-check and build:

```powershell
cd frontend
npm run lint     # tsc --noEmit
npm run build
```

---

## Accessibility & design notes

The interface follows `DESIGN_PROMPT.txt`:

- **Scanner-first circulation.** The barcode field auto-focuses, submits on Enter, and
  re-arms itself. A complete issue is two scans and one keypress — no mouse.
- **Colour is never the only signal.** Every status badge pairs its colour with an icon
  *and* a text label.
- **Keyboard shortcuts:** `Alt+I` issue, `Alt+R` return, `Alt+S` search.
- **Fixed status vocabulary:** green = available/on-time, amber = issued/pending,
  red = overdue/blocked, grey = lost/inactive — identical on every screen.
- Focus rings are never removed; `prefers-reduced-motion` is honoured; a skip link is the
  first focusable element.

---

## Build state

| Check | Result |
|-------|--------|
| Frontend TypeScript (`tsc --noEmit`) | ✅ passes |
| Frontend production build | ✅ ~465 KB JS → **~131 KB gzipped** |
| Backend runtime (migrations + seeders against live Supabase) | ✅ verified — all 8 migrations + 5 seeders run clean |
| Backend live on Railway | ✅ [slms-backend-production.up.railway.app/api/health](https://slms-backend-production.up.railway.app/api/health) |
| Frontend live on Vercel | ✅ [slms-frontend-ashy.vercel.app](https://slms-frontend-ashy.vercel.app) |
| Cross-origin login (Vercel → Railway → Supabase), full round trip | ✅ verified |
| Postman collection JSON | ✅ valid |
| Requirements coverage vs. the PDF + its DFD diagrams | ✅ **103 / 103** — see [REQUIREMENTS_TRACEABILITY.md](REQUIREMENTS_TRACEABILITY.md) |

Originally written and statically verified before PHP/Postgres were available locally; the
backend has since been run for real against a live Supabase database (both from this machine
and from Railway) and the full stack has been exercised end-to-end in production, not just
type-checked.

---

## Related documents

| Document | Contents |
|----------|----------|
| [REQUIREMENTS_TRACEABILITY.md](REQUIREMENTS_TRACEABILITY.md) | Line-by-line cross-match of all 77 PDF requirements against the code, plus the 5 gaps found and closed |
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | MVC specification, layered architecture, ERD, data dictionary, DFD mapping, RBAC matrix, ADRs |
| [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) | 16-week design-first delivery plan with phase gates |
| [DESIGN_PROMPT.txt](DESIGN_PROMPT.txt) | UI/UX design brief — design system, components, per-screen prompts |
