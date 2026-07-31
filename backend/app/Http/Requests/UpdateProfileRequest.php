<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->student !== null;
    }

    public function rules(): array
    {
        $studentId = $this->user()->student->student_id;
        $userId = $this->user()->user_id;

        return [
            'full_name' => ['required', 'string', 'max:120'],
            'email' => [
                'required', 'email', 'max:120',
                Rule::unique('users', 'email')->ignore($userId, 'user_id'),
                Rule::unique('students', 'email')->ignore($studentId, 'student_id'),
            ],
            'phone' => ['nullable', 'string', 'max:20'],
            'department' => ['required', 'string', 'max:80'],
        ];
    }
}
