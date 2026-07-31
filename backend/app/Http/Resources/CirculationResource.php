<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CirculationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'circulation_id' => $this->circulation_id,
            'issue_date' => $this->issue_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'return_date' => $this->return_date?->toDateString(),
            'renewal_count' => (int) $this->renewal_count,
            'status' => $this->status,
            'overdue_days' => $this->overdue_days,
            'is_overdue' => $this->is_overdue,
            'remarks' => $this->remarks,
            'student' => $this->whenLoaded('student', fn () => [
                'student_id' => $this->student->student_id,
                'student_no' => $this->student->student_no,
                'full_name' => $this->student->full_name,
                'department' => $this->student->department,
                'batch' => $this->student->batch,
                'phone' => $this->student->phone,
                'email' => $this->student->email,
                'photo_url' => $this->student->photo_url,
                'outstanding_fine' => (float) $this->student->outstanding_fine,
            ]),
            'copy' => $this->whenLoaded('copy', fn () => [
                'copy_id' => $this->copy->copy_id,
                'accession_no' => $this->copy->accession_no,
                'barcode' => $this->copy->barcode,
                'status' => $this->copy->status,
                'title' => $this->copy->book?->title,
                'author' => $this->copy->book?->relationLoaded('author')
                    ? $this->copy->book->author?->name
                    : null,
                'isbn' => $this->copy->book?->isbn,
                'shelf_no' => $this->copy->book?->shelf_no,
                'cover_image' => $this->copy->book?->cover_image,
                'category' => $this->copy->book?->relationLoaded('category')
                    ? $this->copy->book->category?->name
                    : null,
            ]),
            'issued_by' => $this->whenLoaded('issuedBy', fn () => $this->issuedBy?->full_name),
            'returned_to' => $this->whenLoaded('returnedTo', fn () => $this->returnedTo?->full_name),
            'fine' => $this->whenLoaded('fine', fn () => $this->fine ? new FineResource($this->fine) : null),
        ];
    }
}
