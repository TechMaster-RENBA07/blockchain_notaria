# Registro del acto y constancia con QR

## Flujo actual

1. Personal autorizado selecciona un tipo de acto extraprotocolario.
2. Registra una referencia, persona vinculada y nota administrativa.
3. La aplicación calcula la huella de los datos, la firma y registra el resultado en la blockchain local simulada.
4. Se genera una constancia PDF con código de consulta y QR.
5. La consulta pública muestra únicamente el tipo de acto, la fecha y resultados técnicos; no publica datos personales.

## Tipos incluidos

- Carta notarial.
- Constatación de hechos.
- Declaración jurada.
- Poder simple.
- Autorización.
- Otro acto extraprotocolario.

No incluye escrituras públicas.

## Aclaración obligatoria

La constancia es un recibo técnico del registro en esta aplicación. No es el documento notarial original y no acredita identidad, firma, contenido, fecha cierta ni validez legal. El QR verifica solamente la integridad técnica de los datos registrados.

## Pendiente

La carga, cifrado, conservación y descarga del documento original aún no están implementados en esta aplicación Laravel. No registrar expedientes reales hasta cerrar esa funcionalidad y sus controles de acceso y privacidad.
