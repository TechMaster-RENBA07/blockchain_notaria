<?php

namespace Database\Factories;

use App\Models\Institution;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Institution>
 */
class InstitutionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'code' => strtoupper(Str::random(6)),
            'name' => fake()->company(),
            'legal_name' => fake()->company(),
            'tax_id' => fake()->numerify('##########'),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'address' => fake()->address(),
            'city' => fake()->city(),
            'country' => 'BO',
            'website' => fake()->url(),
            'logo_path' => null,
            'is_active' => true,
            'settings' => [],
        ];
    }
}
