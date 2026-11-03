# Blockchain simulada local

## Funcionamiento

La implementación predeterminada escribe bloques en SQLite. Cada bloque contiene datos técnicos del registro, un hash, el hash del bloque anterior, una marca temporal y un nonce. El servicio inspecciona el encadenamiento y vuelve a calcular los hashes para detectar alteraciones.

## Alcance de la afirmación

Esta configuración no es una red blockchain pública ni distribuida. El bloque local permite probar la cadena de integridad, pero una base de datos local puede ser modificada por quien controle el equipo. No afirmes que el registro está anclado públicamente.

## Datos que se anclan

El payload contiene la identificación técnica y la huella del registro, no el archivo original. Evita incluir nombres, documentos de identidad, contenido de declaraciones o datos personales en la cadena.

## Producción

La integración a una red externa requerirá diseño, revisión legal, gestión segura de claves, política de costos y pruebas independientes. No configures wallets o contratos de producción hasta que esos controles estén aprobados.
