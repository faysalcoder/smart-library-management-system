<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\FineResource;
use App\Models\Fine;
use App\Services\Fine\FineSettlementService;
use App\Support\Status;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FineController extends Controller
{
    public function __construct(private FineSettlementService $settlement) {}

    /** GET /api/fines — FR-05 */
    public function index(Request $request): JsonResponse
    {
        $query = Fine::with(['student', 'circulation.copy.book.author', 'collectedBy', 'waivedBy'])
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->boolean('outstanding_only'), fn ($q) => $q->outstanding())
            ->when($request->query('student_id'), fn ($q, $id) => $q->where('student_id', $id));

        if ($term = $request->query('q')) {
            $query->whereHas('student', fn ($q) => $q->search($term));
        }

        $page = $query->orderByDesc('fine_id')
            ->paginate(min(100, (int) $request->query('per_page', 25)));

        $summary = [
            'outstanding_total' => round((float) Fine::outstanding()->sum(DB::raw('amount - paid_amount')), 2),
            'outstanding_count' => Fine::outstanding()->count(),
            'collected_total' => round((float) Fine::sum('paid_amount'), 2),
        ];

        return response()->json([
            'ok' => true,
            'data' => FineResource::collection($page->getCollection())->resolve(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'summary' => $summary,
            ],
            'message' => null,
            'errors' => (object) [],
        ]);
    }

    /** GET /api/fines/{fine} */
    public function show(Fine $fine): JsonResponse
    {
        $fine->load(['student', 'circulation.copy.book.author', 'collectedBy', 'waivedBy']);

        return $this->ok(new FineResource($fine));
    }

    /** POST /api/fines/{fine}/collect */
    public function collect(Request $request, Fine $fine): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $fine = $this->settlement->collect($fine, (float) $data['amount'], $request->user());

        return $this->ok(new FineResource($fine), 'Payment recorded.');
    }

    /** POST /api/fines/{fine}/waive — BR-09, admin only */
    public function waive(Request $request, Fine $fine): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:200'],
        ], [
            'reason.required' => 'A reason is required in order to waive a fine.',
        ]);

        $fine = $this->settlement->waive($fine, $data['reason'], $request->user());

        return $this->ok(new FineResource($fine), 'Fine waived.');
    }

    /** GET /api/my/fines — the signed-in student's own fines */
    public function myFines(Request $request): JsonResponse
    {
        $student = $request->user()->student;

        if (! $student) {
            return $this->ok(['fines' => [], 'summary' => ['outstanding' => 0.0, 'paid' => 0.0]]);
        }

        $fines = Fine::with('circulation.copy.book.author')
            ->where('student_id', $student->student_id)
            ->orderByDesc('fine_id')
            ->get();

        return $this->ok([
            'fines' => FineResource::collection($fines)->resolve(),
            'summary' => [
                'outstanding' => (float) $student->outstanding_fine,
                'paid' => round((float) $fines->sum('paid_amount'), 2),
                'count' => $fines->count(),
            ],
        ]);
    }

    /** GET /api/fines/statuses — filter options */
    public function statuses(): JsonResponse
    {
        return $this->ok(Status::FINE_ALL);
    }
}
