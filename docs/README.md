# Documentación de Blockchain Notaría

Documentación del sistema para registros técnicos de actuaciones notariales extraprotocolarias en Perú. No contempla escrituras públicas.

| Documento | Contenido |
|---|---|
| [REQUISITOS-PARA-EL-SOFTWARE.md](./REQUISITOS-PARA-EL-SOFTWARE.md) | Requisitos locales y arranque |
| [00-ENTORNO-LOCAL.md](./00-ENTORNO-LOCAL.md) | Preparación del entorno Windows |
| [00-SPRINT-0-ENTORNO.md](./00-SPRINT-0-ENTORNO.md) | Arquitectura de ejecución local |
| [01-SPRINT-1-MODELO-DATOS.md](./01-SPRINT-1-MODELO-DATOS.md) | Entidades y relaciones |
| [02-BASE-DE-DATOS.md](./02-BASE-DE-DATOS.md) | SQLite y esquema funcional |
| [02-SPRINT-2-CRIPTOGRAFIA.md](./02-SPRINT-2-CRIPTOGRAFIA.md) | Huellas y firma de aplicación |
| [03-SPRINT-3-BLOCKCHAIN.md](./03-SPRINT-3-BLOCKCHAIN.md) | Cadena local simulada |
| [04-SPRINT-4-EMISION.md](./04-SPRINT-4-EMISION.md) | Registro y constancia con QR |
| [CONTEXTO-PROGRESO.md](./CONTEXTO-PROGRESO.md) | Estado funcional conocido |
| [ROADMAP.md](./ROADMAP.md) | Trabajo pendiente para un uso institucional |

## Alcance actual

La interfaz permite registrar cartas notariales, constataciones de hechos, declaraciones juradas, poderes simples, autorizaciones y otros actos extraprotocolarios. Genera un PDF de constancia técnica y una consulta pública por QR.

El PDF y la consulta no acreditan identidad, firma, contenido, fecha cierta ni validez legal. El sistema no almacena actualmente el archivo original y usa una blockchain simulada en SQLite. No se deben ingresar expedientes reales hasta implementar y validar controles legales, privacidad, cifrado de archivos, respaldo y operación.
