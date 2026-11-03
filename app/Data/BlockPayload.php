<?php

declare(strict_types=1);

namespace App\Data;

use App\Models\Document;

/**
 * DTO inmutable para el payload de un bloque.
 */
readonly class BlockPayload
{
    public function __construct(
        public string $verification_code,
        public string $content_hash,
        public string $signature,
        public int $institution_id,
        public string $issued_at,
    ) {}

    /**
     * Crea un BlockPayload desde un Document.
     */
    public static function fromDocument(Document $document): self
    {
        return new self(
            verification_code: $document->verification_code,
            content_hash: $document->content_hash,
            signature: $document->signature ?? '',
            institution_id: $document->institution_id,
            issued_at: $document->issued_at?->toIso8601String() ?? '',
        );
    }

    /**
     * Convierte a array para JSON (orden fijo para hash determinista).
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'verification_code' => $this->verification_code,
            'content_hash' => $this->content_hash,
            'signature' => $this->signature,
            'institution_id' => $this->institution_id,
            'issued_at' => $this->issued_at,
        ];
    }

    /**
     * Serializa a JSON canónico.
     */
    public function toJson(): string
    {
        return json_encode($this->toArray(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Calcula el hash SHA-256 del payload.
     */
    public function hash(): string
    {
        return hash('sha256', $this->toJson());
    }
}
