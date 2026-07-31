<?php

namespace App\Services\System;

use App\Models\SystemLog;
use App\Models\User;
use Illuminate\Support\Facades\Request;

/**
 * BR-12 — every write operation produces an audit entry.
 */
class AuditLogService
{
    public function record(
        ?User $actor,
        string $action,
        ?string $entityType = null,
        ?int $entityId = null,
        ?string $detail = null,
    ): SystemLog {
        return SystemLog::create([
            'user_id' => $actor?->user_id,
            'actor_name' => $actor?->full_name ?? 'System',
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'detail' => $detail,
            'ip_address' => Request::ip(),
            'user_agent' => substr((string) Request::userAgent(), 0, 255),
            'created_at' => now(),
        ]);
    }

    /** Records an action attributed to an unauthenticated or unknown actor. */
    public function recordAnonymous(string $action, ?string $detail = null): SystemLog
    {
        return $this->record(null, $action, null, null, $detail);
    }
}
