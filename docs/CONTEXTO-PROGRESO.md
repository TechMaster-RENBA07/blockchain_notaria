# Contexto y estado actual

## Propósito

Aplicación local para gestionar metadatos de actos notariales extraprotocolarios y generar una constancia técnica consultable por QR. Los actos iniciales son cartas notariales, constataciones de hechos, declaraciones juradas, poderes simples, autorizaciones y otros actos configurables. No contempla escrituras públicas.

## Implementado

- Autenticación local, roles básicos y base SQLite.
- Catálogo inicial de actos extraprotocolarios.
- Registro de metadatos y auditoría.
- Huella SHA-256 y firma RSA de los datos.
- Blockchain simulada local.
- Constancia PDF con QR y página pública de verificación técnica.
- Notificación por correo opcional.

## Limitaciones conocidas

- No se carga ni conserva el archivo original del acto.
- La blockchain es local y simulada, no una red pública.
- El sistema no acredita validez legal, identidad ni firma de los comparecientes.
- La configuración de la oficina y las claves requiere preparación institucional.
- La base, archivos y claves necesitan copias de seguridad protegidas.

No cargar expedientes reales hasta revisar legalidad, privacidad, cifrado de documentos, acceso, retención y operación.
