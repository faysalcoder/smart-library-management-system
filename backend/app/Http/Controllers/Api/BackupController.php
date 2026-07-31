<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\System\BackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * FR-09 / §1.4 — "Manage database backup and recovery" (Administrator only).
 */
class BackupController extends Controller
{
    public function __construct(private BackupService $backups) {}

    /** GET /api/admin/backups */
    public function index(): JsonResponse
    {
        $files = $this->backups->list();

        return $this->ok([
            'backups' => $files,
            'summary' => [
                'count' => count($files),
                'latest' => $files[0]['created_at'] ?? null,
                'total_size' => array_sum(array_column($files, 'size')),
            ],
        ]);
    }

    /** POST /api/admin/backups */
    public function store(Request $request): JsonResponse
    {
        $result = $this->backups->create($request->user());

        return $this->created($result, "Backup created ({$result['size_label']}).");
    }

    /** GET /api/admin/backups/{filename}/download */
    public function download(string $filename): BinaryFileResponse
    {
        return response()->download($this->backups->path($filename), $filename, [
            'Content-Type' => 'application/sql',
        ]);
    }

    /**
     * POST /api/admin/backups/{filename}/restore
     *
     * Destructive — requires an explicit typed confirmation so it cannot be
     * triggered by a stray click or a replayed request.
     */
    public function restore(Request $request, string $filename): JsonResponse
    {
        $request->validate([
            'confirm' => ['required', 'in:RESTORE'],
        ], [
            'confirm.required' => 'Type RESTORE to confirm this destructive action.',
            'confirm.in' => 'Type RESTORE exactly to confirm this destructive action.',
        ]);

        $result = $this->backups->restore($filename, $request->user());

        return $this->ok(
            $result,
            'Database restored. All users have been signed out — please sign in again.'
        );
    }

    /** DELETE /api/admin/backups/{filename} */
    public function destroy(Request $request, string $filename): JsonResponse
    {
        $this->backups->delete($filename, $request->user());

        return $this->ok(null, 'Backup deleted.');
    }
}
