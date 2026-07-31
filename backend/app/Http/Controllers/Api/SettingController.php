<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Services\System\AuditLogService;
use App\Services\System\SettingService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * FR-09 — System settings (Administrator only).
 */
class SettingController extends Controller
{
    public function __construct(
        private SettingService $settings,
        private AuditLogService $audit,
    ) {}

    /** GET /api/admin/settings */
    public function index(): JsonResponse
    {
        $grouped = SystemSetting::where('group', '!=', 'internal')
            ->orderBy('group')
            ->orderBy('setting_id')
            ->get()
            ->groupBy('group')
            ->map(fn ($items) => $items->map(fn (SystemSetting $s) => [
                'key' => $s->key,
                'value' => $s->typed_value,
                'raw' => $s->value,
                'type' => $s->type,
                'label' => $s->label,
                'description' => $s->description,
                'default' => config("library.defaults.{$s->key}"),
            ])->values());

        return $this->ok($grouped);
    }

    /** PUT /api/admin/settings */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings' => ['required', 'array', 'min:1'],
            'settings.*' => ['nullable'],
        ]);

        $editable = SystemSetting::where('group', '!=', 'internal')->pluck('key')->all();
        $incoming = array_intersect_key($data['settings'], array_flip($editable));

        if ($incoming === []) {
            return $this->ok(null, 'No editable settings were supplied.');
        }

        $this->settings->updateMany($incoming);

        $this->audit->record(
            $request->user(),
            AuditAction::SETTING_UPDATED,
            'system_setting',
            null,
            'Updated: '.implode(', ', array_keys($incoming))
        );

        return $this->ok(null, 'Settings saved. Changes apply to new transactions only.');
    }

    /**
     * GET /api/settings/public
     *
     * The handful of policy values the React client needs in order to render
     * accurate hints (loan period, fine rate, currency symbol).
     */
    public function publicSettings(): JsonResponse
    {
        return $this->ok([
            'loan_period_days' => $this->settings->int('loan_period_days', 14),
            'max_books_per_student' => $this->settings->int('max_books_per_student', 3),
            'fine_rate_per_day' => $this->settings->decimal('fine_rate_per_day', 5.00),
            'fine_grace_days' => $this->settings->int('fine_grace_days', 0),
            'fine_max_cap' => $this->settings->decimal('fine_max_cap', 500.00),
            'fine_block_threshold' => $this->settings->decimal('fine_block_threshold', 100.00),
            'max_renewals' => $this->settings->int('max_renewals', 1),
            'currency_symbol' => config('library.currency.symbol'),
            'currency_code' => config('library.currency.code'),
        ]);
    }
}
