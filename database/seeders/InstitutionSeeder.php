<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Institution;
use Illuminate\Database\Seeder;

class InstitutionSeeder extends Seeder
{
    public function run(): void
    {
        Institution::where('code', 'UMSS')->update(['is_active' => false]);

        $institution = Institution::query()
            ->whereIn('code', ['NOTARIA', 'CERTSEC'])
            ->orderByRaw("CASE WHEN code = 'NOTARIA' THEN 0 ELSE 1 END")
            ->first();

        if (! $institution) {
            $institution = new Institution;
        }

        $institution->fill([
            'code' => 'NOTARIA',
            'name' => 'Notaría (configurar nombre)',
            'legal_name' => null,
            'tax_id' => null,
            'email' => 'notaria@notaria.local',
            'phone' => null,
            'address' => null,
            'city' => null,
            'country' => 'PE',
            'website' => null,
            'is_active' => true,
            'settings' => [
                'pdf_footer' => 'Constancia técnica de registro documental.',
                'primary_color' => '#1e40af',
            ],
        ])->save();
    }
}
