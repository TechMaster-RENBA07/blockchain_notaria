<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Oficinas notariales que usan el sistema.
 *
 * Usuarios, registros y claves se asocian a una oficina.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('institutions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            // Código interno corto de la oficina.
            $table->string('code', 20)->unique();
            $table->string('name');
            $table->string('legal_name')->nullable();
            $table->string('tax_id', 30)->nullable();  // NIT

            $table->string('email');
            $table->string('phone', 30)->nullable();
            $table->string('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('country', 2)->default('PE');
            $table->string('website')->nullable();

            // Ruta del logo dentro de storage/app/public
            $table->string('logo_path')->nullable();

            $table->boolean('is_active')->default(true);

            // Preferencias sueltas sin tener que crear columnas nuevas
            $table->json('settings')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('institutions');
    }
};
