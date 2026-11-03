<?php

namespace Database\Factories;

use App\Enums\DocumentStatus;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Institution;
use App\Models\SigningKey;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Document>
 */
class DocumentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'verification_code' => null,
            'institution_id' => Institution::factory(),
            'document_type_id' => DocumentType::factory(),
            'issued_by' => User::factory(),
            'signing_key_id' => SigningKey::factory(),
            'holder_name' => fake()->name(),
            'holder_identity_number' => fake()->numerify('##########'),
            'holder_email' => fake()->safeEmail(),
            'title' => fake()->sentence(3),
            'description' => fake()->paragraph(),
            'metadata' => [],
            'content_hash' => 'temporal',
            'pdf_hash' => null,
            'pdf_path' => null,
            'qr_path' => null,
            'signature' => null,
            'status' => DocumentStatus::Draft,
            'issued_at' => null,
            'expires_at' => null,
            'revoked_at' => null,
            'revocation_reason' => null,
            'revoked_by' => null,
        ];
    }
}
