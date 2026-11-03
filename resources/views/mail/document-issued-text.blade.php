Estimado/a {{ $document->holder_name }},

Se generó una constancia técnica de registro para "{{ $document->title }}".

----------------------------------------
DETALLES DEL REGISTRO
----------------------------------------
Código de verificación: {{ $document->verification_code }}
Tipo de acto: {{ $document->documentType->name }}
Asunto o referencia: {{ $document->title }}
Oficina: {{ $document->institution->name }}
Fecha de registro: {{ $document->issued_at?->format('d/m/Y H:i') }}

----------------------------------------
VERIFICACIÓN
----------------------------------------
Puede consultar la integridad técnica del registro en:
{{ $verificationUrl }}

O escaneando el código QR de la constancia adjunta.

----------------------------------------
IMPORTANTE
----------------------------------------
La consulta no acredita identidad, firma, contenido ni validez notarial y no sustituye los requisitos legales aplicables a la actuación.

----------------------------------------
Este correo fue enviado por {{ $document->institution->name }}.
Si no esperaba esta constancia, contacte directamente con la oficina.

&copy; {{ date('Y') }} {{ $document->institution->name }}. Todos los derechos reservados.