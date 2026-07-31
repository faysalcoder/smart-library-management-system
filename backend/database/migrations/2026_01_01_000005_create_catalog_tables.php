<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id('category_id');
            $table->string('name', 80)->unique();
            $table->string('code', 20)->unique();
            $table->string('description', 200)->nullable();
            $table->timestamps();
        });

        Schema::create('books', function (Blueprint $table) {
            $table->id('book_id');
            $table->string('isbn', 20)->unique();
            $table->string('title', 200);
            // DFD L-0 "Author Management" / L-1 "List of Authors" — authors and
            // publishers are entities, not free text (see migration …_000004).
            $table->foreignId('author_id')->constrained('authors', 'author_id')->restrictOnDelete();
            $table->foreignId('publisher_id')->nullable()->constrained('publishers', 'publisher_id')->nullOnDelete();
            $table->smallInteger('publication_year')->nullable();
            $table->string('edition', 30)->nullable();
            $table->foreignId('category_id')->constrained('categories', 'category_id')->restrictOnDelete();
            $table->string('shelf_no', 30)->nullable();
            $table->string('language', 30)->default('English');
            $table->text('description')->nullable();
            // Denormalised counters (ADR-09) — reconciled nightly by
            // App\Console\Commands\RecalculateCounters.
            $table->unsignedSmallInteger('total_copies')->default(0);
            $table->unsignedSmallInteger('available_copies')->default(0);
            $table->unsignedInteger('borrow_count')->default(0);
            $table->string('cover_image', 255)->nullable();
            $table->timestamps();

            // Performance NFR — search must return in under 1.5 s.
            $table->index('title');
            $table->index('author_id');
            $table->index('publisher_id');
            $table->index('category_id');
        });

        Schema::create('book_copies', function (Blueprint $table) {
            $table->id('copy_id');
            // RESTRICT: a title with physical copies cannot be deleted (BR-10).
            $table->foreignId('book_id')->constrained('books', 'book_id')->restrictOnDelete();
            $table->string('accession_no', 30)->unique();
            $table->string('barcode', 64)->unique();
            $table->string('status', 20)->default('available');  // available | issued | reserved | lost | damaged | withdrawn
            $table->string('condition', 20)->default('good');    // new | good | fair | poor
            $table->date('acquired_on')->nullable();
            $table->timestamps();

            $table->index(['book_id', 'status'], 'idx_copy_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('book_copies');
        Schema::dropIfExists('books');
        Schema::dropIfExists('categories');
    }
};
