<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookCopyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'copy_id' => $this->copy_id,
            'book_id' => $this->book_id,
            'accession_no' => $this->accession_no,
            'barcode' => $this->barcode,
            'status' => $this->status,
            'condition' => $this->condition,
            'acquired_on' => $this->acquired_on?->toDateString(),
            'book' => $this->whenLoaded('book', fn () => [
                'book_id' => $this->book->book_id,
                'title' => $this->book->title,
                'author' => $this->book->relationLoaded('author') ? $this->book->author?->name : null,
                'isbn' => $this->book->isbn,
                'shelf_no' => $this->book->shelf_no,
                'cover_image' => $this->book->cover_image,
                'category' => $this->book->relationLoaded('category') ? $this->book->category?->name : null,
            ]),
        ];
    }
}
