<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AuthorController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\BookController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CirculationController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FineController;
use App\Http\Controllers\Api\PublisherController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\SystemLogController;
use App\Http\Controllers\Api\UserController;
use App\Support\Permissions as P;
use App\Support\Roles as R;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| SLMS RESTful API
|--------------------------------------------------------------------------
| Every route below is guarded by Sanctum + RBAC. The permission codes match
| the matrix in SYSTEM_ARCHITECTURE.md §12.1.
*/

// ---- Public -----------------------------------------------------------------

Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:login')
    ->name('auth.login');

Route::get('/health', fn () => response()->json([
    'ok' => true,
    'data' => ['service' => 'SLMS API', 'time' => now()->toDateTimeString()],
    'message' => 'Service is healthy.',
    'errors' => (object) [],
]));

// ---- Authenticated ----------------------------------------------------------

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {

    // Session -----------------------------------------------------------------
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/notifications', [DashboardController::class, 'notifications']);
    Route::get('/settings/public', [SettingController::class, 'publicSettings']);

    // Catalog: read (FR-02) ---------------------------------------------------
    Route::middleware('perm:'.P::BOOK_SEARCH)->group(function () {
        Route::get('/books', [BookController::class, 'index']);
        Route::get('/books/suggest', [BookController::class, 'suggest']);
        Route::get('/books/{book}', [BookController::class, 'show']);
        Route::get('/categories', [CategoryController::class, 'index']);
        // DFD L-0 "Author Management" / "Publisher Management" — readable by
        // anyone who can search, so the catalog can be browsed by author.
        Route::get('/authors', [AuthorController::class, 'index']);
        Route::get('/authors/{author}', [AuthorController::class, 'show']);
        Route::get('/publishers', [PublisherController::class, 'index']);
        Route::get('/publishers/{publisher}', [PublisherController::class, 'show']);
    });

    // Catalog: write (FR-06) --------------------------------------------------
    Route::middleware('perm:'.P::BOOK_MANAGE)->group(function () {
        Route::post('/books', [BookController::class, 'store']);
        Route::put('/books/{book}', [BookController::class, 'update']);
        Route::delete('/books/{book}', [BookController::class, 'destroy']);
    });

    Route::middleware('perm:'.P::COPY_MANAGE)->group(function () {
        Route::get('/books/{book}/copies', [BookController::class, 'copies']);
        Route::post('/books/{book}/copies', [BookController::class, 'addCopies']);
        Route::put('/copies/{copy}', [BookController::class, 'updateCopy']);
        Route::delete('/copies/{copy}', [BookController::class, 'destroyCopy']);
    });

    Route::middleware('perm:'.P::CATEGORY_MANAGE)->group(function () {
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
    });

    Route::middleware('perm:'.P::AUTHOR_MANAGE)->group(function () {
        Route::post('/authors', [AuthorController::class, 'store']);
        Route::put('/authors/{author}', [AuthorController::class, 'update']);
        Route::delete('/authors/{author}', [AuthorController::class, 'destroy']);
    });

    Route::middleware('perm:'.P::PUBLISHER_MANAGE)->group(function () {
        Route::post('/publishers', [PublisherController::class, 'store']);
        Route::put('/publishers/{publisher}', [PublisherController::class, 'update']);
        Route::delete('/publishers/{publisher}', [PublisherController::class, 'destroy']);
    });

    // Members (FR-07) ---------------------------------------------------------
    Route::middleware('perm:'.P::STUDENT_VIEW)->group(function () {
        Route::get('/students', [StudentController::class, 'index']);
        Route::get('/students/departments', [StudentController::class, 'departments']);
        Route::get('/students/{student}', [StudentController::class, 'show']);
    });

    Route::middleware('perm:'.P::STUDENT_MANAGE)->group(function () {
        Route::post('/students', [StudentController::class, 'store']);
        Route::put('/students/{student}', [StudentController::class, 'update']);
        Route::delete('/students/{student}', [StudentController::class, 'destroy']);
        Route::post('/students/{student}/bind-card', [StudentController::class, 'bindCard']);
        Route::patch('/students/{student}/membership', [StudentController::class, 'setMembership']);
    });

    // Circulation (FR-03, FR-04, FR-10) --------------------------------------
    Route::middleware('perm:'.P::CIRCULATE)->group(function () {
        // Scanner endpoints get a higher rate limit — the desk fires these fast.
        Route::middleware('throttle:scanner')->group(function () {
            Route::post('/circulation/verify-card', [CirculationController::class, 'verifyCard']);
            Route::get('/copies/lookup/{barcode}', [BookController::class, 'lookupByBarcode']);
            Route::post('/circulation/return/lookup', [CirculationController::class, 'returnLookup']);
            // DFD L-2 fallback path: "Student Id + book title" into 5.0 Return Books.
            Route::post('/circulation/return/lookup-by-student', [CirculationController::class, 'returnLookupByStudent']);
        });

        Route::post('/circulation/issue', [CirculationController::class, 'issue']);
        Route::post('/circulation/return', [CirculationController::class, 'return']);
        Route::post('/circulation/{circulation}/renew', [CirculationController::class, 'renew']);
    });

    Route::middleware('perm:'.P::LOAN_VIEW)->group(function () {
        Route::get('/circulation', [CirculationController::class, 'index']);
        Route::get('/circulation/overdue', [CirculationController::class, 'overdue']);
        Route::get('/circulation/{circulation}', [CirculationController::class, 'show']);
    });

    // Student self-service ----------------------------------------------------
    Route::middleware('role:'.R::STUDENT)->group(function () {
        Route::get('/my/loans', [CirculationController::class, 'myLoans']);
        Route::get('/my/fines', [FineController::class, 'myFines']);
    });

    // Fines (FR-05) -----------------------------------------------------------
    Route::middleware('perm:'.P::FINE_VIEW)->group(function () {
        Route::get('/fines', [FineController::class, 'index']);
        Route::get('/fines/statuses', [FineController::class, 'statuses']);
        Route::get('/fines/{fine}', [FineController::class, 'show']);
    });

    Route::post('/fines/{fine}/collect', [FineController::class, 'collect'])
        ->middleware('perm:'.P::FINE_COLLECT);

    // BR-09 — waiving is administrator-only.
    Route::post('/fines/{fine}/waive', [FineController::class, 'waive'])
        ->middleware('perm:'.P::FINE_WAIVE);

    // Reports (FR-08) ---------------------------------------------------------
    Route::middleware('perm:'.P::REPORT_VIEW)->group(function () {
        Route::get('/reports', [ReportController::class, 'index']);
        Route::get('/reports/{key}', [ReportController::class, 'show']);
    });

    Route::get('/reports/{key}/export', [ReportController::class, 'export'])
        ->middleware('perm:'.P::REPORT_EXPORT);

    // Administration (FR-09) --------------------------------------------------
    Route::prefix('admin')->group(function () {

        Route::middleware('perm:'.P::USER_MANAGE)->group(function () {
            Route::get('/users', [UserController::class, 'index']);
            Route::post('/users', [UserController::class, 'store']);
            Route::get('/users/{user}', [UserController::class, 'show']);
            Route::put('/users/{user}', [UserController::class, 'update']);
            Route::patch('/users/{user}/status', [UserController::class, 'setStatus']);
            Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);
            Route::delete('/users/{user}', [UserController::class, 'destroy']);
        });

        Route::get('/roles', [UserController::class, 'roles'])
            ->middleware('perm:'.P::ROLE_MANAGE);

        Route::middleware('perm:'.P::SETTING_MANAGE)->group(function () {
            Route::get('/settings', [SettingController::class, 'index']);
            Route::put('/settings', [SettingController::class, 'update']);
        });

        Route::middleware('perm:'.P::LOG_VIEW)->group(function () {
            Route::get('/logs', [SystemLogController::class, 'index']);
            Route::get('/logs/actions', [SystemLogController::class, 'actions']);
        });

        // Database backup and recovery — §1.4 Administrator Requirements.
        Route::middleware('perm:'.P::BACKUP_MANAGE)->group(function () {
            Route::get('/backups', [BackupController::class, 'index']);
            Route::post('/backups', [BackupController::class, 'store']);
            Route::get('/backups/{filename}/download', [BackupController::class, 'download']);
            Route::post('/backups/{filename}/restore', [BackupController::class, 'restore']);
            Route::delete('/backups/{filename}', [BackupController::class, 'destroy']);
        });
    });
});
