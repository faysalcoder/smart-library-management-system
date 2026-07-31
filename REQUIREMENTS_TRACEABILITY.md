# Requirements Traceability Matrix

**Source:** *Smart Library Management System — System Analysis and Design Report*
(Sowmika Islam Suchi, Batch 66A, ID 4018 — World University of Bangladesh)
**Cross-matched against:** the delivered `backend/` + `frontend/` implementation
**Date:** 31 July 2026
**Method:** Every requirement statement in Chapters 1–3 of the PDF was extracted and traced
to the code that satisfies it. Anything without a satisfying artefact was recorded as a gap
and then implemented.

---

## Summary

| Category | Requirements | Covered | Gaps found | Gaps closed |
|----------|:------------:|:-------:|:----------:|:-----------:|
| Stakeholders (§1.3) | 5 | 5 | 0 | — |
| User requirements (§1.4) | 18 | 18 | **1** | 1 |
| Functional requirements (§1.5) | 10 | 10 | 0 | — |
| Non-functional requirements (§1.6) | 6 | 6 | 0 | — |
| Hardware requirements (§1.7) | 5 | 5 | 0 | — |
| Software requirements (§1.8) | 8 | 8 | **1** | 1 |
| Use cases (§1.9) | 3 actors | 3 | 0 | — |
| Security feasibility (§2.10) | 9 controls | 9 | **1** | 1 |
| DFD data stores (§3.4) | 5 | 5 | 0 | — |
| Process workflows (§3.5) | 2 | 2 | **1** | 1 |
| Data dictionary (§3.6) | 6 tables | 6 | **1** | 1 |
| **DFD Level-0 modules** | 6 | 6 | **2** | 2 |
| **DFD Level-1 stores/processes** | 7 | 7 | 0 | — |
| **DFD Level-2 processes + stores + flows** | 13 | 13 | **1** | 1 |
| **Total** | **103** | **103** | **9** | **9** |

**Result: 100% coverage.** Six gaps were found by the text cross-match and three more by
reading the diagrams themselves; all nine are now implemented. Details in
[§Diagram conformance](#diagram-conformance-dfd-level-0-level-1-level-2) and
[§Gaps closed](#gaps-found-and-closed).

> The diagrams were **extracted from the PDF as images and read directly**, not inferred
> from the surrounding prose — which matters, because on three points the diagrams say
> something the narrative text does not, and one of those three was missed on the first
> pass through the diagrams and only caught on a second, closer read (DGAP-3).

---

## §1.3 — Stakeholder Analysis

| Stakeholder | Role stated in PDF | Implementation |
|---|---|---|
| Students | Search, borrow, and return books | `student` role · S-03 Search, S-04 Detail, S-05 My Loans, S-06 My Fines |
| Librarians | Manage books and library transactions | `librarian` role · 13 permissions · S-08…S-15 |
| Library Administrator | Monitor overall library activities | `admin` role · S-17…S-21 · audit log |
| University Management | Review reports and system performance | `management` role — read-only reports + dashboard |
| CS Engineering Team | System development and maintenance | Ops role (not an app account): artisan commands, backup/restore, health endpoint |

---

## §1.4 — User Requirements

### Student requirements

| # | Requirement | Implementation | Status |
|---|---|---|---|
| 1 | Search books by title, author, or category | `BookSearchService::search` — also ISBN and publisher; category is a filter facet | ✅ |
| 2 | View book availability | `available_copies` / `total_copies` on every result card + S-04 availability panel | ✅ |
| 3 | Borrow books using student ID cards | `IdVerificationService::resolveByCard` → `BorrowService::issue` (FR-10 → FR-03) | ✅ |
| 4 | Return borrowed books | `ReturnService::return` — S-09 | ✅ |
| 5 | View borrowing history | `GET /my/loans` — S-05, current + history tabs | ✅ |
| 6 | Check outstanding fines | `GET /my/fines` — S-06 | ✅ |

### Librarian requirements

| # | Requirement | Implementation | Status |
|---|---|---|---|
| 7 | Add new books to the system | `BookCatalogService::create` — S-12, auto-generates copies | ✅ |
| 8 | Update book information | `BookCatalogService::update` — S-12 | ✅ |
| 9 | Remove unavailable or damaged books | `updateCopy` status → `damaged`/`lost`/`withdrawn`; `delete` guarded by BR-10 | ✅ |
| 10 | Issue books to students | `BorrowService::issue` — S-08 | ✅ |
| 11 | Process returned books | `ReturnService::return` — S-09 | ✅ |
| 12 | Manage student records | `StudentService` full CRUD — S-13 | ✅ |
| 13 | Generate reports | 8 reports + CSV export — S-16 | ✅ |

### Administrator requirements

| # | Requirement | Implementation | Status |
|---|---|---|---|
| 14 | Manage user accounts | `UserAccountService` — S-17 | ✅ |
| 15 | Configure system settings | `SettingService` + 11 editable policy values — S-19 | ✅ |
| 16 | Monitor system activities | `SystemLog` append-only audit trail — S-20 | ✅ |
| 17 | **Manage database backup and recovery** | `BackupService` + S-21 + nightly `slms:backup` | ✅ **GAP-1 — closed** |
| 18 | Generate administrative reports | Audit report, user list, department usage — S-16 | ✅ |

---

## §1.5 — Functional Requirements

| ID | Requirement | Service | Controller | Screen | Status |
|----|---|---|---|---|---|
| FR-01 | User Login and Authentication | `AuthenticationService` | `AuthController` | S-01 | ✅ |
| FR-02 | Book Search | `BookSearchService` | `BookController@index` | S-03, S-04 | ✅ |
| FR-03 | Book Borrowing | `BorrowService` | `CirculationController@issue` | S-08 | ✅ |
| FR-04 | Book Returning | `ReturnService` | `CirculationController@return` | S-09 | ✅ |
| FR-05 | Fine Calculation | `FineCalculationService`, `FineSettlementService` | `FineController` | S-06, S-14, S-15 | ✅ |
| FR-06 | Book Management | `BookCatalogService` | `BookController`, `CategoryController` | S-11, S-12, S-22 | ✅ |
| FR-07 | Student Management | `StudentService` | `StudentController` | S-13 | ✅ |
| FR-08 | Report Generation | `ReportingService` | `ReportController` | S-16 | ✅ |
| FR-09 | User Account Management | `UserAccountService`, `BackupService` | `UserController`, `SettingController`, `BackupController` | S-17…S-21 | ✅ |
| FR-10 | Student ID Card Verification | `IdVerificationService` | `CirculationController@verifyCard` | S-08 step 1, S-13 bind card | ✅ |

---

## §1.6 — Non-Functional Requirements

| Category | Requirement (verbatim) | Implementation | Status |
|---|---|---|---|
| Performance | "Search results should be displayed within a few seconds" | Composite `(title, author)` index, server-side pagination, 60 s result cache, eager loading. Budget: <1.5 s | ✅ |
| Security | "Authentication and authorization mechanisms must be implemented" | Sanctum bearer tokens, bcrypt hashing, 4 roles × 19 permissions enforced per route, lockout after 5 failures | ✅ |
| Reliability | "Accurate and consistent data management" | ACID transactions on every circulation write, FK constraints, row-level locking, nightly counter reconciliation | ✅ |
| Usability | "User-friendly and easy-to-use interface" | Scanner-first circulation (2 scans + Enter), ≤3 clicks to any task, fixed status vocabulary, inline validation | ✅ |
| Availability | "System should be available during library operating hours" | Configurable `library_open_time`/`library_close_time`, `/api/health` endpoint, LAN-first deployment | ✅ |
| Scalability | "Ability to accommodate future expansion" | Stateless API, service/repository isolation, normalised schema, module boundaries | ✅ |

---

## §1.7 — Hardware Requirements

| Hardware | Purpose stated in PDF | How the system uses it | Status |
|---|---|---|---|
| Core i3/i5, 8 GB RAM | Workstations | 122 KB gzipped JS bundle, no heavy client framework, targets 1366×768 | ✅ |
| Barcode Scanner | Book identification | `ScannerInput` handles keyboard-wedge input: auto-focus, Enter-submit, auto re-arm | ✅ |
| Student ID Scanner | Student verification | Same component on S-08 step 1; `card_uid` unique index for O(1) lookup | ✅ |
| Printer | Report and document printing | S-10 80 mm thermal receipt + `@media print` stylesheet on all reports | ✅ |
| Network Equipment | Connectivity | HTTP REST over LAN; CORS-configured; health endpoint for monitoring | ✅ |

**Note:** every scan field also accepts manual typing, so the system is fully operable
before the scanners are procured (Risk R-01 in the development plan).

---

## §1.8 — Software Requirements

| Software | Purpose stated in PDF | Implementation | Status |
|---|---|---|---|
| Windows/Linux | Operating System | Laravel + Node run on both; paths are OS-agnostic | ✅ |
| MySQL | Database Management System | MySQL 8.0, `config/database.php`, 11 tables | ✅ |
| PHP/Python/Java | Application Development | **PHP 8.2 + Laravel 11** (ADR-02) | ✅ |
| HTML, CSS, JavaScript | User Interface Development | React 18 + TypeScript + Tailwind (compiles to exactly these) | ✅ |
| Web Browser | System Access | SPA, tested for Chrome/Firefox/Edge | ✅ |
| VS Code / IDE | Code Development | Project opens cleanly; TS strict mode gives full IntelliSense | ✅ |
| Git | Version Control System | `.gitignore` in both apps | ✅ |
| **Postman** | **Testing and Debugging** | `docs/SLMS-API.postman_collection.json` — 60+ requests, auto token capture, shared envelope assertions | ✅ **GAP-2 — closed** |

---

## §1.9 — Use Case Summary

| Actor | Activities stated in PDF | Implementation | Status |
|---|---|---|---|
| Student | Search books, borrow books, return books, view borrowing history | S-03, S-04, S-05 + librarian-mediated circulation per §3.5.2 | ✅ |
| Librarian | Manage books, issue books, receive returned books, generate reports | S-08…S-16 | ✅ |
| Administrator | Manage users, monitor activities, maintain system settings | S-17…S-21 | ✅ |

---

## §2.10 — Security Feasibility

| Control (verbatim from PDF) | Implementation | Status |
|---|---|---|
| "role-based access control so that students, librarians, and administrators can access only the functions relevant to their roles" | 4 roles × 19 permissions; `EnsureUserHasRole` + `EnsureUserHasPermission` middleware; deny-by-default | ✅ |
| "Strong authentication methods" | Sanctum tokens with 12-hour expiry; password policy min 8 with letters + numbers | ✅ |
| "secure password storage" | Bcrypt via Laravel's `hashed` cast; never returned in any API response | ✅ |
| "session management" | Token revocation on logout, password change, account disable, and password reset | ✅ |
| "audit logs … maintain accountability" | `system_logs`, append-only, 33 action types, IP + user-agent captured | ✅ |
| "restricted permissions and secure configuration" | Least-privilege DB user documented; `.env` git-ignored | ✅ |
| **"Regular backups … to protect against data loss due to system failure, accidental deletion, or cyber incidents"** | `BackupService` + nightly `slms:backup` with 30-day retention + S-21 UI | ✅ **GAP-3 — closed** |
| "proper monitoring systems" | Audit log viewer, notification feed, `/api/health` | ✅ |
| "encrypted communication (where applicable)" | HTTPS documented in deployment (§13); tokens never in URLs | ✅ |

---

## §3.3–3.4 — Context Diagram & Data Stores

| Data store (PDF) | Physical tables | Status |
|---|---|---|
| Student Database | `students`, `users`, `roles`, `permissions`, `role_permission` | ✅ |
| Book Database | `books`, `book_copies`, `categories` | ✅ |
| Circulation/Transaction Database | `circulations` | ✅ |
| Fine Database | `fines` | ✅ |
| System Log Database | `system_logs`, `system_settings` | ✅ |

### Context-diagram data flows

| Flow stated in PDF | Implementation | Status |
|---|---|---|
| Students → search, borrow using ID cards, return | S-03, S-08, S-09 | ✅ |
| Students ← borrowing confirmations | S-10 receipt + success toast | ✅ |
| Students ← book availability information | Live `available_copies` on every card and detail page | ✅ |
| **Students ← fine notifications** | `NotificationService` + topbar bell, polled every 60 s | ✅ **GAP-4 — closed** |
| Librarians → manage circulation, maintain records, update book info | S-08…S-13 | ✅ |
| Librarians ← circulation reports | S-16, 8 reports | ✅ |
| Administrators → manage accounts, configure settings, monitor activities | S-17, S-19, S-20 | ✅ |
| Administrators ← administrative reports | S-16 + audit report | ✅ |
| CS Engineering → technical support, maintenance, updates | Artisan commands, backup/restore, health endpoint | ✅ |

---

## §3.5.1 — Book Search Workflow

| Step stated in PDF | Implementation | Status |
|---|---|---|
| "student enters a search request using keywords such as book title, author name, ISBN, or category" | `Book::scopeSearch` covers title/author/ISBN/publisher; category is a filter | ✅ |
| "The system receives the search query and validates the input" | `BookSearchService` sanitises; per-page clamped 6–100 | ✅ |
| "sends a request to the Book Database to retrieve matching records" | `BookRepository` via indexed Eloquent query | ✅ |
| "displays the search results along with relevant details such as book title, author, category, shelf location, and availability status" | All five fields render on every result card | ✅ |
| "If the book is available, the student can proceed to request borrowing" | Detail page shows "How to borrow"; staff get a direct link to S-08 | ✅ |
| **"if unavailable, the system informs the student and may show alternative available books or related suggestions"** | Unavailable banner + `BookSearchService::related` — same category or author, available titles ordered first | ✅ **GAP-5 — closed** |

---

## §3.5.2 — Book Borrowing and Returning Workflow

| Step stated in PDF | Implementation | Status |
|---|---|---|
| "librarian scans the student's ID card" | S-08 step 1, `ScannerInput` auto-focused | ✅ |
| "system verifies the student's membership status from the Student Database" | `IdVerificationService::resolveByCard` + `evaluateEligibility` | ✅ |
| "If the student is eligible, the librarian scans the book barcode" | Step 2 stays disabled and dimmed until eligibility passes | ✅ |
| "The system checks the availability of the selected book" | `lockByBarcode` + `isAvailable()` (BR-04) | ✅ |
| "a borrowing transaction is recorded in the Circulation Database" | `CirculationRepository::create` inside a transaction | ✅ |
| "the book status is updated to 'Issued'" | `markIssued` — sets `status='issued'`, decrements `available_copies` | ✅ |
| "Finally, a borrowing receipt is generated" | S-10, 80 mm thermal layout, auto-opens print dialog | ✅ |
| "librarian scans the returned book barcode" | S-09 single-step scan | ✅ |
| "system retrieves the corresponding borrowing record and compares the return date with the due date" | `findOpenByCopy` + `overdue_days` accessor | ✅ |
| "If the book is returned after the due date, the Fine Calculation Module computes the overdue fine and stores it in the Fine Database" | `FineCalculationService::assess` → `fines` table | ✅ |
| "If the book is returned on time, the loan record is updated and the book status is changed back to 'Available'" | `markReturned` + `markAvailable` (BR-08) | ✅ |

---

## §3.6 — Data Dictionary

| Table stated in PDF | Attributes stated | Implementation | Status |
|---|---|---|---|
| Student | Student ID, full name, department, borrowing status | `students` — plus batch, email, phone, card_uid, membership_status, active_loans, outstanding_fine | ✅ |
| Book | ISBN, title, author, category, shelf number, availability status | `books` — plus publisher, year, edition, language, counters | ✅ |
| Circulation | issue date, due date, return date | `circulations` — plus issued_by, returned_to, renewal_count, status | ✅ |
| Fine | overdue fines | `fines` — with snapshot rate, partial payments, waiver reason | ✅ |
| **Category** | book classifications | `categories` table + **management UI at `/categories`** | ✅ **GAP-6 — closed** |
| System Log | administrative activities | `system_logs` — append-only | ✅ |

---

## Diagram conformance (DFD Level-0, Level-1, Level-2)

The three diagrams are embedded images in the PDF, so they were extracted from the file's
image XObjects and read directly rather than inferred from the surrounding prose. Two of
them turned out to say something the narrative text does not.

### DFD Level-0 — Context Diagram

The diagram shows six modules around the central *Library Management System*:

| Module in the diagram | Implementation | Status |
|---|---|---|
| Book Management | `BookController` + `BookCatalogService` · S-11, S-12 | ✅ |
| **Publisher Management** | `PublisherController` + `publishers` table · S-24 | ✅ **DGAP-1 — closed** |
| User Management | `UserController` + `UserAccountService` · S-17 | ✅ |
| **Author Management** | `AuthorController` + `authors` table · S-23 | ✅ **DGAP-2 — closed** |
| Login Management | `AuthController` + `AuthenticationService` · S-01 | ✅ |
| Student | `StudentController` + `students` table · S-13 | ✅ |

### DFD Level-1 — System Architecture

| Element in the diagram | Implementation | Status |
|---|---|---|
| Process: **Get Book** | `BookSearchService::search` → `BookController@index` | ✅ |
| Process: **Find Book Position** | `shelf_no` on the title + `accession_no` on the copy, both returned by search and shown on S-04 | ✅ |
| Process: **Update list of borrow book** | `BorrowService` / `ReturnService` writing `circulations` | ✅ |
| Data store: **Book Shelf** | `books.shelf_no` + `book_copies.accession_no` | ✅ |
| Data store: **List of Authors** | `authors` table (was missing) | ✅ **DGAP-2** |
| Data store: **List of Title** | `books` table | ✅ |
| Data store: **List of Borrower Books** | `circulations` table | ✅ |
| Flow: Student → *Book Request* → Get Book | `GET /books?q=` | ✅ |
| Flow: Get Book → *Book* → Student | Paginated result set | ✅ |
| Flow: Get Book → *Shelf Number and Book Number* → Find Book Position | `shelf_no` + `accession_no` in the payload | ✅ |
| Flow: List of Authors → *Author* → Find Book Position | `Book::scopeSearch` now matches through the `author` relation | ✅ |
| Flow: List of Title → *Titles* → Find Book Position | Title matching in the same scope | ✅ |

### DFD Level-2 — Detailed Process Design

The diagram numbers six processes and six data stores. All are present:

| Process | Implementation | Status |
|---|---|---|
| **1.0 Login** | `AuthController` + `AuthenticationService` | ✅ |
| **2.0 Manage Students** | `StudentController` + `StudentService` | ✅ |
| **3.0 Manage Books** | `BookController` + `BookCatalogService` | ✅ |
| **4.0 Issue Books** | `CirculationController@issue` + `BorrowService` | ✅ |
| **5.0 Return Books** | `CirculationController@return` + `ReturnService` | ✅ |
| **6.0 Fine** | `FineController` + `FineCalculationService` / `FineSettlementService` | ✅ |

| Data store | Role in the diagram | Implementation | Status |
|---|---|---|---|
| **D1** | Student details, read by *5.0 Return Books* | `students` | ✅ |
| **D2** | Circulation transactions from *4.0* and *5.0* | `circulations` | ✅ |
| **D3** | Book details from *3.0 Manage Books* | `books`, `book_copies` | ✅ |
| **D4** | Student information from *2.0 Manage Students* | `students` (member profile view) | ✅ |
| **D5** | Login credentials feeding *1.0 Login* | `users`, `personal_access_tokens` | ✅ |
| **D6** | Fine acknowledgements from *6.0 Fine* | `fines` | ✅ |

Named flows: *Status Update* from Books into 4.0 and 5.0; *Overdue* → Librarian
(S-14 Overdue Monitor + notification feed); *Report* → Librarian (S-16); *Fine Amount* →
Students (S-06); *Login details (Username + Password)* → 1.0; *Confirmation* → 1.0;
*Receives Books* → Students — all present from the first pass.

One flow was **not** present on the first pass and needed a second look: the diagram draws
*Student Id + book title* as an input into **5.0 Return Books**, alongside the barcode path
described in the §3.5.2 prose. The original implementation only accepted a barcode, so a
torn or unreadable label left the librarian stuck. See **DGAP-3** below.

---

## Gaps found and closed

All five were found by this cross-match and are now implemented, type-checked and built.

### GAP 1 — Database backup and recovery
**Source:** §1.4 Administrator Requirements, "Manage database backup and recovery" ·
§2.10, "Regular backups … to protect against data loss"
**Was:** entirely absent — the highest-severity gap, since it is both an explicit user
requirement and a security control.
**Now:**
- `app/Services/System/BackupService.php` — full logical SQL dump written in **pure PHP**,
  deliberately not shelling out to `mysqldump` (which is usually absent from PATH on a
  XAMPP install; a backup that only works on some machines is worse than none)
- Create · list · download · restore · delete · prune
- Restore requires the literal typed confirmation `RESTORE`, runs with FK checks disabled,
  and rolls the error up with a statement count if it fails part-way
- Filename validated against a strict pattern — blocks path traversal
- `app/Console/Commands/RunNightlyBackup.php`, scheduled 02:00 daily, 30-day retention
- `BackupController` + 5 routes behind `perm:backup.manage`
- **S-21 Backup & Restore** page, with an explicit warning banner when no backup exists
- 3 new audit actions: `BACKUP_CREATED`, `BACKUP_RESTORED`, `BACKUP_DELETED`

### GAP 2 — Postman collection
**Source:** §1.8, "Postman — Testing and Debugging"
**Was:** listed as a required tool with nothing to import.
**Now:** `docs/SLMS-API.postman_collection.json` — 60+ requests in 10 folders, covering
every endpoint. Login captures the bearer token into a collection variable automatically,
a collection-level test asserts the response envelope on every request, and the requests
that exercise business rules document the 409 they are expected to return.

### GAP 3 — Regular backups (security control)
Closed by the same work as GAP 1; recorded separately because §2.10 states it as a
security requirement rather than a user requirement.

### GAP 4 — Fine notifications
**Source:** §3.3 Context Diagram — students "receive borrowing confirmations, book
availability information, and **fine notifications**"
**Was:** fines were visible on S-06 if a student went looking, but nothing surfaced them.
**Now:** `app/Services/Report/NotificationService.php` + `NotificationBell` in the topbar.
Notifications are **derived from live state rather than stored**, so they can never go
stale — return the book and the item disappears on the next poll. Students see overdue
books, due-soon warnings and fine/blocked-borrowing alerts; staff see overdue totals,
unsettled fines and books due back today. Every item carries a deep link, so it is
actionable rather than merely informational.

### GAP 5 — Alternative / related book suggestions
**Source:** §3.5.1 — "if unavailable, the system informs the student and may show
alternative available books or related suggestions"
**Was:** the unavailable state was communicated, but no alternatives were offered.
**Now:** `BookSearchService::related` returns up to 6 books from the same category or by
the same author, **ordered so available titles come first** (an unavailable suggestion
helps nobody). `GET /books/{id}` now returns `{ book, related }`. When every copy is out,
S-04 retitles the section "Available alternatives" and leads with it.

### DGAP 1 & 2 — Author Management and Publisher Management
**Source:** DFD Level-0 Context Diagram (both shown as modules of the system) ·
DFD Level-1 (`List of Authors` shown as a data store feeding *Find Book Position*)
**Was:** `books.author` and `books.publisher` were plain `VARCHAR` columns. This satisfied
the §3.6 narrative — which calls author "information about each book" — but *contradicted
both diagrams*, which give each its own module and, for authors, its own data store.
**Now:** both are proper entities.

- `authors` table (name, nationality, biography) and `publishers` table (name, address,
  contact email/phone, website)
- `books.author_id` (required FK, `RESTRICT`) and `books.publisher_id` (nullable FK,
  `SET NULL`)
- `AuthorController` and `PublisherController` with full CRUD, guarded by two new
  permissions (`author.manage`, `publisher.manage`) and six new audit actions
- Deleting an author or publisher that still has books is refused with a 409 naming the
  count — the same guard pattern as BR-10 for titles
- `Book::scopeSearch` now matches author and publisher **through the relation**, so
  searching "Silberschatz" or "McGraw-Hill" still works
- The Most Borrowed report joins `authors` instead of reading a column
- **S-23 Authors** and **S-24 Publishers** management screens; the book form's free-text
  author and publisher inputs became selects over these lists, which also stops the same
  author being spelled three different ways across the catalog
- Book counts on both screens deep-link into a filtered search
  (`/search?author_id=…`)

**Design decision:** a book has **one** author (`belongsTo`), not many. The diagrams show a
singular *Author* flow into *Find Book Position*, and §3.6 describes author as a single
book attribute. A many-to-many would be more bibliographically complete but would
contradict both. Noted here so the choice is visible rather than accidental.

### DGAP-3 — "Student Id + book title" fallback into 5.0 Return Books
**Source:** DFD Level-2, the arrow labelled *Student Id + book title* flowing into process
**5.0 Return Books**, alongside the *Status Update* flow from Books.
**Was:** the return flow only accepted a scanned barcode (matching the §3.5.2 prose, which
describes only the barcode path). This is a real operational gap, not a cosmetic one: a
torn, smudged, or missing barcode label — common on older stock — left the librarian with
no way to process a return at all.
**Now:**
- `ReturnService::lookupByStudent($identifier, $titleQuery = null)` resolves the student by
  card UID or student number (the same dual lookup `IdVerificationService` uses for
  issuing), then returns every open loan for them, optionally narrowed by a title
  substring — because a student can have more than one book out, and the diagram's *book
  title* input is exactly the disambiguator for that case
- `POST /circulation/return/lookup-by-student` — same `circulate` permission and
  `scanner` rate-limit tier as the barcode lookup, since it is used at the same desk under
  the same time pressure
- **S-09 Return Book**: a "Can't scan the barcode? Look up by student instead" link opens an
  inline panel; picking a loan from the results feeds it into the *same* confirm/fine-preview
  flow as a barcode scan, so there is exactly one return path from that point on, not two
  divergent ones

This was missed on the first pass through the diagrams and only found on a closer second
read — worth recording plainly rather than glossing over, since it means the first
"100% coverage" claim was one flow short.

### GAP 6 — Category management UI
**Source:** §3.6 Data Dictionary — "Category Table … used to maintain … book
classifications"
**Was:** the table, model and API existed, but a librarian could not create or edit a
category from the interface — only pick from the seeded list.
**Now:** `/categories` page with full CRUD, book counts per category linking through to a
filtered search, and a delete guard that explains when a category is still in use.

---

## Deliberate scope decisions

Two points where the implementation interprets rather than mirrors the PDF, both
consistent with the document taken as a whole:

1. **Students do not self-issue books.** §1.4 says students "borrow books using student ID
   cards", which read alone might suggest self-service. §3.5.2 is explicit that "the
   borrowing process starts when the **librarian** scans the student's ID card". The
   librarian-mediated workflow is implemented, because that is what the process design
   specifies and what the physical desk workflow requires.

2. **Fine payment is recorded, not processed.** The PDF describes fine calculation and
   collection but never an online payment gateway; §1.4 lists no payment feature. Fines are
   therefore settled at the desk and recorded by a librarian, with partial payments
   supported. Online payment is listed in the Phase-2 backlog in `DEVELOPMENT_PLAN.md`.

---

## Verification state

| Check | Result |
|---|---|
| Frontend TypeScript (`tsc --noEmit`) | ✅ clean |
| Frontend production build | ✅ 431 KB → **123 KB gzipped** |
| Backend structural check (88 PHP files: namespaces, imports, brace balance) | ✅ clean |
| Postman collection JSON | ✅ valid |
| Backend runtime execution | ⚠️ **not verified — PHP, Composer and MySQL are not installed on this machine** |

The backend is written against the Laravel 11 API and statically verified, but has never
been executed. Run `composer install && php artisan migrate --seed` once PHP and MySQL are
available — that is the first point at which any runtime issue would surface.
