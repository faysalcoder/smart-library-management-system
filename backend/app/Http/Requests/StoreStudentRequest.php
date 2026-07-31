<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('student.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'student_no' => ['required', 'string', 'max:20', 'unique:students,student_no'],
            'full_name' => ['required', 'string', 'max:120'],
            'department' => ['required', 'string', 'max:80'],
            'batch' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:120'],
            'phone' => ['nullable', 'string', 'max:20'],
            'card_uid' => ['nullable', 'string', 'max:64', 'unique:students,card_uid'],
            'enrolled_on' => ['nullable', 'date'],
            'photo_url' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'student_no.unique' => 'A student with this ID number is already registered.',
            'card_uid.unique' => 'That ID card is already registered to another student.',
        ];
    }
}
