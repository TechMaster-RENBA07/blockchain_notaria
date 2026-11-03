<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Constancia técnica {{ $document->verification_code }}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #1e3a8a; margin-bottom: 30px; }
        .institution-name { font-size: 24px; font-weight: bold; color: #1e3a8a; }
        .content { background: #f9fafb; border-radius: 8px; padding: 30px; margin: 20px 0; }
        .certificate-info { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #374151; }
        .info-value { color: #1f2937; }
        .verification-code { font-family: monospace; font-size: 18px; font-weight: bold; color: #1e3a8a; letter-spacing: 1px; background: #eff6ff; padding: 12px; border-radius: 6px; text-align: center; margin: 20px 0; }
        .button { display: inline-block; background: #1e3a8a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        .button:hover { background: #1e40af; }
        .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        .note { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 13px; color: #92400e; }
    </style>
</head>
<body>
    <div class="header">
        <div class="institution-name">{{ $document->institution->name }}</div>
    </div>

    <p>Estimado/a <strong>{{ $document->holder_name }}</strong>,</p>

    <p>Se generó una constancia técnica para el registro <strong>{{ $document->title }}</strong>.</p>

    <div class="content">
        <div class="verification-code">{{ $document->verification_code }}</div>

        <div class="certificate-info">
            <div class="info-row">
                <span class="info-label">Tipo de acto:</span>
                <span class="info-value">{{ $document->documentType->name }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Asunto o referencia:</span>
                <span class="info-value">{{ $document->title }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Oficina:</span>
                <span class="info-value">{{ $document->institution->name }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Fecha de registro:</span>
                <span class="info-value">{{ $document->issued_at?->format('d/m/Y H:i') }}</span>
            </div>
        </div>

        <a href="{{ $verificationUrl }}" class="button">Consultar integridad del registro</a>

        <p>También puede abrir la consulta escaneando el QR de la constancia adjunta.</p>
    </div>

    <div class="note">
        <strong>Alcance:</strong> La consulta informa sobre la integridad técnica de los datos registrados.
        No acredita identidad, firma, contenido ni validez notarial; tampoco reemplaza los requisitos legales de la actuación.
    </div>

    <div class="footer">
        <p>Este correo fue enviado por {{ $document->institution->name }}.<br>
        Si no esperaba esta constancia, contacte directamente con la oficina.</p>
        <p>&copy; {{ date('Y') }} {{ $document->institution->name }}. Todos los derechos reservados.</p>
    </div>
</body>
</html>