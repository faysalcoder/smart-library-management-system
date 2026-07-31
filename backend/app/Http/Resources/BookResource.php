<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'book_id' => $this->book_id,
            'isbn' => $this->isbn,
            'title' => $this->title,
            // Flattened names keep the client simple; the ids drive the form
            // selects and the "browse by author" filter.
            'author' => $this->whenLoaded('author', fn () => $this->author?->name),
            'author_id' => $this->author_id,
            'publisher' => $this->whenLoaded('publisher', fn () => $this->publisher?->name),
            'publisher_id' => $this->publisher_id,
            'publication_year' => $this->publication_year,
            'edition' => $this->edition,
            'shelf_no' => $this->shelf_no,
            'language' => $this->language,
            'description' => $this->description,
            'cover_image' => $this->cover_image,
            'total_copies' => (int) $this->total_copies,
            'available_copies' => (int) $this->available_copies,
            'on_loan' => max(0, (int) $this->total_copies - (int) $this->available_copies),
            'is_available' => (int) $this->available_copies > 0,
            'borrow_count' => (int) $this->borrow_count,
            'category' => $this->whenLoaded('category', fn () => [
                'category_id' => $this->category?->category_id,
                'name' => $this->category?->name,
                'code' => $this->category?->code,
            ]),
            'category_id' => $this->category_id,
            'copies' => BookCopyResource::collection($this->whenLoaded('copies')),
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
