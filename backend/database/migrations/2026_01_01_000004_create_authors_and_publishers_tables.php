<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * DFD Level-0 (Context Diagram) shows "Author Management" and "Publisher
 * Management" as first-class modules of the Library Management System, and
 * DFD Level-1 shows "List of Authors" as a distinct data store feeding the
 * "Find Book Position" process.
 *
 * They are therefore modelled as their own entities rather than as free-text
 * columns on `books`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('authors', function (Blueprint $table) {
            $table->id('author_id');
            $table->string('name', 150)->unique();
            $table->string('nationality', 80)->nullable();
            $table->text('biography')->nullable();
            $table->timestamps();

            $table->index('name');
        });

        Schema::create('publishers', function (Blueprint $table) {
            $table->id('publisher_id');
            $table->string('name', 150)->unique();
            $table->string('address', 200)->nullable();
            $table->string('contact_email', 120)->nullable();
            $table->string('contact_phone', 30)->nullable();
            $table->string('website', 150)->nullable();
            $table->timestamps();

            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('publishers');
        Schema::dropIfExists('authors');
    }
};
