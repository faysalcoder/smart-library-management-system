<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('book.manage') ?? false;
    }

    public function rules(): array
    {
        $bookId = $this->route('book')?->book_id;

        return [
            'isbn' => ['sometimes', 'string', 'max:20', Rule::unique('books', 'isbn')->ignore($bookId, 'book_id')],
            'title' => ['sometimes', 'string', 'max:200'],
            'author_id' => ['sometimes', 'exists:authors,author_id'],
            'publisher_id' => ['nullable', 'exists:publishers,publisher_id'],
            'publication_year' => ['nullable', 'integer', 'min:1400', 'max:'.(date('Y') + 1)],
            'edition' => ['nullable', 'string', 'max:30'],
            'category_id' => ['sometimes', 'exists:categories,category_id'],
            'shelf_no' => ['nullable', 'string', 'max:30'],
            'language' => ['nullable', 'string', 'max:30'],
            'description' => ['nullable', 'string', 'max:2000'],
            'cover_image' => ['nullable', 'string', 'max:255'],
        ];
    }
}
