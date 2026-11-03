<?php

declare(strict_types=1);

use App\Contracts\BlockchainServiceInterface;
use App\Enums\DocumentStatus;
use App\Exceptions\DocumentAlreadyOnChainException;
use App\Models\BlockchainRecord;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Institution;
use App\Models\SimulatedBlock;
use App\Models\User;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

pest()->extend(TestCase::class)->in('Feature/Blockchain');

uses(TestCase::class)
    ->group('blockchain');

beforeEach(function (): void {
    $this->artisan('migrate:fresh --seed');
    Queue::fake();

    $this->institution = Institution::where('code', 'NOTARIA')->first();
    $this->documentType = DocumentType::where('code', 'CARTA_NOTARIAL')->first();
    $this->user = User::where('email', 'notario@notaria.local')->first();
    $this->service = app(BlockchainServiceInterface::class);
});

test('genesis block is created on first register', function (): void {
    $key = $this->institution->generateSigningKey('Test Key');

    $doc = Document::factory()->create([
        'institution_id' => $this->institution->id,
        'document_type_id' => $this->documentType->id,
        'issued_by' => $this->user->id,
        'signing_key_id' => $key->id,
        'status' => 'draft',
    ]);

    $doc->issue();

    $record = $this->service->findRecord($doc);

    expect($record)->toBeInstanceOf(BlockchainRecord::class);
    expect($record->document_id)->toBe($doc->id);
    expect($record->driver)->toBe('simulated');

    $blocks = SimulatedBlock::orderBy('height')->get();
    expect($blocks)->toHaveCount(2); // genesis + document block

    $genesis = $blocks->first();
    expect($genesis->height)->toBe(0);
    expect($genesis->previous_hash)->toBe(SimulatedBlock::genesisPrevHash());
    expect($genesis->meetsDifficulty())->toBeTrue();

    $docBlock = $blocks->skip(1)->first();
    expect($docBlock->height)->toBe(1);
    expect($docBlock->previous_hash)->toBe($genesis->hash);
    expect($docBlock->meetsDifficulty())->toBeTrue();
    expect($docBlock->data_hash)->toBe(hash('sha256', json_encode($docBlock->data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)));
});

test('second document links to first block', function (): void {
    $key1 = $this->institution->generateSigningKey('Test Key 1');
    $key2 = $this->institution->generateSigningKey('Test Key 2');

    $doc1 = Document::factory()->create([
        'institution_id' => $this->institution->id,
        'document_type_id' => $this->documentType->id,
        'issued_by' => $this->user->id,
        'signing_key_id' => $key1->id,
        'status' => 'draft',
    ]);

    $doc2 = Document::factory()->create([
        'institution_id' => $this->institution->id,
        'document_type_id' => $this->documentType->id,
        'issued_by' => $this->user->id,
        'signing_key_id' => $key2->id,
        'status' => 'draft',
    ]);

    $doc1->issue();
    $doc2->issue();

    $blocks = SimulatedBlock::orderBy('height')->get();
    expect($blocks)->toHaveCount(3); // genesis + 2 documents

    $block1 = $blocks->skip(1)->first();
    $block2 = $blocks->skip(2)->first();

    expect($block2->previous_hash)->toBe($block1->hash);
    expect($block2->height)->toBe(2);
});

test('inspect returns empty on healthy chain', function (): void {
    $key = $this->institution->generateSigningKey('Test Key');

    $doc = Document::factory()->create([
        'institution_id' => $this->institution->id,
        'document_type_id' => $this->documentType->id,
        'issued_by' => $this->user->id,
        'signing_key_id' => $key->id,
        'status' => 'draft',
    ]);

    $doc->issue();

    $issues = $this->service->inspect();
    expect($issues)->toBeEmpty();
    expect($this->service->isIntact())->toBeTrue();
});

test('inspect detects data tampering', function (): void {
    $key = $this->institution->generateSigningKey('Test Key');

    $doc = Document::factory()->create([
        'institution_id' => $this->institution->id,
        'document_type_id' => $this->documentType->id,
        'issued_by' => $this->user->id,
        'signing_key_id' => $key->id,
        'status' => 'draft',
    ]);

    $doc->issue();

    $block = SimulatedBlock::where('height', 1)->first();
    $block->data = ['tampered' => true];
    $block->save();

    $issues = $this->service->inspect();
    expect($issues)->not->toBeEmpty();

    $issue = $issues[0];
    expect($issue['height'])->toBe(1);
    expect($issue['severity'])->toBe('critical');
    $message = $issue['message'];
    expect(stripos($message, 'hash') !== false || stripos($message, 'data_hash') !== false)->toBeTrue();
});

test('inspect detects hash recalculation attack', function (): void {
    $key = $this->institution->generateSigningKey('Test Key');

    $doc1 = Document::factory()->create([
        'institution_id' => $this->institution->id,
        'document_type_id' => $this->documentType->id,
        'issued_by' => $this->user->id,
        'signing_key_id' => $key->id,
        'status' => 'draft',
    ]);

    $doc2 = Document::factory()->create([
        'institution_id' => $this->institution->id,
        'document_type_id' => $this->documentType->id,
        'issued_by' => $this->user->id,
        'signing_key_id' => $this->institution->generateSigningKey('Second Key')->id,
        'status' => 'draft',
    ]);

    $doc1->issue();
    $doc2->issue();

    $block = SimulatedBlock::where('height', 1)->first();
    $block->data = ['hacked' => true];
    $block->data_hash = hash('sha256', json_encode($block->data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    $block->hash = $block->computeHash();
    $block->save();

    $issues = $this->service->inspect();
    expect($issues)->not->toBeEmpty();

    $nextBlock = SimulatedBlock::where('height', 2)->first();
    expect($nextBlock)->not->toBeNull();

    $linkIssue = collect($issues)->firstWhere(fn ($i) => $i['height'] === 2);
    expect($linkIssue)->not->toBeNull();
    expect($linkIssue['message'])->toContain('Enlace roto');
});

test('issue anchors document in blockchain', function (): void {
    $key = $this->institution->generateSigningKey('Issue Key');

    $doc = Document::factory()->create([
        'institution_id' => $this->institution->id,
        'document_type_id' => $this->documentType->id,
        'issued_by' => $this->user->id,
        'signing_key_id' => $key->id,
        'status' => 'draft',
    ]);

    $doc->issue();

    $doc->refresh();
    expect($doc->status)->toBe(DocumentStatus::Issued);
    expect($doc->content_hash)->not->toBeNull();
    expect($doc->signature)->not->toBeNull();

    $record = $this->service->findRecord($doc);
    expect($record)->not->toBeNull();
    expect($record->status)->toBe('confirmed');
    expect($record->simulated_block_id)->not->toBeNull();

    $block = SimulatedBlock::find($record->simulated_block_id);
    expect($block)->not->toBeNull();
    expect($block->height)->toBeGreaterThan(0);
});

test('registering same document twice throws exception', function (): void {
    $key = $this->institution->generateSigningKey('Test Key');

    $doc = Document::factory()->create([
        'institution_id' => $this->institution->id,
        'document_type_id' => $this->documentType->id,
        'issued_by' => $this->user->id,
        'signing_key_id' => $key->id,
        'status' => 'draft',
    ]);

    $doc->issue();

    expect(fn () => $this->service->registerDocument($doc))->toThrow(DocumentAlreadyOnChainException::class);
});

test('hasIntactContent still detects content changes', function (): void {
    $key = $this->institution->generateSigningKey('Content Key');

    $doc = Document::factory()->create([
        'institution_id' => $this->institution->id,
        'document_type_id' => $this->documentType->id,
        'issued_by' => $this->user->id,
        'signing_key_id' => $key->id,
        'holder_name' => 'Original Name',
        'status' => 'draft',
    ]);

    $doc->issue();

    expect($doc->hasIntactContent())->toBeTrue();

    $doc->holder_name = 'Tampered Name';
    $doc->save();

    expect($doc->hasIntactContent())->toBeFalse();
});

test('verifySignature works after issue', function (): void {
    $key = $this->institution->generateSigningKey('Verify Key');

    $doc = Document::factory()->create([
        'institution_id' => $this->institution->id,
        'document_type_id' => $this->documentType->id,
        'issued_by' => $this->user->id,
        'signing_key_id' => $key->id,
        'status' => 'draft',
    ]);

    $doc->issue();

    expect($doc->verifySignature())->toBeTrue();
});

test('chain returns ordered blocks with documents', function (): void {
    $doc = Document::factory()->create([
        'institution_id' => $this->institution->id,
        'document_type_id' => $this->documentType->id,
        'issued_by' => $this->user->id,
        'signing_key_id' => $this->institution->generateSigningKey('Chain Key')->id,
        'status' => 'issued',
        'content_hash' => 'chain123',
        'signature' => 'sig123',
    ]);

    $this->service->registerDocument($doc);

    $chain = $this->service->chain();
    expect($chain)->toHaveCount(2); // genesis + doc

    foreach ($chain as $index => $block) {
        expect($block->height)->toBe($index);
    }

    $docBlock = $chain->skip(1)->first();
    expect($docBlock->records)->toHaveCount(1);
    expect($docBlock->records->first()->document_id)->toBe($doc->id);
});

test('buildPayload returns deterministic array', function (): void {
    $key = $this->institution->generateSigningKey('Payload Key');

    $doc = Document::factory()->create([
        'institution_id' => $this->institution->id,
        'document_type_id' => $this->documentType->id,
        'issued_by' => $this->user->id,
        'signing_key_id' => $key->id,
        'holder_name' => 'Test Holder',
        'status' => 'issued',
        'content_hash' => 'payload123',
        'signature' => 'sig123',
        'issued_at' => now(),
    ]);

    $payload1 = $this->service->buildPayload($doc);
    $payload2 = $this->service->buildPayload($doc);

    expect($payload1->toArray())->toBe($payload2->toArray());
    expect($payload1->hash())->toBe($payload2->hash());
});

test('computeBlockHash matches service', function (): void {
    $hash = $this->service->computeBlockHash('prev123', 'data456', 42);

    expect($hash)->toBe(hash('sha256', 'prev123|data456|42'));
    expect($hash)->toHaveLength(64);
});

test('genesis is reusable', function (): void {
    $genesis1 = $this->service->genesis();
    $genesis2 = $this->service->genesis();

    expect($genesis1->id)->toBe($genesis2->id);
    expect($genesis1->height)->toBe(0);
});
