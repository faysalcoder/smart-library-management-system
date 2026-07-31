<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('book.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'isbn' => ['required', 'string', 'max:20', 'unique:books,isbn'],
            'title' => ['required', 'string', 'max:200'],
            'author_id' => ['required', 'exists:authors,author_id'],
            'publisher_id' => ['nullable', 'exists:publishers,publisher_id'],
            'publication_year' => ['nullable', 'integer', 'min:1400', 'max:'.(date('Y') + 1)],
            'edition' => ['nullable', 'string', 'max:30'],
            'category_id' => ['required', 'exists:categories,category_id'],
            'shelf_no' => ['nullable', 'string', 'max:30'],
            'language' => ['nullable', 'string', 'max:30'],
            'description' => ['nullable', 'string', 'max:2000'],
            'cover_image' => ['nullable', 'string', 'max:255'],
            'initial_copies' => ['nullable', 'integer', 'min:0', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'isbn.unique' => 'A book with this ISBN already exists in the catalog.',
            'category_id.exists' => 'Select a valid category.',
            'author_id.required' => 'Select an author. If they are not listed, add them in Author Management first.',
            'author_id.exists' => 'Select a valid author.',
            'publisher_id.exists' => 'Select a valid publisher.',
        ];
    }
}
