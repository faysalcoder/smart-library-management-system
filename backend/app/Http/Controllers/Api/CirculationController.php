<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IssueBookRequest;
use App\Http\Requests\ReturnBookRequest;
use App\Http\Resources\CirculationResource;
use App\Http\Resources\FineResource;
use App\Models\Circulation;
use App\Services\Circulation\BorrowService;
use App\Services\Circulation\ReturnService;
use App\Services\Member\IdVerificationService;
use App\Support\Status;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CirculationController extends Controller
{
    public function __construct(
        private BorrowService $borrow,
        private ReturnService $returns,
        private IdVerificationService $verifier,
    ) {}

    /**
     * POST /api/circulation/verify-card — FR-10
     *
     * Step 1 of the Issue screen: resolve the scanned card and report
     * eligibility without changing anything.
     */
    public function verifyCard(Request $request): JsonResponse
    {
        $data = $request->validate([
            'card_uid' => ['required', 'string', 'max:64'],
        ]);

        $student = $this->verifier->resolveByCard($data['card_uid'], $request->user());
        $eligibility = $this->verifier->evaluateEligibility($student);

        return $this->ok([
            'student' => [
                'student_id' => $student->student_id,
                'student_no' => $student->student_no,
                'full_name' => $student->full_name,
                'department' => $student->department,
                'batch' => $student->batch,
                'photo_url' => $student->photo_url,
                'membership_status' => $student->membership_status,
                'borrow_status' => $student->borrow_status,
                'outstanding_fine' => (float) $student->outstanding_fine,
                'enrolled_on' => $student->enrolled_on?->toDateString(),
            ],
            'eligibility' => $eligibility,
        ]);
    }

    /** POST /api/circulation/issue — FR-03 */
    public function issue(IssueBookRequest $request): JsonResponse
    {
        $circulation = $this->borrow->issue(
            $request->validated('card_uid'),
            $request->validated('barcode'),
            $request->user(),
        );

        return $this->created(
            new CirculationResource($circulation),
            'Book issued successfully.'
        );
    }

    /**
     * POST /api/circulation/return/lookup — FR-04
     *
     * Preview: finds the open loan for a scanned barcode and computes the fine
     * that WOULD be charged, without committing the return.
     */
    public function returnLookup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'barcode' => ['required', 'string', 'max:64'],
        ]);

        $result = $this->returns->lookup($data['barcode']);

        return $this->ok([
            'circulation' => new CirculationResource($result['circulation']),
            'fine_preview' => $result['fine_preview'],
        ]);
    }

    /**
     * POST /api/circulation/return/lookup-by-student
     *
     * DFD Level-2 process 5.0 shows a second input path: "Student Id + book
     * title". This is the fallback for a torn or unreadable barcode label —
     * the librarian identifies the student instead, and picks the matching
     * loan from their open loans.
     */
    public function returnLookupByStudent(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identifier' => ['required', 'string', 'max:64'],
            'title' => ['nullable', 'string', 'max:200'],
        ], [
            'identifier.required' => "Enter the student's ID card number or student number.",
        ]);

        $result = $this->returns->lookupByStudent($data['identifier'], $data['title'] ?? null);

        return $this->ok([
            'student' => [
                'student_id' => $result['student']->student_id,
                'student_no' => $result['student']->student_no,
                'full_name' => $result['student']->full_name,
                'department' => $result['student']->department,
            ],
            'loans' => array_map(fn ($row) => [
                'circulation' => new CirculationResource($row['circulation']),
                'fine_preview' => $row['fine_preview'],
            ], $result['loans']),
        ]);
    }

    /** POST /api/circulation/return — FR-04 / FR-05 */
    public function return(ReturnBookRequest $request): JsonResponse
    {
        $result = $this->returns->return(
            $request->validated('barcode'),
            $request->user(),
        );

        return $this->ok([
            'circulation' => new CirculationResource($result['circulation']),
            'fine' => $result['fine'] ? new FineResource($result['fine']) : null,
        ], $result['fine']
            ? 'Book returned. An overdue fine has been recorded.'
            : 'Book returned on time. No fine.');
    }

    /** POST /api/circulation/{circulation}/renew — BR-14 */
    public function renew(Request $request, Circulation $circulation): JsonResponse
    {
        $circulation = $this->borrow->renew($circulation, $request->user());

        return $this->ok(new CirculationResource($circulation), 'Loan renewed.');
    }

    /** GET /api/circulation — full circulation history with filters */
    public function index(Request $request): JsonResponse
    {
        $query = Circulation::with(['student', 'copy.book.author', 'issuedBy', 'fine'])
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('student_id'), fn ($q, $id) => $q->where('student_id', $id))
            ->when($request->boolean('overdue_only'), fn ($q) => $q->overdue())
            ->between($request->query('from'), $request->query('to'), 'issue_date');

        if ($term = $request->query('q')) {
            // Wrapped so the OR does not escape the AND group built by the
            // filters above (which would widen the result set incorrectly).
            $query->where(function ($outer) use ($term) {
                $outer->whereHas('student', fn ($q) => $q->search($term))
                    ->orWhereHas('copy.book.author', fn ($q) => $q->search($term));
            });
        }

        $page = $query->orderByDesc('circulation_id')
            ->paginate(min(100, (int) $request->query('per_page', 25)));

        return $this->paginated($page, CirculationResource::collection($page->getCollection())->resolve());
    }

    /** GET /api/circulation/overdue — FR-05 / S-14 */
    public function overdue(Request $request): JsonResponse
    {
        $page = Circulation::with(['student', 'copy.book.author', 'fine'])
            ->overdue()
            ->when($request->query('department'), fn ($q, $d) => $q->whereHas('student', fn ($s) => $s->where('department', $d)))
            ->orderBy('due_date')
            ->paginate(min(200, (int) $request->query('per_page', 50)));

        return $this->paginated($page, CirculationResource::collection($page->getCollection())->resolve());
    }

    /** GET /api/circulation/{circulation} — used by the receipt screen */
    public function show(Circulation $circulation): JsonResponse
    {
        $circulation->load(['student', 'copy.book.category', 'copy.book.author', 'issuedBy', 'returnedTo', 'fine']);

        return $this->ok(new CirculationResource($circulation));
    }

    /** GET /api/my/loans — the signed-in student's own loans */
    public function myLoans(Request $request): JsonResponse
    {
        $student = $request->user()->student;

        if (! $student) {
            return $this->ok(['current' => [], 'history' => []]);
        }

        $current = Circulation::with(['copy.book.category', 'copy.book.author', 'fine'])
            ->where('student_id', $student->student_id)
            ->open()
            ->orderBy('due_date')
            ->get();

        $history = Circulation::with(['copy.book.category', 'copy.book.author', 'fine'])
            ->where('student_id', $student->student_id)
            ->whereNotIn('status', Status::CIRC_OPEN)
            ->orderByDesc('return_date')
            ->limit(50)
            ->get();

        return $this->ok([
            'current' => CirculationResource::collection($current)->resolve(),
            'history' => CirculationResource::collection($history)->resolve(),
        ]);
    }
}
