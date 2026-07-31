<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class IssueBookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('circulate') ?? false;
    }

    public function rules(): array
    {
        return [
            'card_uid' => ['required', 'string', 'max:64'],
            'barcode' => ['required', 'string', 'max:64'],
        ];
    }

    public function messages(): array
    {
        return [
            'card_uid.required' => 'Scan the student ID card first.',
            'barcode.required' => 'Scan the book barcode.',
        ];
    }
}
