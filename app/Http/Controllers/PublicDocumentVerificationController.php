<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Contracts\BlockchainServiceInterface;
use App\Enums\DocumentStatus;
use App\Models\Document;
use App\Models\Verification;
use Illuminate\Http\Request;
use Illuminate\View\View;

class PublicDocumentVerificationController extends Controller
{
    public function __invoke(
        Request $request,
        string $verificationCode,
        BlockchainServiceInterface $blockchain,
    ): View {
        $document = Document::query()
            ->with(['documentType', 'blockchainRecords'])
            ->where('verification_code', strtoupper($verificationCode))
            ->first();

        if (! $document) {
            Verification::create([
                'verification_code' => strtoupper($verificationCode),
                'result' => 'not_found',
                'chain_verified' => false,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'channel' => 'web',
            ]);

            return view('documents.verification', [
                'document' => null,
                'result' => 'not_found',
                'contentIntact' => false,
                'signatureValid' => false,
                'chainRecord' => null,
                'chainVerified' => false,
            ]);
        }

        $contentIntact = $document->hasIntactContent();
        $signatureValid = $document->verifySignature();
        $chainRecord = $blockchain->findRecord($document);
        $chainVerified = $chainRecord !== null
            && $chainRecord->isConfirmed()
            && hash_equals(
                $chainRecord->payload_hash,
                $blockchain->buildPayload($document)->hash(),
            )
            && $blockchain->isIntact();

        $result = match (true) {
            $document->status === DocumentStatus::Revoked => 'revoked',
            $document->isExpired() => 'expired',
            ! $document->isValid() || ! $contentIntact || ! $signatureValid => 'tampered',
            $chainRecord !== null && ! $chainVerified => 'tampered',
            default => 'valid',
        };

        Verification::create([
            'document_id' => $document->id,
            'verification_code' => $document->verification_code,
            'result' => $result,
            'chain_verified' => $chainVerified,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'channel' => 'web',
            'details' => [
                'content_intact' => $contentIntact,
                'signature_valid' => $signatureValid,
                'chain_record_found' => $chainRecord !== null,
                'chain_integrity_confirmed' => $chainVerified,
            ],
        ]);

        return view('documents.verification', compact(
            'document',
            'result',
            'contentIntact',
            'signatureValid',
            'chainRecord',
            'chainVerified',
        ));
    }
}
