# Integridad y firma criptográfica del registro

## Huella SHA-256

El sistema normaliza los campos del registro y calcula `content_hash`. Si cambian los datos que participan en esa huella, la comparación detecta la alteración. La huella corresponde a los metadatos del registro, no al archivo original del acto, que actualmente no se almacena.

## Firma RSA

La aplicación firma la huella usando una clave privada asociada a la oficina. La verificación consulta la clave pública correspondiente. Esta firma es criptográfica del sistema; no equivale a una firma notarial ni a una firma digital legalmente reconocida.

## Operación de claves

- Mantén las claves privadas fuera del repositorio y fuera del almacenamiento público.
- Restringe el acceso al directorio `storage/keys`.
- Respáldalas de forma protegida; sin la clave privada no se podrán crear nuevas firmas con esa identidad.
- Planifica rotación, revocación y recuperación antes de un uso institucional.

La aplicación requiere revisión de seguridad y de custodia de claves antes de ingresar expedientes reales.
