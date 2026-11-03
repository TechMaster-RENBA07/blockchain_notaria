# Base de datos local

La base SQLite se crea en `database/database.sqlite`. Ejecuta migraciones y seeders con:

```powershell
php artisan migrate --seed
```

## Datos almacenados

- Usuarios, roles y oficina.
- Catálogo de actos extraprotocolarios.
- Asunto, persona vinculada, fecha, estado y nota administrativa del registro.
- Huella de los datos, firma criptográfica y relación con el bloque local.
- Eventos de auditoría y consultas por código/QR.

## Persistencia de archivos

El modelo actual genera y almacena una constancia PDF, pero no recibe ni conserva el archivo original de la carta, declaración, poder u otro acto. La carga de originales con cifrado, control de acceso y política de retención está pendiente.

No registres información real ni datos personales innecesarios hasta completar la revisión legal y de privacidad. Haz respaldos consistentes de la base, las claves de firma y los PDFs.

## Desarrollo

Para borrar y recrear la base local con datos semilla:

```powershell
php artisan migrate:fresh --seed
```

Este comando es destructivo y no debe ejecutarse en una base con datos que deban conservarse.
