<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\DocumentType;
use App\Models\Institution;
use Illuminate\Database\Seeder;

class DocumentTypeSeeder extends Seeder
{
    public function run(): void
    {
        $institution = Institution::where('code', 'NOTARIA')->firstOrFail();
        DocumentType::where('institution_id', $institution->id)
            ->update(['is_active' => false]);

        $tipos = [
            [
                'code' => 'CARTA_NOTARIAL',
                'name' => 'Carta notarial',
                'description' => 'Registro técnico de una carta notarial.',
                'template_view' => 'pdf.certificate',
                'validity_months' => null,
                'requires_signature' => true,
                'schema' => [],
            ],
            [
                'code' => 'CONSTATACION_HECHOS',
                'name' => 'Constatación de hechos',
                'description' => 'Registro técnico de una constatación de hechos.',
                'template_view' => 'pdf.certificate',
                'validity_months' => null,
                'requires_signature' => true,
                'schema' => [],
            ],
            [
                'code' => 'DECLARACION_JURADA',
                'name' => 'Declaración jurada',
                'description' => 'Registro técnico de una declaración jurada.',
                'template_view' => 'pdf.certificate',
                'validity_months' => null,
                'requires_signature' => true,
                'schema' => [],
            ],
            [
                'code' => 'PODER_SIMPLE',
                'name' => 'Poder simple',
                'description' => 'Registro técnico de un poder simple.',
                'template_view' => 'pdf.certificate',
                'validity_months' => null,
                'requires_signature' => true,
                'schema' => [],
            ],
            [
                'code' => 'AUTORIZACION',
                'name' => 'Autorización',
                'description' => 'Registro técnico de una autorización.',
                'template_view' => 'pdf.certificate',
                'validity_months' => null,
                'requires_signature' => true,
                'schema' => [],
            ],
            [
                'code' => 'OTRO_EXTRAPROTOCOLAR',
                'name' => 'Otro acto extraprotocolar',
                'description' => 'Registro técnico de otro acto extraprotocolar.',
                'template_view' => 'pdf.certificate',
                'validity_months' => null,
                'requires_signature' => true,
                'schema' => [],
            ],
        ];

        foreach ($tipos as $tipo) {
            DocumentType::updateOrCreate(
                [
                    'institution_id' => $institution->id,
                    'code' => $tipo['code'],
                ],
                $tipo + ['is_active' => true]
            );
        }
    }
}
