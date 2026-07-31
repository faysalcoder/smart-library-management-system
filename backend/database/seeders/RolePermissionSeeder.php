<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Support\Permissions;
use App\Support\Roles;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $descriptions = [
            Roles::STUDENT => 'Library member — search, borrow and view own records',
            Roles::LIBRARIAN => 'Circulation desk — books, members, issue/return, reports',
            Roles::ADMIN => 'Full system administration',
            Roles::MANAGEMENT => 'Read-only reporting and analytics',
        ];

        foreach ($descriptions as $name => $description) {
            Role::updateOrCreate(['name' => $name], ['description' => $description]);
        }

        foreach (Permissions::CATALOGUE as $code => $description) {
            Permission::updateOrCreate(['code' => $code], ['description' => $description]);
        }

        foreach (Permissions::BY_ROLE as $roleName => $codes) {
            $role = Role::where('name', $roleName)->first();
            $ids = Permission::whereIn('code', $codes)->pluck('permission_id');

            $role->permissions()->sync($ids);
        }

        $this->command->info('Seeded '.count($descriptions).' roles and '.count(Permissions::CATALOGUE).' permissions.');
    }
}
