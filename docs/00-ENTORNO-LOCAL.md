# Entorno local en Windows

## Requisitos

PHP 8.3+, Composer 2, Node.js 20+ y npm. Habilita las extensiones OpenSSL, PDO SQLite, SQLite, GD, mbstring, ZIP, intl, bcmath, fileinfo y cURL.

## Preparación inicial

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

En Windows, configura `OPENSSL_CONF` con el archivo `openssl.cnf` incluido en PHP. Reinicia PowerShell después de cambiar variables de entorno.

## Inicio

Ejecuta en terminales separadas:

```powershell
php artisan serve
npm run dev
```

Accede a `http://localhost:8000`. La URL configurada en `APP_URL` se usa para el QR y debe ser accesible desde el dispositivo que lo escanea.

## Persistencia local

- SQLite: `database/database.sqlite`.
- Constancias PDF y claves de firma: dentro de `storage/`.
- Blockchain: simulada en tablas SQLite.

No borres la base, las claves ni el almacenamiento si necesitas conservar datos. `php artisan migrate:fresh --seed` destruye los datos de la base y debe usarse solo en un entorno descartable.
