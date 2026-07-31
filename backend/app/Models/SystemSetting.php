<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    use HasFactory;

    protected $primaryKey = 'setting_id';

    protected $fillable = ['key', 'value', 'type', 'group', 'label', 'description'];

    /** Casts the stored string into its declared type. */
    public function getTypedValueAttribute(): mixed
    {
        return match ($this->type) {
            'int' => (int) $this->value,
            'decimal' => (float) $this->value,
            'bool' => filter_var($this->value, FILTER_VALIDATE_BOOLEAN),
            default => $this->value,
        };
    }
}
