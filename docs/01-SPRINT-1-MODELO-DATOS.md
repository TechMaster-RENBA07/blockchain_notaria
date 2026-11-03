# Modelo de datos para actos extraprotocolarios

## Entidades

| Tabla | Propósito |
|---|---|
| `institutions` | Oficina notarial y configuración local |
| `users` | Personal autorizado, roles y oficina |
| `document_types` | Tipos de acto: carta, constatación, declaración, poder, autorización u otro |
| `documents` | Metadatos y estado del registro técnico |
| `signing_keys` | Claves de aplicación para firmar huellas |
| `blockchain_records` | Anclaje y estado del registro en la cadena configurada |
| `simulated_blocks` | Bloques de la blockchain simulada local |
| `verifications` | Consultas públicas al QR o código |
| `audit_logs` | Acciones relevantes del personal |

## Relaciones principales

- Una oficina tiene usuarios, tipos de acto, claves y registros.
- Cada registro refiere a un tipo de acto, al operador y a una clave de firma.
- El registro puede tener una fila de anclaje y múltiples consultas públicas.
- Los bloques de la implementación simulada forman una cadena por `previous_hash`.

## Límites del modelo actual

La tabla `documents` guarda datos de referencia y una huella calculada sobre esos datos. No incluye el archivo original del acto. Por eso, la constancia PDF no debe presentarse como copia, firma o validación legal del documento original.

Los identificadores y propiedades internas mantienen nombres heredados del prototipo (por ejemplo, `holder_name`); en la interfaz se presentan como compareciente o persona vinculada al registro.
