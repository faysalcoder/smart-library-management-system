<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'fine_id' => $this->fine_id,
            'circulation_id' => $this->circulation_id,
            'student_id' => $this->student_id,
            'overdue_days' => (int) $this->overdue_days,
            'rate_per_day' => (float) $this->rate_per_day,
            'amount' => (float) $this->amount,
            'paid_amount' => (float) $this->paid_amount,
            'balance' => $this->balance,
            'status' => $this->status,
            'waive_reason' => $this->waive_reason,
            'settled_at' => $this->settled_at?->toDateTimeString(),
            'created_at' => $this->created_at?->toDateTimeString(),
            'student' => $this->whenLoaded('student', fn () => [
                'student_id' => $this->student->student_id,
                'student_no' => $this->student->student_no,
                'full_name' => $this->student->full_name,
                'department' => $this->student->department,
            ]),
            'book_title' => $this->whenLoaded(
                'circulation',
                fn () => $this->circulation?->copy?->book?->title
            ),
            'collected_by' => $this->whenLoaded('collectedBy', fn () => $this->collectedBy?->full_name),
            'waived_by' => $this->whenLoaded('waivedBy', fn () => $this->waivedBy?->full_name),
        ];
    }
}
