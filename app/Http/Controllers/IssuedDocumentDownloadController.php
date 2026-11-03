<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class IssuedDocumentDownloadController extends Controller
{
    /**
     * Descarga la constancia técnica del registro documental.
     *
     * Autoriza: emisor/admin/auditor de la misma institución.
     */
    public function __invoke(Document $document): BinaryFileResponse|Response
    {
        $user = auth()->user();

        if (! $user || ! $user->canIssue() && ! $user->isAdmin() && ! $this->isAuditorOfInstitution($user, $document)) {
            abort(403, 'No tiene permiso para descargar esta constancia.');
        }

        if (! $document->pdf_path || ! Storage::disk('public')->exists($document->pdf_path)) {
            abort(404, 'El archivo PDF no existe.');
        }

        $path = Storage::disk('public')->path($document->pdf_path);
        $filename = "{$document->verification_code}.pdf";

        return response()->file($path, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    private function isAuditorOfInstitution($user, Document $document): bool
    {
        return $user->role->canViewAudit()
            && $user->institution_id === $document->institution_id;
    }
}
