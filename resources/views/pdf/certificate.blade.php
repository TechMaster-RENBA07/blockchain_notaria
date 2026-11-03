<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Constancia técnica - {{ $document->verification_code }}</title>
    <style>
        /* Márgenes limpios para toda la hoja */
        @page { margin: 15mm; }

        /* Reseteo básico */
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 10px; line-height: 1.4; color: #1f2937; margin: 0; padding: 0; }

        /* Encabezado */
        .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; }
        .institution-name { font-size: 18px; font-weight: bold; color: #1e3a8a; margin-bottom: 2px; }
        .institution-details { font-size: 9px; color: #6b7280; }
        .logo { max-height: 50px; margin-bottom: 5px; }

        /* Título */
        .title-section { text-align: center; margin: 15px 0; }
        .document-title { font-size: 18px; font-weight: bold; color: #111827; text-transform: uppercase; }
        .document-subtitle { font-size: 10px; color: #6b7280; margin-top: 3px; }

        /* Tabla de datos del titular */
        .holder-section { background: #f8fafc; border: 1px solid #e5e7eb; padding: 10px; margin-bottom: 15px; }
        .holder-title { font-size: 11px; font-weight: bold; color: #374151; margin-bottom: 8px; text-transform: uppercase; }
        .holder-label { font-size: 8px; font-weight: bold; color: #9ca3af; text-transform: uppercase; display: block; }
        .holder-value { font-size: 11px; color: #1f2937; }

        /* Nota */
        .description-section { margin-bottom: 15px; }
        .description-title { font-size: 11px; font-weight: bold; color: #374151; margin-bottom: 5px; text-transform: uppercase; }
        .description-text { font-size: 10px; color: #4b5563; }

        /* Tabla del Footer (La clave para que no se rompa) */
        .footer-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .footer-table td { vertical-align: top; padding-top: 10px; border-top: 1px solid #e5e7eb; }

        .verification-title { font-size: 9px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 3px; }
        .verification-code { font-family: monospace; font-size: 14px; font-weight: bold; color: #1e3a8a; margin-bottom: 2px; }
        .verification-url { font-size: 9px; color: #6b7280; word-wrap: break-word; }

        .hash-section { margin-top: 10px; padding-top: 8px; border-top: 1px dashed #d1d5db; }
        .hash-label { font-size: 8px; font-weight: bold; color: #9ca3af; text-transform: uppercase; }
        .hash-value { font-family: monospace; font-size: 7px; color: #6b7280; word-wrap: break-word; }

        /* QR */
        .qr-box { width: 85px; height: 85px; border: 1px solid #e5e7eb; padding: 3px; text-align: center; }
        .qr-box img { width: 75px; height: 75px; }

        /* Firma y textos legales */
        .seal { text-align: right; font-size: 8px; color: #9ca3af; margin-top: 15px; }
        .legal-text { font-size: 7px; color: #9ca3af; font-style: italic; text-align: justify; margin-top: 10px; border-top: 1px solid #f3f4f6; padding-top: 5px; }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        @if ($document->institution->logo_path && file_exists(public_path($document->institution->logo_path)))
            <img src="{{ base64_encode(file_get_contents(public_path($document->institution->logo_path))) }}" alt="Logo" class="logo">
        @endif
        <div class="institution-name">{{ $document->institution->name }}</div>
        <div class="institution-details">
            {{ $document->institution->legal_name ?: $document->institution->name }}<br>
            @if ($document->institution->city) {{ $document->institution->city }}, @endif {{ $document->institution->country === 'PE' ? 'Perú' : $document->institution->country }}<br>
            @if ($document->institution->email) {{ $document->institution->email }} @endif
        </div>
    </div>

    <!-- Título -->
    <div class="title-section">
        <div class="document-subtitle">CONSTANCIA TÉCNICA DE REGISTRO · {{ $document->documentType->name }}</div>
        <div class="document-title">{{ $document->title }}</div>
    </div>

    <!-- Datos -->
    <div class="holder-section">
        <div class="holder-title">Persona vinculada al registro</div>
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td width="50%" style="padding-bottom: 8px; padding-right: 10px;">
                    <span class="holder-label">Compareciente o persona vinculada</span>
                    <span class="holder-value">{{ $document->holder_name }}</span>
                </td>
                <td width="50%" style="padding-bottom: 8px;">
                    <span class="holder-label">Documento de identidad consignado</span>
                    <span class="holder-value">{{ $document->holder_identity_number }}</span>
                </td>
            </tr>
            <tr>
                <td width="50%" style="padding-right: 10px;">
                    <span class="holder-label">Correo electrónico</span>
                    <span class="holder-value">{{ $document->holder_email ?: 'No especificado' }}</span>
                </td>
                <td width="50%">
                    <span class="holder-label">Fecha de registro</span>
                    <span class="holder-value">{{ $document->issued_at?->format('d/m/Y') ?: '—' }}</span>
                </td>
            </tr>
        </table>
    </div>

    <!-- Nota -->
    <div class="description-section">
        <div class="description-title">Nota administrativa</div>
        <div class="description-text">{{ $document->description }}</div>
    </div>

    <!-- Tabla del Footer -->
    <table class="footer-table" cellpadding="0" cellspacing="0">
        <tr>
            <!-- Columna Izquierda -->
            <td width="65%" style="padding-right: 20px;">
                <div class="verification-title">Código de consulta</div>
                <div class="verification-code">{{ $document->verification_code }}</div>
                <div class="verification-url">{{ $document->publicUrl() }}</div>

                <div class="hash-section">
                    <div class="hash-label">Huella SHA-256 de los datos</div>
                    <div class="hash-value">{{ $document->content_hash }}</div>
                </div>
            </td>
            <!-- Columna Derecha (QR) -->
            <td width="35%" align="right">
                <div class="qr-box">
                    <img src="{{ $qrBase64 }}" alt="QR">
                </div>
            </td>
        </tr>
    </table>

    <!-- Firma y Legal -->
    <div class="seal">
        Firma criptográfica generada por el sistema<br>
        Clave: {{ $document->signingKey?->fingerprint ?: 'N/A' }} · Algoritmo: {{ $document->signingKey?->algorithm ?: 'RSA-2048' }}
    </div>

    <div class="legal-text">
        Esta constancia acredita únicamente la existencia e integridad técnica de los datos registrados.
        No acredita identidad, firma, contenido, fecha cierta ni validez legal; tampoco sustituye la actuación,
        el protocolo ni los requisitos aplicables a la función notarial. No corresponde a una escritura pública.
    </div>
</body>
</html>
