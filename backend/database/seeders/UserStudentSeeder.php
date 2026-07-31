<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Student;
use App\Models\User;
use App\Support\Roles;
use App\Support\Status;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserStudentSeeder extends Seeder
{
    public function run(): void
    {
        $roleIds = Role::pluck('role_id', 'name');

        // ---- Staff accounts ------------------------------------------------
        $staff = [
            [
                'username' => 'admin',
                'email' => 'admin@wub.edu.bd',
                'full_name' => 'System Administrator',
                'role' => Roles::ADMIN,
            ],
            [
                'username' => 'librarian',
                'email' => 'rafiq.hasan@wub.edu.bd',
                'full_name' => 'Rafiq Hasan',
                'role' => Roles::LIBRARIAN,
            ],
            [
                'username' => 'management',
                'email' => 'management@wub.edu.bd',
                'full_name' => 'Md. Raihanul Haque',
                'role' => Roles::MANAGEMENT,
            ],
        ];

        foreach ($staff as $person) {
            User::updateOrCreate(
                ['username' => $person['username']],
                [
                    'email' => $person['email'],
                    'full_name' => $person['full_name'],
                    'password' => Hash::make('Password123'),
                    'role_id' => $roleIds[$person['role']],
                    'status' => Status::USER_ACTIVE,
                    'must_change_password' => false,
                ]
            );
        }

        // ---- Students ------------------------------------------------------
        $students = [
            ['student_no' => '4018', 'full_name' => 'Sowmika Islam Suchi', 'department' => 'Computer Science & Engineering', 'batch' => '66A', 'email' => 'sowmika.4018@wub.edu.bd', 'phone' => '01711-000418'],
            ['student_no' => '3927', 'full_name' => 'Tanvir Ahmed', 'department' => 'Computer Science & Engineering', 'batch' => '65B', 'email' => 'tanvir.3927@wub.edu.bd', 'phone' => '01711-003927'],
            ['student_no' => '4102', 'full_name' => 'Nusrat Jahan', 'department' => 'Business Administration', 'batch' => '67A', 'email' => 'nusrat.4102@wub.edu.bd', 'phone' => '01711-004102'],
            ['student_no' => '3855', 'full_name' => 'Mehedi Hasan', 'department' => 'Electrical & Electronic Engineering', 'batch' => '64C', 'email' => 'mehedi.3855@wub.edu.bd', 'phone' => '01711-003855'],
            ['student_no' => '4210', 'full_name' => 'Farhana Akter', 'department' => 'Computer Science & Engineering', 'batch' => '67B', 'email' => 'farhana.4210@wub.edu.bd', 'phone' => '01711-004210'],
            ['student_no' => '3990', 'full_name' => 'Rakibul Islam', 'department' => 'Mathematics', 'batch' => '65A', 'email' => 'rakibul.3990@wub.edu.bd', 'phone' => '01711-003990'],
            ['student_no' => '4055', 'full_name' => 'Sadia Rahman', 'department' => 'Business Administration', 'batch' => '66B', 'email' => 'sadia.4055@wub.edu.bd', 'phone' => '01711-004055'],
            ['student_no' => '4177', 'full_name' => 'Imran Kabir', 'department' => 'Computer Science & Engineering', 'batch' => '67A', 'email' => 'imran.4177@wub.edu.bd', 'phone' => '01711-004177'],
        ];

        foreach ($students as $index => $data) {
            // The first student also gets a login so the student UI is testable.
            $userId = null;

            if ($index === 0) {
                $user = User::updateOrCreate(
                    ['username' => 'student'],
                    [
                        'email' => $data['email'],
                        'full_name' => $data['full_name'],
                        'password' => Hash::make('Password123'),
                        'role_id' => $roleIds[Roles::STUDENT],
                        'status' => Status::USER_ACTIVE,
                        'must_change_password' => false,
                    ]
                );

                $userId = $user->user_id;
            }

            Student::updateOrCreate(
                ['student_no' => $data['student_no']],
                $data + [
                    'user_id' => $userId,
                    // The card UID mirrors the student number in the demo data so
                    // a librarian without a scanner can simply type it.
                    'card_uid' => 'WUB-'.$data['student_no'],
                    'membership_status' => Status::MEMBER_ACTIVE,
                    'borrow_status' => Status::BORROW_ELIGIBLE,
                    'enrolled_on' => now()->subYears(rand(1, 3))->toDateString(),
                ]
            );
        }

        $this->command->info('Seeded '.count($staff).' staff accounts and '.count($students).' students.');
        $this->command->warn('Default password for every seeded account: Password123');
    }
}
