<?php

namespace App\Repositories\Contracts;

use App\Models\Student;

interface StudentRepositoryInterface
{
    public function findByCardUid(string $cardUid): ?Student;

    public function findByStudentNo(string $studentNo): ?Student;

    public function incrementLoans(Student $student): void;

    public function decrementLoans(Student $student): void;

    /** Recomputes outstanding_fine from the fines ledger and re-evaluates BR-03. */
    public function refreshFinancials(Student $student): void;
}
