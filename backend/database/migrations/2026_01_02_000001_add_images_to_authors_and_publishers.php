<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the image fields needed for the author photo / publisher logo upload
 * feature. `books.cover_image` already exists (2026_01_01_000005).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('authors', function (Blueprint $table) {
            $table->string('photo', 255)->nullable()->after('biography');
        });

        Schema::table('publishers', function (Blueprint $table) {
            $table->string('logo', 255)->nullable()->after('website');
        });
    }

    public function down(): void
    {
        Schema::table('authors', function (Blueprint $table) {
            $table->dropColumn('photo');
        });

        Schema::table('publishers', function (Blueprint $table) {
            $table->dropColumn('logo');
        });
    }
};
