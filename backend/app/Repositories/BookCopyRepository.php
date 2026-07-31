<?php

namespace App\Repositories;

use App\Models\BookCopy;
use App\Repositories\Contracts\BookCopyRepositoryInterface;
use App\Support\Status;

class BookCopyRepository implements BookCopyRepositoryInterface
{
    public function findByBarcode(string $barcode): ?BookCopy
    {
        return BookCopy::with('book.category', 'book.author')
            ->where('barcode', $barcode)
            ->orWhere('accession_no', $barcode)
            ->first();
    }

    public function lockByBarcode(string $barcode): ?BookCopy
    {
        return BookCopy::where('barcode', $barcode)
            ->orWhere('accession_no', $barcode)
            ->lockForUpdate()
            ->first();
    }

    public function markIssued(BookCopy $copy): void
    {
        $copy->status = Status::COPY_ISSUED;
        $copy->save();

        $copy->book()->decrement('available_copies');
        $copy->book()->increment('borrow_count');
    }

    public function markAvailable(BookCopy $copy): void
    {
        $copy->status = Status::COPY_AVAILABLE;
        $copy->save();

        $copy->book()->increment('available_copies');
    }

    public function availableCountForBook(int $bookId): int
    {
        return BookCopy::where('book_id', $bookId)
            ->where('status', Status::COPY_AVAILABLE)
            ->count();
    }
}
