<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * El puente entre un documento y la cadena de bloques.
 *
 * Relaciona un registro técnico con su bloque y estado de anclaje.
 *
 * Sirve tanto para la cadena simulada (nuestra tabla) como para
 * Ethereum de verdad, por eso tiene la columna "driver".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blockchain_records', function (Blueprint $table) {
            $table->id();

            $table->foreignId('document_id')->constrained()->cascadeOnDelete();

            // simulated | ethereum
            $table->string('driver', 30)->default('simulated');

            // Si es la cadena simulada, apunta a simulated_blocks
            $table->foreignId('simulated_block_id')
                ->nullable()
                ->constrained('simulated_blocks')
                ->nullOnDelete();

            // Si es Ethereum, aqui va el numero de transaccion
            $table->string('tx_hash', 100)->nullable()->index();
            $table->string('network', 40)->nullable();
            $table->unsignedBigInteger('block_number')->nullable();

            // Lo que realmente se grabo (el hash del documento)
            $table->string('payload_hash', 64);

            // pending | confirmed | failed
            $table->string('status', 20)->default('pending');

            $table->timestamp('anchored_at')->nullable();
            $table->text('error_message')->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);

            $table->timestamps();

            $table->index(['document_id', 'status']);
            $table->index(['driver', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blockchain_records');
    }
};
