<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/**
 * Public student self-registration. Deliberately asks for only what a new
 * member can actually supply themselves — no student_no or card_uid, which
 * are assigned once the university/library has verified them.
 */
class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:120', 'unique:users,email', 'unique:students,email'],
            'phone' => ['nullable', 'string', 'max:20'],
            'department' => ['required', 'string', 'max:80'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'An account with this email already exists. Try signing in instead.',
            'department.required' => 'Enter your institute or department.',
            'password.confirmed' => 'The two passwords do not match.',
        ];
    }
}
