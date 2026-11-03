<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tipos de acto notarial extraprotocolario.
 *
 * Es como el "molde" del que salen los documentos reales.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_types', function (Blueprint $table) {
            $table->id();

            // Si es null, el tipo esta disponible para todas las instituciones
            $table->foreignId('institution_id')
                ->nullable()
                ->constrained()
                ->cascadeOnDelete();

            $table->string('code', 40);
            $table->string('name');
            $table->text('description')->nullable();

            // Vista Blade de la constancia técnica.
            $table->string('template_view')->default('pdf.default');

            // Cuantos meses vale. null = no caduca nunca.
            $table->unsignedSmallInteger('validity_months')->nullable();

            $table->boolean('requires_signature')->default(true);
            $table->boolean('is_active')->default(true);

            // Campos extra que pide este tipo, ej: {"carrera": "texto", "nota": "numero"}
            $table->json('schema')->nullable();

            $table->timestamps();

            $table->unique(['institution_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_types');
    }
};
