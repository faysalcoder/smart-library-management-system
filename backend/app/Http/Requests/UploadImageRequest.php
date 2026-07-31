<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // per-route permission middleware already gates this
    }

    public function rules(): array
    {
        return [
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'], // 5 MB
        ];
    }

    public function messages(): array
    {
        return [
            'image.image' => 'Upload an image file (JPEG, PNG or WebP).',
            'image.mimes' => 'Upload a JPEG, PNG or WebP image.',
            'image.max' => 'Images must be 5 MB or smaller.',
        ];
    }
}
