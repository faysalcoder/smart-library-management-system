<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('circulations', function (Blueprint $table) {
            $table->id('circulation_id');
            // RESTRICT on both: borrowing history must survive record cleanup.
            $table->foreignId('student_id')->constrained('students', 'student_id')->restrictOnDelete();
            $table->foreignId('copy_id')->constrained('book_copies', 'copy_id')->restrictOnDelete();
            $table->foreignId('issued_by')->constrained('users', 'user_id')->restrictOnDelete();
            $table->foreignId('returned_to')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->date('issue_date');
            $table->date('due_date');
            $table->date('return_date')->nullable();
            $table->unsignedTinyInteger('renewal_count')->default(0);
            $table->string('status', 20)->default('issued');  // issued | returned | overdue | lost
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'status'], 'idx_circ_active');
            $table->index(['due_date', 'status'], 'idx_circ_due');
            $table->index('copy_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circulations');
    }
};
