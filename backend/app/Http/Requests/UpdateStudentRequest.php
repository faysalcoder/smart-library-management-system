<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('student.manage') ?? false;
    }

    public function rules(): array
    {
        $studentId = $this->route('student')?->student_id;

        return [
            'student_no' => ['sometimes', 'string', 'max:20', Rule::unique('students', 'student_no')->ignore($studentId, 'student_id')],
            'full_name' => ['sometimes', 'string', 'max:120'],
            'department' => ['sometimes', 'string', 'max:80'],
            'batch' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:120'],
            'phone' => ['nullable', 'string', 'max:20'],
            'card_uid' => ['nullable', 'string', 'max:64', Rule::unique('students', 'card_uid')->ignore($studentId, 'student_id')],
            'enrolled_on' => ['nullable', 'date'],
            'photo_url' => ['nullable', 'string', 'max:255'],
        ];
    }
}
