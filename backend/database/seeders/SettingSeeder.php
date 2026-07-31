<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // group: circulation
            ['key' => 'loan_period_days', 'value' => '14', 'type' => 'int', 'group' => 'circulation', 'label' => 'Loan period (days)', 'description' => 'How long a book may be kept before it becomes overdue.'],
            ['key' => 'max_books_per_student', 'value' => '3', 'type' => 'int', 'group' => 'circulation', 'label' => 'Maximum books per student', 'description' => 'Concurrent loan limit for one member.'],
            ['key' => 'max_renewals', 'value' => '1', 'type' => 'int', 'group' => 'circulation', 'label' => 'Maximum renewals', 'description' => 'How many times a single loan may be renewed.'],

            // group: fines
            ['key' => 'fine_rate_per_day', 'value' => '5.00', 'type' => 'decimal', 'group' => 'fines', 'label' => 'Fine rate per day', 'description' => 'Amount charged for each chargeable overdue day.'],
            ['key' => 'fine_grace_days', 'value' => '0', 'type' => 'int', 'group' => 'fines', 'label' => 'Grace period (days)', 'description' => 'Overdue days before fines begin to accrue.'],
            ['key' => 'fine_max_cap', 'value' => '500.00', 'type' => 'decimal', 'group' => 'fines', 'label' => 'Maximum fine per loan', 'description' => 'Ceiling on the fine for a single transaction.'],
            ['key' => 'fine_block_threshold', 'value' => '100.00', 'type' => 'decimal', 'group' => 'fines', 'label' => 'Borrowing block threshold', 'description' => 'Outstanding fine above which a member cannot borrow.'],

            // group: hours
            ['key' => 'library_open_time', 'value' => '08:00', 'type' => 'string', 'group' => 'hours', 'label' => 'Opening time', 'description' => 'Daily opening time of the library.'],
            ['key' => 'library_close_time', 'value' => '20:00', 'type' => 'string', 'group' => 'hours', 'label' => 'Closing time', 'description' => 'Daily closing time of the library.'],

            // group: security
            ['key' => 'session_timeout_minutes', 'value' => '30', 'type' => 'int', 'group' => 'security', 'label' => 'Session timeout (minutes)', 'description' => 'Idle time before a session expires.'],
            ['key' => 'max_failed_logins', 'value' => '5', 'type' => 'int', 'group' => 'security', 'label' => 'Failed sign-in limit', 'description' => 'Failed attempts before an account is locked.'],

            // internal (hidden from the settings screen)
            ['key' => 'accession_sequence', 'value' => '1', 'type' => 'int', 'group' => 'internal', 'label' => 'Accession sequence', 'description' => 'Internal counter for accession number generation.'],
        ];

        foreach ($settings as $setting) {
            SystemSetting::updateOrCreate(['key' => $setting['key']], $setting);
        }

        $this->command->info('Seeded '.count($settings).' system settings.');
    }
}
