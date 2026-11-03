<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Document;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class CertificatePdfService
{
    /**
     * Genera una constancia técnica con QR incrustado en base64.
     *
     * @return string Ruta relativa del archivo guardado
     */
    public function generate(Document $document): string
    {
        $qrBase64 = $this->generateQrBase64($document->publicUrl());

        $pdf = Pdf::loadView('pdf.certificate', [
            'document' => $document,
            'qrBase64' => $qrBase64,
        ])->setPaper('A4');

        $filename = "{$document->verification_code}.pdf";
        $relativePath = "certificates/{$filename}";

        Storage::disk('public')->put($relativePath, $pdf->output());

        $document->pdf_path = $relativePath;
        $document->save();

        return $relativePath;
    }

    /**
     * Genera el QR como PNG en base64.
     */
    private function generateQrBase64(string $url): string
    {
        $png = QrCode::format('png')
            ->size(200)
            ->margin(2)
            ->errorCorrection('M')
            ->generate($url);

        // AQUÍ ESTÁ LA CORRECCIÓN: (string) $png
        return 'data:image/png;base64,'.base64_encode((string) $png);
    }

    /**
     * Obtiene la ruta absoluta del PDF en disco.
     */
    public function getAbsolutePath(Document $document): string
    {
        return Storage::disk('public')->path($document->pdf_path);
    }

    /**
     * Verifica si el PDF existe en disco.
     */
    public function exists(Document $document): bool
    {
        return $document->pdf_path !== null
            && Storage::disk('public')->exists($document->pdf_path);
    }
}
