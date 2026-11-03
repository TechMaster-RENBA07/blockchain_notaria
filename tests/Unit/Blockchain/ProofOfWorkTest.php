<?php

declare(strict_types=1);

use App\Contracts\BlockchainServiceInterface;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Institution;
use App\Models\SimulatedBlock;
use App\Models\User;
use Tests\TestCase;

pest()->extend(TestCase::class)->in('Unit/Blockchain');

uses(TestCase::class)
    ->group('blockchain', 'pow');

beforeEach(function (): void {
    $this->artisan('migrate:fresh --seed');
});

test('genesis hash starts with required zeros', function (): void {
    $genesis = SimulatedBlock::where('height', 0)->first();

    if ($genesis === null) {
        // Force genesis creation via service
        app(BlockchainServiceInterface::class)->genesis();
        $genesis = SimulatedBlock::where('height', 0)->first();
    }

    expect($genesis)->not->toBeNull();
    expect($genesis->meetsDifficulty())->toBeTrue();
    expect(str_starts_with($genesis->hash, str_repeat('0', $genesis->difficulty)))->toBeTrue();
});

test('mined block hash meets difficulty', function (): void {
    $service = app(BlockchainServiceInterface::class);

    $doc = Document::factory()->create([
        'institution_id' => Institution::where('code', 'NOTARIA')->first()->id,
        'document_type_id' => DocumentType::where('code', 'DIPLOMA')->first()->id,
        'issued_by' => User::where('email', 'notario@notaria.local')->first()->id,
        'signing_key_id' => Institution::where('code', 'NOTARIA')->first()->generateSigningKey('PoW Key')->id,
        'status' => 'issued',
        'content_hash' => 'pow123',
        'signature' => 'sig123',
    ]);

    $service->registerDocument($doc);

    $blocks = SimulatedBlock::where('height', '>', 0)->get();
    expect($blocks)->not->toBeEmpty();

    foreach ($blocks as $block) {
        expect($block->meetsDifficulty())->toBeTrue();
        expect(str_starts_with($block->hash, str_repeat('0', $block->difficulty)))->toBeTrue();
    }
});

test('difficulty 2 requires hash starting with 00', function (): void {
    $service = app(BlockchainServiceInterface::class);

    // Create a document which will mine a block
    $doc = Document::factory()->create([
        'institution_id' => Institution::where('code', 'NOTARIA')->first()->id,
        'document_type_id' => DocumentType::where('code', 'DIPLOMA')->first()->id,
        'issued_by' => User::where('email', 'notario@notaria.local')->first()->id,
        'signing_key_id' => Institution::where('code', 'NOTARIA')->first()->generateSigningKey('Difficulty Key')->id,
        'status' => 'issued',
        'content_hash' => 'diff123',
        'signature' => 'sig123',
    ]);

    $service->registerDocument($doc);

    $blocks = SimulatedBlock::where('height', '>', 0)->get();
    foreach ($blocks as $block) {
        expect($block->difficulty)->toBe(2);
        expect($block->hash)->toStartWith('00');
    }
});

test('changing nonce changes hash', function (): void {
    $block = SimulatedBlock::factory()->create([
        'height' => 5,
        'previous_hash' => 'abc123',
        'data' => ['test' => 'data'],
        'data_hash' => 'def456',
    ]);

    $hash1 = $block->computeHash(100);
    $hash2 = $block->computeHash(101);

    expect($hash1)->not->toBe($hash2);
    expect($hash1)->toHaveLength(64);
    expect($hash2)->toHaveLength(64);
});

test('same inputs produce same hash', function (): void {
    $block = SimulatedBlock::factory()->create([
        'height' => 10,
        'previous_hash' => 'prev789',
        'data' => ['fixed' => 'data'],
        'data_hash' => 'ghi789',
    ]);

    $hash1 = $block->computeHash(999);
    $hash2 = $block->computeHash(999);

    expect($hash1)->toBe($hash2);
});

test('nonce zero is valid starting point', function (): void {
    $block = SimulatedBlock::factory()->create([
        'height' => 15,
        'previous_hash' => 'prev000',
        'data' => ['nonce' => 'test'],
        'data_hash' => 'jkl000',
    ]);

    $hash = $block->computeHash(0);

    expect($hash)->toHaveLength(64);
    expect($hash)->toBe($block->computeHash(0));
});

test('genesis previous hash is 64 zeros', function (): void {
    expect(SimulatedBlock::genesisPrevHash())->toBe(str_repeat('0', 64));
    expect(SimulatedBlock::genesisPrevHash())->toHaveLength(64);
});
