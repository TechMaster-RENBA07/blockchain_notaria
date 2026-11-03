<?php

namespace Database\Factories;

use App\Models\DocumentType;
use App\Models\Institution;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<DocumentType>
 */
class DocumentTypeFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'institution_id' => Institution::factory(),
            'code' => strtoupper(Str::random(8)),
            'name' => fake()->words(2, true),
            'description' => fake()->sentence(),
            'template_view' => 'pdf.default',
            'validity_months' => null,
            'requires_signature' => true,
            'is_active' => true,
            'schema' => null,
        ];
    }
}
