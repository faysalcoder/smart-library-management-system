<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Report\ReportingService;
use App\Services\System\AuditLogService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * FR-08 — Report generation. Read-only throughout (BR-15).
 */
class ReportController extends Controller
{
    public function __construct(
        private ReportingService $reports,
        private AuditLogService $audit,
    ) {}

    /** GET /api/reports — the Reports Hub catalogue */
    public function index(): JsonResponse
    {
        return $this->ok($this->reports->catalogue());
    }

    /** GET /api/reports/{key} */
    public function show(Request $request, string $key): JsonResponse
    {
        return $this->ok($this->build($request, $key));
    }

    /** GET /api/reports/{key}/export?format=csv */
    public function export(Request $request, string $key): StreamedResponse
    {
        $report = $this->build($request, $key);
        $rows = collect($report['rows'] ?? []);

        $this->audit->record(
            $request->user(),
            AuditAction::REPORT_EXPORTED,
            'report',
            null,
            "Exported the \"{$key}\" report as CSV"
        );

        $filename = sprintf('slms-%s-%s.csv', $key, now()->format('Ymd-His'));

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');

            // BOM so Excel opens UTF-8 (and the ৳ symbol) correctly.
            fwrite($out, chr(0xEF).chr(0xBB).chr(0xBF));

            if ($rows->isEmpty()) {
                fputcsv($out, ['No data for the selected parameters']);
                fclose($out);

                return;
            }

            $first = (array) $rows->first();
            fputcsv($out, array_map(
                fn ($h) => ucwords(str_replace('_', ' ', $h)),
                array_keys($first)
            ));

            foreach ($rows as $row) {
                fputcsv($out, array_values((array) $row));
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /** Dispatches to the right report builder. */
    private function build(Request $request, string $key): array
    {
        $from = $request->query('from');
        $to = $request->query('to');

        return match ($key) {
            'circulation' => $this->reports->circulationSummary($from, $to),
            'overdue' => $this->reports->overdue($request->query('as_of')),
            'fines' => $this->reports->fineCollection($from, $to),
            'inventory' => $this->reports->inventory($request->query('category_id')),
            'popular' => $this->reports->mostBorrowed($from, $to, (int) $request->query('limit', 20)),
            'student-activity' => $this->reports->studentActivity($request->query('student_id'), $from, $to),
            'department' => $this->reports->departmentUsage($from, $to),
            'daily' => $this->reports->dailyCirculation($request->query('date')),
            default => abort(404, "Unknown report \"{$key}\"."),
        };
    }
}
