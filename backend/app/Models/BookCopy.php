<?php

namespace App\Models;

use App\Support\Status;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BookCopy extends Model
{
    use HasFactory;

    protected $primaryKey = 'copy_id';

    protected $fillable = [
        'book_id', 'accession_no', 'barcode', 'status', 'condition', 'acquired_on',
    ];

    protected function casts(): array
    {
        return ['acquired_on' => 'date'];
    }

    // ---- Relationships ---------------------------------------------------

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class, 'book_id');
    }

    public function circulations(): HasMany
    {
        return $this->hasMany(Circulation::class, 'copy_id');
    }

    public function activeCirculation()
    {
        return $this->hasOne(Circulation::class, 'copy_id')
            ->whereIn('status', Status::CIRC_OPEN)
            ->latestOfMany('circulation_id');
    }

    // ---- Scopes ----------------------------------------------------------

    public function scopeAvailable($query)
    {
        return $query->where('status', Status::COPY_AVAILABLE);
    }

    // ---- Domain helpers --------------------------------------------------

    /** BR-04 — only an available copy can be issued. */
    public function isAvailable(): bool
    {
        return $this->status === Status::COPY_AVAILABLE;
    }

    public function isOnLoan(): bool
    {
        return $this->status === Status::COPY_ISSUED;
    }
}
