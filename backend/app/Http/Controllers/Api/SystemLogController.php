<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemLog;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use ReflectionClass;

/**
 * Audit log viewer (S-20). Read-only by design — the table is append-only.
 */
class SystemLogController extends Controller
{
    /** GET /api/admin/logs */
    public function index(Request $request): JsonResponse
    {
        $page = SystemLog::with('user')
            ->filter($request->only(['action', 'user_id', 'from', 'to', 'q']))
            ->orderByDesc('log_id')
            ->paginate(min(200, (int) $request->query('per_page', 50)));

        $rows = $page->getCollection()->map(fn (SystemLog $l) => [
            'log_id' => $l->log_id,
            'action' => $l->action,
            'actor' => $l->actor_name ?? $l->user?->full_name ?? 'System',
            'user_id' => $l->user_id,
            'entity_type' => $l->entity_type,
            'entity_id' => $l->entity_id,
            'detail' => $l->detail,
            'ip_address' => $l->ip_address,
            'created_at' => $l->created_at?->toDateTimeString(),
        ])->all();

        return $this->paginated($page, $rows);
    }

    /** GET /api/admin/logs/actions — filter options */
    public function actions(): JsonResponse
    {
        $constants = (new ReflectionClass(AuditAction::class))->getConstants();

        return $this->ok(array_values($constants));
    }
}
