<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Llaves de firma digital de cada institucion.
 *
 * IMPORTANTE: aqui NO se guarda la llave privada.
 * Solo se guarda la RUTA al archivo (que vive en storage/keys/, fuera de Git)
 * y la llave publica, que si puede ser vista por cualquiera.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('signing_keys', function (Blueprint $table) {
            $table->id();

            $table->foreignId('institution_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('name');

            // La llave publica si se guarda entera: sirve para verificar firmas
            $table->text('public_key');

            // Solo la ruta. El archivo esta en storage/keys/ y cifrado.
            $table->string('private_key_path');

            // Huella digital: identifica la llave sin revelarla
            $table->string('fingerprint', 128)->unique();

            $table->string('algorithm', 30)->default('RSA-2048');
            $table->string('serial_number', 64)->nullable();

            // Certificado X.509 opcional (para firmar el PDF)
            $table->string('certificate_path')->nullable();

            $table->timestamp('valid_from');
            $table->timestamp('valid_until');

            $table->boolean('is_active')->default(true);
            $table->timestamp('revoked_at')->nullable();
            $table->string('revocation_reason')->nullable();

            $table->timestamps();

            $table->index(['institution_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('signing_keys');
    }
};
