<?php

namespace Database\Factories;

use App\Models\BlockchainRecord;
use App\Models\Document;
use App\Models\SimulatedBlock;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<BlockchainRecord>
 */
class BlockchainRecordFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'document_id' => Document::factory(),
            'driver' => 'simulated',
            'simulated_block_id' => SimulatedBlock::factory(),
            'tx_hash' => null,
            'network' => null,
            'block_number' => null,
            'payload_hash' => Str::random(64),
            'status' => 'pending',
            'anchored_at' => null,
            'error_message' => null,
            'attempts' => 0,
        ];
    }
}
