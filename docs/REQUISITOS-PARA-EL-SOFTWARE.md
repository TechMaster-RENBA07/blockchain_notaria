# Requisitos para Blockchain Notaría

## Entorno de desarrollo local

| Herramienta | Requisito |
|---|---|
| PHP | 8.3 o posterior con OpenSSL, PDO SQLite, SQLite, GD, mbstring, ZIP, intl, bcmath, fileinfo y cURL |
| Composer | 2.x |
| Node.js | 20 o posterior |
| npm | Incluido con Node.js |
| Base de datos | SQLite, sin servidor externo |

La aplicación no requiere Google OAuth, una API de terceros, PostgreSQL, Docker ni credenciales de una blockchain pública para el flujo local.

## Instalación

Desde PowerShell en la raíz del proyecto:

```powershell
Copy-Item .env.example .env
composer install
npm install
php artisan key:generate
New-Item -ItemType File database\database.sqlite -Force
php artisan migrate --seed
php artisan storage:link
npm run build
```

Configura `OPENSSL_CONF` para que PHP pueda generar las claves RSA locales. Revisa `APP_URL` para que los enlaces QR apunten a la dirección que se usará al consultar.

## Ejecución

```powershell
php artisan serve
npm run dev
```

La web local queda en `http://localhost:8000`. Si usas Mailpit para probar notificaciones, configúralo como servidor SMTP local y no uses direcciones reales.

## Verificación y datos

El sistema calcula una huella SHA-256 del registro, firma esa huella y añade el registro a una cadena simulada guardada en SQLite. El QR conduce a una consulta pública sin exponer el nombre, el documento de identidad ni la nota administrativa.

Actualmente la aplicación registra metadatos, no archivos originales. La blockchain es simulada; no afirmes que existe un anclaje en una red pública.

## Cuentas de desarrollo

El seeder inicializa cuentas locales con contraseña `password`. No reutilices estas cuentas ni contraseñas fuera del entorno de desarrollo. Cambia las contraseñas y configura accesos individuales antes de compartir el sistema.

No cargues expedientes reales hasta disponer de evaluación legal, privacidad, cifrado de archivos originales, política de retención y respaldos verificados.
