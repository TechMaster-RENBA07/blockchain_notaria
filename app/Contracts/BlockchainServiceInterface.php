<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Data\BlockPayload;
use App\Exceptions\DocumentAlreadyOnChainException;
use App\Models\BlockchainRecord;
use App\Models\Document;
use App\Models\SimulatedBlock;
use Illuminate\Support\Collection;

interface BlockchainServiceInterface
{
    /**
     * Obtiene o crea el bloque génesis.
     */
    public function genesis(): SimulatedBlock;

    /**
     * Registra un documento en la cadena de bloques.
     *
     * @throws DocumentAlreadyOnChainException
     */
    public function registerDocument(Document $document): BlockchainRecord;

    /**
     * Busca el registro de cadena para un documento.
     */
    public function findRecord(Document $document): ?BlockchainRecord;

    /**
     * Recorre toda la cadena y detecta inconsistencias.
     *
     * Devuelve lista vacía si está íntegra.
     * Cada elemento es un array con: block_id, height, message, severity.
     *
     * @return array<int, array{block_id: int, height: int, message: string, severity: string}>
     */
    public function inspect(): array;

    /**
     * Verifica si la cadena está íntegra (atajo de inspect()).
     */
    public function isIntact(): bool;

    /**
     * Obtiene la cadena completa con sus documentos para el explorador.
     */
    public function chain(): Collection;

    /**
     * Construye el payload para un documento.
     */
    public function buildPayload(Document $document): BlockPayload;

    /**
     * Calcula el hash de un bloque a partir de sus componentes.
     */
    public function computeBlockHash(string $previousHash, string $data, int $nonce): string;
}
