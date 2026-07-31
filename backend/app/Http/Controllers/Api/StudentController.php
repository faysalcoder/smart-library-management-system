<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStudentRequest;
use App\Http\Requests\UpdateStudentRequest;
use App\Http\Resources\CirculationResource;
use App\Http\Resources\FineResource;
use App\Http\Resources\StudentResource;
use App\Models\Student;
use App\Services\Member\StudentService;
use App\Support\Status;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function __construct(private StudentService $students) {}

    /** GET /api/students — FR-07 */
    public function index(Request $request): JsonResponse
    {
        $page = Student::query()
            ->search($request->query('q'))
            ->when($request->query('department'), fn ($q, $d) => $q->where('department', $d))
            ->when($request->query('membership_status'), fn ($q, $s) => $q->where('membership_status', $s))
            ->when($request->boolean('with_fines'), fn ($q) => $q->where('outstanding_fine', '>', 0))
            ->orderBy('full_name')
            ->paginate(min(100, (int) $request->query('per_page', 25)));

        return $this->paginated($page, StudentResource::collection($page->getCollection())->resolve());
    }

    /** GET /api/students/{student} — profile with loans and fines */
    public function show(Student $student): JsonResponse
    {
        $loans = $student->circulations()
            ->with(['copy.book.author', 'fine'])
            ->orderByDesc('circulation_id')
            ->limit(50)
            ->get();

        $fines = $student->fines()
            ->with('circulation.copy.book.author')
            ->orderByDesc('fine_id')
            ->get();

        return $this->ok([
            'student' => new StudentResource($student),
            'loans' => CirculationResource::collection($loans)->resolve(),
            'fines' => FineResource::collection($fines)->resolve(),
            'summary' => [
                'total_loans' => $student->circulations()->count(),
                'active_loans' => $student->circulations()->whereIn('status', Status::CIRC_OPEN)->count(),
                'outstanding_fine' => (float) $student->outstanding_fine,
            ],
        ]);
    }

    /** POST /api/students */
    public function store(StoreStudentRequest $request): JsonResponse
    {
        $student = $this->students->create($request->validated(), $request->user());

        return $this->created(new StudentResource($student), 'Student registered.');
    }

    /** PUT /api/students/{student} */
    public function update(UpdateStudentRequest $request, Student $student): JsonResponse
    {
        $student = $this->students->update($student, $request->validated(), $request->user());

        return $this->ok(new StudentResource($student), 'Student updated.');
    }

    /** DELETE /api/students/{student} */
    public function destroy(Request $request, Student $student): JsonResponse
    {
        $this->students->delete($student, $request->user());

        return $this->ok(null, 'Student removed.');
    }

    /** POST /api/students/{student}/bind-card — FR-10 registration */
    public function bindCard(Request $request, Student $student): JsonResponse
    {
        $data = $request->validate([
            'card_uid' => ['required', 'string', 'max:64'],
        ]);

        $student = $this->students->bindCard($student, $data['card_uid'], $request->user());

        return $this->ok(new StudentResource($student), 'ID card registered to this student.');
    }

    /** PATCH /api/students/{student}/membership */
    public function setMembership(Request $request, Student $student): JsonResponse
    {
        $data = $request->validate([
            'membership_status' => ['required', Rule::in(Status::MEMBER_ALL)],
        ]);

        $student = $this->students->setMembershipStatus(
            $student,
            $data['membership_status'],
            $request->user()
        );

        return $this->ok(new StudentResource($student), 'Membership status updated.');
    }

    /** GET /api/students/departments — filter options */
    public function departments(): JsonResponse
    {
        return $this->ok(
            Student::query()->distinct()->orderBy('department')->pluck('department')
        );
    }
}
