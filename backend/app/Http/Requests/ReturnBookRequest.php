<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReturnBookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('circulate') ?? false;
    }

    public function rules(): array
    {
        return [
            'barcode' => ['required', 'string', 'max:64'],
        ];
    }

    public function messages(): array
    {
        return [
            'barcode.required' => 'Scan the barcode on the returned book.',
        ];
    }
}
