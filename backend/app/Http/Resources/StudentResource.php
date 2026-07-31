<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'student_id' => $this->student_id,
            'student_no' => $this->student_no,
            'full_name' => $this->full_name,
            'department' => $this->department,
            'batch' => $this->batch,
            'email' => $this->email,
            'phone' => $this->phone,
            'card_uid' => $this->card_uid,
            'has_card' => $this->card_uid !== null,
            'membership_status' => $this->membership_status,
            'borrow_status' => $this->borrow_status,
            'active_loans' => (int) $this->active_loans,
            'outstanding_fine' => (float) $this->outstanding_fine,
            'enrolled_on' => $this->enrolled_on?->toDateString(),
            'photo_url' => $this->photo_url,
            'user_id' => $this->user_id,
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
