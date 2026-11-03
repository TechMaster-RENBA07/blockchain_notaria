<?php

namespace Database\Factories;

use App\Models\SimulatedBlock;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<SimulatedBlock>
 */
class SimulatedBlockFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'height' => fake()->unique()->numberBetween(0, 100000),
            'previous_hash' => Str::random(64),
            'hash' => Str::random(64),
            'nonce' => 0,
            'difficulty' => 2,
            'data' => [],
            'data_hash' => Str::random(64),
            'mined_at' => now(),
        ];
    }
}
