<?php

namespace App\Repositories\Contracts;

use App\Models\BookCopy;

interface BookCopyRepositoryInterface
{
    public function findByBarcode(string $barcode): ?BookCopy;

    /**
     * Fetches the copy with a row-level lock so two librarians scanning the
     * same book at the same moment cannot both succeed (ADR-12 / BR-04).
     * Must be called inside a transaction.
     */
    public function lockByBarcode(string $barcode): ?BookCopy;

    public function markIssued(BookCopy $copy): void;

    public function markAvailable(BookCopy $copy): void;

    public function availableCountForBook(int $bookId): int;
}
