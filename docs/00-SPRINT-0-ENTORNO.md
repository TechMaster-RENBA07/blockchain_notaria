# Entorno y ejecución local

## Objetivo

Ejecutar la gestión de registros notariales extraprotocolarios sin depender de proveedores de identidad, API o base de datos externos.

## Componentes

- Laravel y Livewire sirven la interfaz, autenticación y operaciones.
- SQLite persiste usuarios, oficina, tipos de acto, registros, auditoría y bloques simulados.
- DomPDF genera la constancia técnica; el QR enlaza a la consulta pública del registro.
- Las claves RSA se guardan localmente bajo `storage/keys`.
- Mailpit es opcional para probar correos en el equipo.

## Configuración que debe revisarse

`APP_URL` debe corresponder a la dirección de consulta del QR. Para acceder desde otro equipo, configura una URL o IP de red alcanzable y las reglas de red apropiadas. No uses `localhost` en un teléfono.

La configuración de la blockchain por defecto es local y simulada. Una clave privada o RPC pública no es necesaria para el desarrollo local.

## Protección del entorno

No publiques `.env`, claves privadas, base de datos, PDFs ni información de expedientes. Este estado del sistema no debe usarse con datos reales hasta implementar y evaluar el almacenamiento cifrado del archivo original, privacidad, respaldos y controles institucionales.
