<?php

namespace Database\Factories;

use App\Models\Document;
use App\Models\Verification;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Verification>
 */
class VerificationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'document_id' => Document::factory(),
            'verification_code' => 'NOTA-'.strtoupper(Str::random(4)).'-'.strtoupper(Str::random(4)),
            'result' => fake()->randomElement(['valid', 'not_found', 'revoked', 'expired', 'tampered']),
            'chain_verified' => false,
            'ip_address' => fake()->ipv4(),
            'user_agent' => fake()->userAgent(),
            'channel' => 'web',
            'details' => null,
        ];
    }
}
