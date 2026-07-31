<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fines', function (Blueprint $table) {
            $table->id('fine_id');
            // CASCADE: a fine has no meaning without its circulation record.
            $table->foreignId('circulation_id')->unique()->constrained('circulations', 'circulation_id')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students', 'student_id')->restrictOnDelete();
            $table->unsignedSmallInteger('overdue_days');
            // The rate is SNAPSHOT on the row (ADR-08) so that changing the
            // policy rate never retroactively alters a historical fine.
            $table->decimal('rate_per_day', 6, 2);
            $table->decimal('amount', 10, 2);
            $table->decimal('paid_amount', 10, 2)->default(0);
            $table->string('status', 20)->default('pending');  // pending | partial | paid | waived
            $table->foreignId('collected_by')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->foreignId('waived_by')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->string('waive_reason', 200)->nullable();
            $table->timestamp('settled_at')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'status'], 'idx_fine_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fines');
    }
};
