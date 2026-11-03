<?php

namespace Database\Factories;

use App\Models\Institution;
use App\Models\SigningKey;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<SigningKey>
 */
class SigningKeyFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'institution_id' => Institution::factory(),
            'name' => fake()->words(2, true),
            'public_key' => "-----BEGIN PUBLIC KEY-----\n".base64_encode(Str::random(160))."\n-----END PUBLIC KEY-----",
            'private_key_path' => 'storage/keys/test.pem',
            'fingerprint' => hash('sha256', Str::random(32)),
            'algorithm' => 'RSA-2048',
            'serial_number' => null,
            'certificate_path' => null,
            'valid_from' => now()->subDay(),
            'valid_until' => now()->addYear(),
            'is_active' => true,
            'revoked_at' => null,
            'revocation_reason' => null,
        ];
    }
}
