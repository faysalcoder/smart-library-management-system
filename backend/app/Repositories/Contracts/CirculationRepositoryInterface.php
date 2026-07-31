<?php

namespace App\Repositories\Contracts;

use App\Models\Circulation;

interface CirculationRepositoryInterface
{
    public function create(array $attributes): Circulation;

    public function openLoanCountFor(int $studentId): int;

    public function findOpenByCopy(int $copyId): ?Circulation;

    public function markReturned(Circulation $circulation, int $librarianId): void;
}
