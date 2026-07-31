<?php

namespace App\Services\System;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;

/**
 * Single source of truth for library policy (FR-09).
 *
 * No business rule may read config('library.defaults') directly — those are
 * only fallbacks used when a key has not yet been seeded.
 */
class SettingService
{
    private const CACHE_KEY = 'slms.settings';

    private const CACHE_TTL = 300; // 5 minutes

    /** @return array<string,string> */
    public function all(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return SystemSetting::query()->pluck('value', 'key')->all();
        });
    }

    public function raw(string $key, mixed $fallback = null): mixed
    {
        $value = $this->all()[$key] ?? null;

        if ($value !== null) {
            return $value;
        }

        return $fallback ?? config("library.defaults.{$key}");
    }

    public function int(string $key, ?int $fallback = null): int
    {
        return (int) $this->raw($key, $fallback);
    }

    public function decimal(string $key, ?float $fallback = null): float
    {
        return (float) $this->raw($key, $fallback);
    }

    public function bool(string $key, ?bool $fallback = null): bool
    {
        return filter_var($this->raw($key, $fallback), FILTER_VALIDATE_BOOLEAN);
    }

    public function string(string $key, ?string $fallback = null): string
    {
        return (string) $this->raw($key, $fallback);
    }

    /** @param array<string,mixed> $values */
    public function updateMany(array $values): void
    {
        foreach ($values as $key => $value) {
            SystemSetting::where('key', $key)->update([
                'value' => is_bool($value) ? ($value ? '1' : '0') : (string) $value,
            ]);
        }

        $this->flush();
    }

    public function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
