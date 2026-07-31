# Smart Library Management System (SLMS)

**World University of Bangladesh — Central Library**
React SPA frontend + Laravel RESTful API backend + MySQL

---

## What this is

A complete implementation of the Smart Library Management System specified in the
System Analysis and Design Report (Chapters 1–3): catalog management, student ID card
verification, book issue and return, automatic overdue fine calculation, reporting, and
role-based administration.

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind | SPA per requirement; design tokens generated from the Stitch design system |
| **Backend** | PHP 8.2 + Laravel 11 + Sanctum | RESTful API per requirement; PHP + MySQL named in report §1.8 |
| **Database** | MySQL 8.0 | Explicitly mandated in report §1.8 |
| **Auth** | Sanctum bearer tokens + RBAC | Stateless API, four roles, 19 granular permissions |

### Repository layout

```
library management/
├── backend/              Laravel 11 REST API
│   ├── app/
│   │   ├── Http/         Controllers · Requests · Resources · Middleware
│   │   ├── Models/       11 Eloquent models
│   │   ├── Services/     ALL business rules live here (BR-01 … BR-15)
│   │   ├── Repositories/ Data-access contracts + Eloquent implementations
│   │   ├── Support/      Status / Roles / Permissions / AuditAction vocabularies
│   │   └── Console/      Nightly overdue sweep + counter reconciliation
│   ├── database/         Migrations (7) · Seeders (5)
│   └── routes/api.php    Full RESTful route table
│
├── frontend/             React SPA
│   └── src/
│       ├── components/   UI kit + app shell + toasts
│       ├── pages/        20 screens (student · librarian · admin)
│       ├── lib/          API client · service layer · formatters
│       ├── store/        Auth state (Zustand)
│       └── types/        Shared TypeScript contracts
│
├── stitch_la_librer_a_slms/   Original Stitch design exports
├── SYSTEM_ARCHITECTURE.md     Software Architecture Document (MVC + layers)
├── DEVELOPMENT_PLAN.md        Design-first delivery plan
└── DESIGN_PROMPT.txt          UI/UX design brief
```

---

## Prerequisites

The frontend runs on this machine already (Node 24 is installed). **The backend needs
software that is not currently installed here:**

| Requirement | Version | Status on this machine |
|-------------|---------|------------------------|
| Node.js | 18+ | ✅ v24.16.0 installed |
| PHP | 8.2+ | ❌ **not installed** |
| Composer | 2.x | ❌ **not installed** |
| MySQL | 8.0+ | ❌ **not installed** |

### Installing the backend prerequisites (Windows)

**Easiest route — XAMPP** (bundles PHP + MySQL + phpMyAdmin):

1. Download XAMPP with PHP 8.2+ from <https://www.apachefriends.org/>
2. Install, then start **Apache** and **MySQL** from the XAMPP control panel
3. Add PHP to your PATH: `C:\xampp\php`
4. Install Composer from <https://getcomposer.org/download/>

**Verify:**

```powershell
php --version        # expect 8.2 or higher
composer --version
mysql --version
```

Make sure these PHP extensions are enabled in `php.ini` (XAMPP enables most by default):
`pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `fileinfo`, `bcmath`.

---

## Setup

### 1. Database

Create the schema (via phpMyAdmin, or the CLI):

```sql
CREATE DATABASE slms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```powershell
cd "backend"

composer install
copy .env.example .env
php artisan key:generate
```

Edit `.env` if your MySQL credentials differ from the defaults
(`root` with an empty password, which is the XAMPP default):

```ini
DB_DATABASE=slms_db
DB_USERNAME=root
DB_PASSWORD=
```

Then create the tables and load the demo data:

```powershell
php artisan migrate --seed
php artisan serve          # http://localhost:8000
```

### 3. Frontend

In a second terminal:

```powershell
cd "frontend"

npm install
copy .env.example .env
npm run dev                # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:8000`, so the browser stays on a
single origin during development and there are no CORS surprises.

Open **<http://localhost:5173>**.

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
| Frontend production build | ✅ 431 KB JS → **123 KB gzipped** |
| Backend structural check (88 PHP files, namespaces + imports) | ✅ passes |
| Postman collection JSON | ✅ valid |
| Requirements coverage vs. the PDF | ✅ **77 / 77** — see [REQUIREMENTS_TRACEABILITY.md](REQUIREMENTS_TRACEABILITY.md) |
| Backend runtime execution | ⚠️ **not verified — PHP, Composer and MySQL are not installed on this machine** |

The backend has been written against the Laravel 11 API and statically verified, but it
has not been executed. Run `composer install && php artisan migrate --seed` once PHP and
MySQL are available; that is the first point at which any runtime issue would surface.

---

## Related documents

| Document | Contents |
|----------|----------|
| [REQUIREMENTS_TRACEABILITY.md](REQUIREMENTS_TRACEABILITY.md) | Line-by-line cross-match of all 77 PDF requirements against the code, plus the 5 gaps found and closed |
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | MVC specification, layered architecture, ERD, data dictionary, DFD mapping, RBAC matrix, ADRs |
| [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) | 16-week design-first delivery plan with phase gates |
| [DESIGN_PROMPT.txt](DESIGN_PROMPT.txt) | UI/UX design brief — design system, components, per-screen prompts |
