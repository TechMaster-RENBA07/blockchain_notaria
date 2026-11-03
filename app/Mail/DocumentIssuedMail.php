<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Document; // <--- ESTA LÍNEA ES LA QUE FALTABA
use App\Services\CertificatePdfService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DocumentIssuedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Document $document,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Constancia técnica {$this->document->verification_code} — {$this->document->institution->name}",
            from: new Address(
                config('mail.from.address', 'no-reply@notaria.local'),
                config('mail.from.name', 'Notaría')
            ),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.document-issued',
            text: 'mail.document-issued-text',
            with: [
                'document' => $this->document,
                'verificationUrl' => $this->document->publicUrl(),
            ],
        );
    }

    public function attachments(): array
    {
        $pdfPath = app(CertificatePdfService::class)->getAbsolutePath($this->document);

        return [
            Attachment::fromPath($pdfPath)
                ->as("{$this->document->verification_code}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}

