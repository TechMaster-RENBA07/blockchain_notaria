<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Amplia la tabla de usuarios que trae Laravel de fabrica.
 *
 * Le agregamos: a que institucion pertenece, que rol tiene
 * y algunos datos de contacto.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('institution_id')
                ->nullable()
                ->after('id')
                ->constrained('institutions')
                ->nullOnDelete();

            // admin | issuer | auditor | viewer
            $table->string('role', 20)->default('viewer')->after('password');

            $table->string('position', 120)->nullable()->after('role');
            $table->string('phone', 30)->nullable()->after('position');
            $table->boolean('is_active')->default(true)->after('phone');
            $table->timestamp('last_login_at')->nullable()->after('is_active');
        });

        // SQLite no permite crear indices dentro del mismo Schema::table
        // cuando se agregan columnas, asi que va en un bloque aparte.
        Schema::table('users', function (Blueprint $table) {
            $table->index(['institution_id', 'role']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['institution_id', 'role']);
            $table->dropConstrainedForeignId('institution_id');
            $table->dropColumn(['role', 'position', 'phone', 'is_active', 'last_login_at']);
        });
    }
};
