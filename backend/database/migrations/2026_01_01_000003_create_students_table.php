<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id('student_id');
            $table->string('student_no', 20)->unique();
            $table->foreignId('user_id')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->string('full_name', 120);
            $table->string('department', 80);
            $table->string('batch', 20)->nullable();
            $table->string('email', 120)->nullable();
            $table->string('phone', 20)->nullable();
            // FR-10 — the scanned student ID card identifier.
            $table->string('card_uid', 64)->nullable()->unique();
            $table->string('membership_status', 20)->default('active');  // active | suspended | expired
            $table->string('borrow_status', 20)->default('eligible');    // eligible | blocked
            $table->unsignedTinyInteger('active_loans')->default(0);
            $table->decimal('outstanding_fine', 10, 2)->default(0);
            $table->date('enrolled_on')->nullable();
            $table->string('photo_url', 255)->nullable();
            $table->timestamps();

            $table->index('department');
            $table->index('membership_status');
            $table->index('full_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
