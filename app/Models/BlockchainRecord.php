<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\BlockchainRecordFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $document_id
 * @property string $driver
 * @property int|null $simulated_block_id
 * @property string|null $tx_hash
 * @property string $network
 * @property int $block_number
 * @property string $payload_hash
 * @property string $status
 * @property Carbon|null $anchored_at
 * @property string|null $error_message
 * @property int $attempts
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Document $document
 * @property-read SimulatedBlock|null $simulatedBlock
 */
class BlockchainRecord extends Model
{
    /** @use HasFactory<BlockchainRecordFactory> */
    use HasFactory;

    protected $fillable = [
        'document_id', 'driver', 'simulated_block_id',
        'tx_hash', 'network', 'block_number',
        'payload_hash', 'status', 'anchored_at',
        'error_message', 'attempts',
    ];

    protected function casts(): array
    {
        return [
            'anchored_at' => 'datetime',
            'block_number' => 'integer',
            'attempts' => 'integer',
        ];
    }

    /** @return BelongsTo<Document, $this> */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    /** @return BelongsTo<SimulatedBlock, $this> */
    public function simulatedBlock(): BelongsTo
    {
        return $this->belongsTo(SimulatedBlock::class);
    }

    public function isConfirmed(): bool
    {
        return $this->status === 'confirmed';
    }
}
