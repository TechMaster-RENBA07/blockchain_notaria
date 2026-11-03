<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bitacora de verificaciones publicas.
 *
 * Cada vez que alguien consulta el código o QR de un registro,
 * queda guardado el resultado técnico.
 *
 * Sirve como evidencia y para detectar intentos raros
 * (por ejemplo, alguien probando codigos al azar).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('verifications', function (Blueprint $table) {
            $table->id();

            // Puede ser null: también se registra una consulta desconocida.
            $table->foreignId('document_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            // Código que se consultó.
            $table->string('verification_code', 64);

            // valid | not_found | revoked | expired | tampered
            $table->string('result', 20);

            // Si se confirmó la integridad de la cadena configurada.
            $table->boolean('chain_verified')->default(false);

            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 512)->nullable();

            // qr | web | api
            $table->string('channel', 20)->default('web');

            // Detalle de que se comparo y que salio
            $table->json('details')->nullable();

            $table->timestamps();

            $table->index(['document_id', 'result']);
            $table->index(['created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('verifications');
    }
};
