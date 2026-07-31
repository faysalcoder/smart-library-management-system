<?php

/**
 * Library policy defaults.
 *
 * These are FALLBACKS only. The live values are stored in the `system_settings`
 * table and are editable by an Administrator at runtime (FR-09), which is why
 * no business rule may read this file directly — everything goes through
 * App\Services\System\SettingService.
 */
return [
    'defaults' => [
        'loan_period_days' => (int) env('LIBRARY_LOAN_PERIOD_DAYS', 14),
        'max_books_per_student' => (int) env('LIBRARY_MAX_BOOKS_PER_STUDENT', 3),
        'fine_rate_per_day' => (float) env('LIBRARY_FINE_RATE_PER_DAY', 5.00),
        'fine_grace_days' => (int) env('LIBRARY_FINE_GRACE_DAYS', 0),
        'fine_max_cap' => (float) env('LIBRARY_FINE_MAX_CAP', 500.00),
        'fine_block_threshold' => (float) env('LIBRARY_FINE_BLOCK_THRESHOLD', 100.00),
        'max_renewals' => (int) env('LIBRARY_MAX_RENEWALS', 1),
        'library_open_time' => '08:00',
        'library_close_time' => '20:00',
        'session_timeout_minutes' => 30,
        'max_failed_logins' => 5,
    ],

    'currency' => [
        'code' => 'BDT',
        'symbol' => '৳',
    ],

    /** Statuses are validated at the application layer (see App\Support\Status). */
    'statuses' => [
        'copy' => ['available', 'issued', 'reserved', 'lost', 'damaged', 'withdrawn'],
        'circulation' => ['issued', 'returned', 'overdue', 'lost'],
        'fine' => ['pending', 'partial', 'paid', 'waived'],
        'membership' => ['active', 'suspended', 'expired'],
        'user' => ['active', 'inactive', 'locked'],
    ],
];
