<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'user_id' => $this->user_id,
            'username' => $this->username,
            'email' => $this->email,
            'full_name' => $this->full_name,
            'status' => $this->status,
            'avatar_url' => $this->avatar_url,
            'must_change_password' => (bool) $this->must_change_password,
            'last_login_at' => $this->last_login_at?->toDateTimeString(),
            'role' => $this->whenLoaded('role', fn () => [
                'role_id' => $this->role->role_id,
                'name' => $this->role->name,
                'description' => $this->role->description,
            ]),
            'permissions' => $this->whenLoaded('role', fn () => $this->permissionCodes()),
            'student' => $this->whenLoaded('student', fn () => $this->student ? [
                'student_id' => $this->student->student_id,
                'student_no' => $this->student->student_no,
                'department' => $this->student->department,
                'batch' => $this->student->batch,
                'membership_status' => $this->student->membership_status,
                'borrow_status' => $this->student->borrow_status,
                'outstanding_fine' => (float) $this->student->outstanding_fine,
            ] : null),
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
