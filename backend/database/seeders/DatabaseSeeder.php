<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            SettingSeeder::class,
            UserStudentSeeder::class,
            CatalogSeeder::class,
            CirculationSeeder::class,
        ]);

        $this->command->newLine();
        $this->command->info('===========================================');
        $this->command->info('  SLMS database ready.');
        $this->command->info('===========================================');
        $this->command->line('  admin       / Password123   (Administrator)');
        $this->command->line('  librarian   / Password123   (Librarian)');
        $this->command->line('  student     / Password123   (Student — Sowmika, ID 4018)');
        $this->command->line('  management  / Password123   (Management, read-only)');
        $this->command->newLine();
        $this->command->line('  Demo card IDs: WUB-4018, WUB-3927, WUB-4102 …');
        $this->command->line('  Demo barcodes: ACC-00001 … ACC-00075');
        $this->command->newLine();
    }
}
