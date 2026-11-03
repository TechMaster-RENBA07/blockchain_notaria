<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * LA CADENA DE BLOQUES.
 *
 * Piensa en una libreta donde cada hoja lleva escrito, arriba,
 * un resumen de la hoja anterior. Si alguien arranca o cambia una hoja
 * del medio, todos los resumenes de abajo dejan de coincidir
 * y el fraude queda a la vista.
 *
 * Eso es exactamente lo que hace previous_hash.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('simulated_blocks', function (Blueprint $table) {
            $table->id();

            // Numero de hoja. El bloque 0 es el "genesis" (el primero de todos).
            $table->unsignedBigInteger('height')->unique();

            // Resumen de la hoja anterior. Asi se encadenan.
            $table->string('previous_hash', 64)->index();

            // Resumen de ESTA hoja
            $table->string('hash', 64)->unique();

            // Numero que se va probando hasta que el hash empieza con ceros
            $table->unsignedBigInteger('nonce')->default(0);

            // Cuantos ceros debe tener el hash al inicio
            $table->unsignedTinyInteger('difficulty')->default(2);

            // Lo que se guarda en el bloque (hashes de documentos)
            $table->json('data');

            // Resumen del contenido de data
            $table->string('data_hash', 64);

            $table->timestamp('mined_at');
            $table->timestamps();

            $table->index(['height', 'hash']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('simulated_blocks');
    }
};
