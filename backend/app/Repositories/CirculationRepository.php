<?php

namespace App\Repositories;

use App\Models\Circulation;
use App\Repositories\Contracts\CirculationRepositoryInterface;
use App\Support\Status;

class CirculationRepository implements CirculationRepositoryInterface
{
    public function create(array $attributes): Circulation
    {
        return Circulation::create($attributes);
    }

    public function openLoanCountFor(int $studentId): int
    {
        return Circulation::where('student_id', $studentId)
            ->whereIn('status', Status::CIRC_OPEN)
            ->count();
    }

    public function findOpenByCopy(int $copyId): ?Circulation
    {
        return Circulation::with(['student', 'copy.book.author'])
            ->where('copy_id', $copyId)
            ->whereIn('status', Status::CIRC_OPEN)
            ->latest('circulation_id')
            ->first();
    }

    public function markReturned(Circulation $circulation, int $librarianId): void
    {
        $circulation->status = Status::CIRC_RETURNED;
        $circulation->return_date = now()->toDateString();
        $circulation->returned_to = $librarianId;
        $circulation->save();
    }
}
