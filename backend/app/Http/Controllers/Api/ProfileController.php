<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\StudentResource;
use App\Services\Member\StudentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Self-service account maintenance for the signed-in student. Deliberately
 * narrower than StudentController — a student may edit their own contact
 * details, never their student_no, card_uid, membership status, or fines.
 */
class ProfileController extends Controller
{
    public function __construct(private StudentService $students) {}

    /** GET /api/my/profile */
    public function show(Request $request): JsonResponse
    {
        $student = $request->user()->student;

        if (! $student) {
            throw new DomainException('No student profile is linked to this account.', [], 404);
        }

        return $this->ok(new StudentResource($student));
    }

    /** PUT /api/my/profile */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $student = $request->user()->student;

        $student = $this->students->updateOwnProfile($student, $request->validated());

        return $this->ok(new StudentResource($student), 'Profile updated.');
    }
}
