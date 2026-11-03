<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\BlockchainServiceInterface;
use App\Data\BlockPayload;
use App\Enums\DocumentStatus;
use App\Exceptions\DocumentAlreadyOnChainException;
use App\Models\BlockchainRecord;
use App\Models\Document;
use App\Models\SimulatedBlock;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SimulatedBlockchainService implements BlockchainServiceInterface
{
    private int $difficulty;

    public function __construct()
    {
        $this->difficulty = config('blockchain.difficulty', 2);
    }

    public function genesis(): SimulatedBlock
    {
        $genesis = SimulatedBlock::where('height', 0)->first();

        if ($genesis !== null) {
            return $genesis;
        }

        $previousHash = SimulatedBlock::genesisPrevHash();
        $data = ['message' => config('blockchain.genesis_message', 'Genesis Block - Blockchain Notaria')];
        $dataJson = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $dataHash = hash('sha256', $dataJson);
        $nonce = $this->mineNonce($previousHash, $dataJson);
        $hash = $this->computeBlockHash($previousHash, $dataJson, $nonce);

        return SimulatedBlock::create([
            'height' => 0,
            'previous_hash' => $previousHash,
            'hash' => $hash,
            'nonce' => $nonce,
            'difficulty' => $this->difficulty,
            'data' => $data,
            'data_hash' => $dataHash,
            'mined_at' => Carbon::now(),
        ]);
    }

    public function registerDocument(Document $document): BlockchainRecord
    {
        if ($this->findRecord($document) !== null) {
            throw new DocumentAlreadyOnChainException(
                "El documento {$document->verification_code} ya está anclado en la cadena"
            );
        }

        if ($document->status !== DocumentStatus::Issued || empty($document->content_hash) || empty($document->signature)) {
            throw new \RuntimeException('El documento debe estar emitido con huella y firma antes de anclarse');
        }

        return DB::transaction(function () use ($document) {
            $genesis = $this->genesis();
            $lastBlock = SimulatedBlock::orderByDesc('height')->first() ?? $genesis;

            $payload = $this->buildPayload($document);
            $dataJson = $payload->toJson();
            $dataHash = $payload->hash();
            $previousHash = $lastBlock->hash;

            $nonce = $this->mineNonce($previousHash, $dataJson);
            $hash = $this->computeBlockHash($previousHash, $dataJson, $nonce);

            $newBlock = SimulatedBlock::create([
                'height' => $lastBlock->height + 1,
                'previous_hash' => $previousHash,
                'hash' => $hash,
                'nonce' => $nonce,
                'difficulty' => $this->difficulty,
                'data' => $payload->toArray(),
                'data_hash' => $dataHash,
                'mined_at' => Carbon::now(),
            ]);

            return BlockchainRecord::create([
                'document_id' => $document->id,
                'driver' => 'simulated',
                'simulated_block_id' => $newBlock->id,
                'tx_hash' => $hash,
                'network' => 'local',
                'block_number' => $newBlock->height,
                'payload_hash' => $dataHash,
                'status' => 'confirmed',
                'anchored_at' => Carbon::now(),
                'attempts' => 1,
            ]);
        });
    }

    public function findRecord(Document $document): ?BlockchainRecord
    {
        return BlockchainRecord::where('document_id', $document->id)
            ->where('driver', 'simulated')
            ->first();
    }

    public function inspect(): array
    {
        $issues = [];
        $blocks = SimulatedBlock::orderBy('height')->get();

        if ($blocks->isEmpty()) {
            return $issues;
        }

        $genesis = $blocks->first();

        if ($genesis->height !== 0) {
            $issues[] = [
                'block_id' => $genesis->id,
                'height' => $genesis->height,
                'message' => 'La cadena no empieza en altura 0 (génesis faltante)',
                'severity' => 'critical',
            ];
        }

        $expectedPrevHash = SimulatedBlock::genesisPrevHash();

        foreach ($blocks as $block) {
            if ($block->height !== 0 && $block->previous_hash !== $expectedPrevHash) {
                $issues[] = [
                    'block_id' => $block->id,
                    'height' => $block->height,
                    'message' => "Enlace roto: previous_hash ({$block->previous_hash}) no coincide con hash del bloque anterior ({$expectedPrevHash})",
                    'severity' => 'critical',
                ];
            }

            $computedHash = $block->computeHash();
            if (! hash_equals($block->hash, $computedHash)) {
                $issues[] = [
                    'block_id' => $block->id,
                    'height' => $block->height,
                    'message' => "Hash inválido: guardado {$block->hash}, calculado {$computedHash}",
                    'severity' => 'critical',
                ];
            }

            if (! str_starts_with($block->hash, str_repeat('0', $block->difficulty))) {
                $issues[] = [
                    'block_id' => $block->id,
                    'height' => $block->height,
                    'message' => "Dificultad no cumplida: hash {$block->hash} no empieza con {$block->difficulty} ceros",
                    'severity' => 'critical',
                ];
            }

            $computedDataHash = hash('sha256', json_encode($block->data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            if (! hash_equals($block->data_hash, $computedDataHash)) {
                $issues[] = [
                    'block_id' => $block->id,
                    'height' => $block->height,
                    'message' => 'data_hash inválido: datos alterados',
                    'severity' => 'critical',
                ];
            }

            $expectedPrevHash = $block->hash;
        }

        return $issues;
    }

    public function isIntact(): bool
    {
        return empty($this->inspect());
    }

    public function chain(): Collection
    {
        return SimulatedBlock::with('records.document')
            ->orderBy('height')
            ->get();
    }

    public function buildPayload(Document $document): BlockPayload
    {
        return BlockPayload::fromDocument($document);
    }

    public function computeBlockHash(string $previousHash, string $data, int $nonce): string
    {
        $payload = implode('|', [
            $previousHash,
            $data,
            (string) $nonce,
        ]);

        return hash('sha256', $payload);
    }

    /**
     * Proof of Work: busca un nonce que haga que el hash empiece con N ceros.
     */
    private function mineNonce(string $previousHash, string $data): int
    {
        $target = str_repeat('0', $this->difficulty);
        $nonce = 0;

        while (true) {
            $hash = $this->computeBlockHash($previousHash, $data, $nonce);
            if (str_starts_with($hash, $target)) {
                return $nonce;
            }
            $nonce++;

            if ($nonce > 1000000) {
                throw new \RuntimeException('PoW timeout: no se encontró nonce tras 1M intentos');
            }
        }
    }
}
