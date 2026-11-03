<?php

declare(strict_types=1);

use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Institution;
use App\Models\User;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    $this->artisan('migrate:fresh --seed');
    $this->institution = Institution::where('code', 'NOTARIA')->firstOrFail();
    $this->documentType = DocumentType::where('code', 'CARTA_NOTARIAL')->firstOrFail();
    $this->user = User::where('email', 'notario@notaria.local')->firstOrFail();
});

test('QR consultation confirms a registered record and hides personal data', function (): void {
    $key = $this->institution->generateSigningKey('Verification test key');
    $document = Document::factory()->create([
        'institution_id' => $this->institution->id,
        'document_type_id' => $this->documentType->id,
        'issued_by' => $this->user->id,
        'signing_key_id' => $key->id,
        'holder_name' => 'Persona de prueba',
        'holder_identity_number' => '12345678',
        'status' => 'draft',
    ]);
    $document->issue();

    $this->get(route('documents.verify', $document->verification_code))
        ->assertOk()
        ->assertSee('Los datos registrados mantienen su integridad técnica.')
        ->assertSee('Confirmado · red local simulada')
        ->assertDontSee('Persona de prueba')
        ->assertDontSee('12345678');

    $this->assertDatabaseHas('verifications', [
        'document_id' => $document->id,
        'result' => 'valid',
        'chain_verified' => true,
    ]);
});

test('QR consultation reports unknown codes without exposing document data', function (): void {
    $this->get(route('documents.verify', 'NOTA-ABCD-EFGH'))
        ->assertOk()
        ->assertSee('No se encontró un registro con ese código de consulta.');

    $this->assertDatabaseHas('verifications', [
        'verification_code' => 'NOTA-ABCD-EFGH',
        'result' => 'not_found',
    ]);
});
