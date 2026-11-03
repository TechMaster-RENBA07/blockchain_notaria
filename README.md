# Blockchain Notaría

Aplicación local para gestionar registros técnicos de documentos y actos notariales extraprotocolarios en Perú: cartas notariales, constataciones de hechos, declaraciones juradas, poderes simples, autorizaciones y otros actos configurables. No está destinada a escrituras públicas.

La aplicación conserva datos en PostgreSQL, genera una constancia PDF con QR, firma criptográficamente los datos del registro y mantiene una cadena blockchain simulada local. La consulta pública informa únicamente sobre la integridad técnica.

> El sistema no acredita por sí solo identidad, firma, contenido, fecha cierta ni validez legal. No reemplaza la actuación notarial, el protocolo ni los requisitos aplicables. En su estado actual, registra metadatos; no carga ni conserva el archivo original del acto.

## Tecnologías

- Laravel 13, PHP 8.3 o posterior y Livewire.
- PostgreSQL local.
- PDF con QR de consulta.
- Firma RSA y blockchain simulada en la base de datos.
- Mailpit opcional para probar correos sin enviarlos a destinatarios reales.

## Preparación en Windows

Instala PHP 8.3+ con la extensión `pdo_pgsql`, Composer 2, Node.js 20+ y PostgreSQL. Crea una base vacía llamada `gestor_notaria` (o cambia el nombre en `.env`) y configura el usuario y la contraseña de PostgreSQL en `.env`. Desde la raíz del proyecto:

```powershell
Copy-Item .env.example .env
composer install
npm install
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
npm run build
```

Para generar claves RSA en Windows, configura `OPENSSL_CONF` con la ruta del archivo `openssl.cnf` de tu instalación de PHP.

## Inicio local

En terminales separadas:

```powershell
php artisan serve
npm run dev
```

Abre `http://localhost:8000`. El endpoint de consulta se incluye en el QR de la constancia; prueba el QR en el mismo equipo mientras `APP_URL` apunte a `http://localhost:8000`.

El seeder crea cuentas de desarrollo:

| Correo | Contraseña | Uso |
|---|---|---|
| `admin@notaria.local` | `password` | Administración |
| `notario@notaria.local` | `password` | Registro de actos |
| `auditor@notaria.local` | `password` | Consulta y auditoría |

Estas credenciales son solo para desarrollo local: cámbialas antes de cualquier uso compartido o despliegue.

## Flujo disponible

1. Inicia sesión con una cuenta autorizada.
2. Registra el tipo de acto, referencia, persona vinculada y nota administrativa.
3. El sistema genera una huella del registro, una firma criptográfica y un bloque en la blockchain simulada.
4. Descarga la constancia PDF, que incluye el QR.
5. Abre el QR para consultar la integridad técnica, el estado de firma y el anclaje local.

## Datos y límites

- La base principal es PostgreSQL. La configuración se toma de las variables `DB_*` en `.env`.
- Los PDFs se generan en el almacenamiento de Laravel.
- El QR consulta el registro; no contiene ni publica el expediente.
- La blockchain actual es simulada y reside en la base de datos; no es una red pública.
- No se almacena el archivo original del acto. La carga cifrada del documento original es una funcionalidad pendiente.
- No ingreses expedientes reales hasta completar revisión legal, privacidad, almacenamiento cifrado, control de acceso, copias de seguridad y operación institucional.

## Comandos útiles

```powershell
php artisan test
php vendor/bin/pint --test
npm run build
php artisan migrate:fresh --seed
```

`migrate:fresh --seed` elimina y vuelve a crear todas las tablas; úsalo únicamente si no necesitas conservar los datos actuales.

La configuración base está en `.env.example`. No compartas `.env`, contraseñas, claves privadas RSA, respaldos de la base de datos ni PDFs generados. Las migraciones crean el esquema y `--seed` inserta datos de demostración; no copia automáticamente registros de una base SQLite previa. Para trasladar datos existentes, conserva un respaldo de SQLite y planifica una importación antes de usar el sistema con PostgreSQL.

## Documentación

Consulta [docs/README.md](./docs/README.md) para la descripción del esquema, la integridad técnica, el entorno y las limitaciones funcionales.
