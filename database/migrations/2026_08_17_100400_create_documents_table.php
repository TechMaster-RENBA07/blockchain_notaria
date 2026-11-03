<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Registros técnicos de actos notariales extraprotocolarios.
 *
 * Cada fila guarda metadatos de un registro; el archivo original aún no se guarda.
 *
 * content_hash resume los datos del registro, no el archivo original.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();

            // Identificador publico, imposible de adivinar
            $table->uuid('uuid')->unique();

            // Código corto de consulta, por ejemplo NOTA-7K2M-9XQ4.
            $table->string('verification_code', 24)->unique();

            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('document_type_id')->constrained()->restrictOnDelete();
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('signing_key_id')->nullable()->constrained('signing_keys')->nullOnDelete();

            // ---- Persona vinculada al registro ----
            $table->string('holder_name');
            $table->string('holder_identity_number', 40)->nullable();
            $table->string('holder_email')->nullable();

            // ---- Datos de referencia del acto ----
            $table->string('title');
            $table->text('description')->nullable();

            // Campos variables definidos por el tipo de acto.
            $table->json('metadata')->nullable();

            // ---- Huellas digitales (el corazon del anti-falsificacion) ----
            // SHA-256 de los datos, siempre calculado igual
            // Nullable para borradores (drafts), requerido al emitir
            $table->string('content_hash', 64)->nullable()->index();
            // SHA-256 del archivo PDF ya generado
            $table->string('pdf_hash', 64)->nullable();

            // ---- Archivos generados ----
            $table->string('pdf_path')->nullable();
            $table->string('qr_path')->nullable();

            // Firma criptografica en base64
            $table->text('signature')->nullable();

            // draft | issued | revoked | expired
            $table->string('status', 20)->default('draft');

            $table->timestamp('issued_at')->nullable();
            $table->timestamp('expires_at')->nullable();

            // ---- Revocación del registro ----
            $table->timestamp('revoked_at')->nullable();
            $table->string('revocation_reason')->nullable();
            $table->foreignId('revoked_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['institution_id', 'status']);
            $table->index(['holder_identity_number']);
            $table->index(['status', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
