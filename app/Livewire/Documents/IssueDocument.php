<?php

declare(strict_types=1);

namespace App\Livewire\Documents;

use App\Mail\DocumentIssuedMail;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Institution;
use App\Models\User;
use App\Services\CertificatePdfService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Livewire\Attributes\Validate;
use Livewire\Component;

/**
 * @property Collection<int, DocumentType> $documentTypes
 */
class IssueDocument extends Component
{
    #[Validate('required|exists:document_types,id')]
    public string $document_type_id = '';

    #[Validate('required|string|max:255')]
    public string $holder_name = '';

    #[Validate('required|string|max:40|unique:documents,holder_identity_number')]
    public string $holder_identity_number = '';

    #[Validate('nullable|email|max:255')]
    public string $holder_email = '';

    #[Validate('required|string|max:255')]
    public string $title = '';

    #[Validate('nullable|string')]
    public string $description = '';

    public bool $saving = false;

    public ?string $successMessage = null;

    public function mount(): void
    {
        if (! auth()->check() || ! auth()->user()->canIssue()) {
            abort(403, 'No tiene permiso para registrar actos extraprotocolarios.');
        }
    }

    public function save(): void
    {
        $this->validate();

        $this->saving = true;

        /** @var User $user */
        $user = Auth::user();

        /** @var Institution $institution */
        $institution = $user->institution;

        $key = $institution->getActiveSigningKeyOrFail();

        $document = Document::create([
            'institution_id' => $institution->id,
            'document_type_id' => $this->document_type_id,
            'issued_by' => $user->id,
            'signing_key_id' => $key->id,
            'holder_name' => $this->holder_name,
            'holder_identity_number' => $this->holder_identity_number,
            'holder_email' => $this->holder_email ?: null,
            'title' => $this->title,
            'description' => $this->description ?: null,
            'status' => 'draft',
        ]);

        $document->issue();

        $pdfPath = app(CertificatePdfService::class)->generate($document);

        if ($document->holder_email) {
            Mail::to($document->holder_email)->send(new DocumentIssuedMail($document));
        }

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'document_issued',
            'auditable_type' => Document::class,
            'auditable_id' => $document->id,
        ]);

        $this->successMessage = 'Registro técnico creado correctamente.';
        $this->resetForm();

        $this->redirect(route('documents.issued', $document), navigate: true);
    }

    private function resetForm(): void
    {
        $this->document_type_id = '';
        $this->holder_name = '';
        $this->holder_identity_number = '';
        $this->holder_email = '';
        $this->title = '';
        $this->description = '';
        $this->saving = false;
    }

    public function getDocumentTypesProperty(): Collection
    {
        $user = auth()->user();

        if (! $user) {
            return new Collection;
        }

        if ($user->isAdmin()) {
            return DocumentType::whereHas('institution', fn ($q) => $q->where('is_active', true))
                ->orderBy('name')
                ->get();
        }

        return $user->institution
            ->documentTypes()
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
    }

    public function render()
    {
        return view('livewire.documents.issue-document', [
            'documentTypes' => $this->documentTypes,
        ]);
    }
}
