<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\SimulatedBlockFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Un bloque de la cadena simulada.
 *
 * Cada bloque guarda el hash del bloque anterior, y eso los encadena.
 *
 * @property int $height
 * @property int $nonce
 * @property int $difficulty
 * @property array<string, mixed> $data
 * @property Carbon $mined_at
 */
class SimulatedBlock extends Model
{
    /** @use HasFactory<SimulatedBlockFactory> */
    use HasFactory;

    protected $fillable = [
        'height', 'previous_hash', 'hash', 'nonce',
        'difficulty', 'data', 'data_hash', 'mined_at',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'height' => 'integer',
            'nonce' => 'integer',
            'difficulty' => 'integer',
            'mined_at' => 'datetime',
        ];
    }

    /** Hash del bloque genesis (el anterior al primero). */
    public const GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

    /**
     * Hash del bloque génesis (64 ceros).
     */
    public static function genesisPrevHash(): string
    {
        return self::GENESIS_PREVIOUS_HASH;
    }

    /** @return HasMany<BlockchainRecord, $this> */
    public function records(): HasMany
    {
        return $this->hasMany(BlockchainRecord::class);
    }

    /**
     * Calcula el hash de este bloque a partir de sus campos.
     *
     * Formato: prev_hash|data_json|nonce
     * Es determinista: los mismos datos siempre dan el mismo resultado.
     */
    public function computeHash(?int $nonce = null): string
    {
        $dataJson = json_encode($this->data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $payload = implode('|', [
            $this->previous_hash,
            $dataJson,
            (string) ($nonce ?? $this->nonce),
        ]);

        return hash('sha256', $payload);
    }

    /**
     * Verifica que el hash guardado cumpla la dificultad exigida.
     */
    public function meetsDifficulty(): bool
    {
        return str_starts_with($this->hash, str_repeat('0', $this->difficulty));
    }

    /**
     * Verifica que el hash guardado sea el que corresponde
     * y que cumpla la dificultad exigida.
     */
    public function isSelfConsistent(): bool
    {
        return hash_equals($this->hash, $this->computeHash())
            && $this->meetsDifficulty();
    }

    public static function latestBlock(): ?self
    {
        return self::orderByDesc('height')->first();
    }
}
