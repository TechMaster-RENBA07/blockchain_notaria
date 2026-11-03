# Informe del proyecto: Nexo Notarial

**Fecha de revisión:** 22 de octubre de 2026  
**Estado:** sistema funcional en entorno local; publicación externa, revisión de producción y anclaje real en blockchain pendientes.

## 1. Resumen ejecutivo

Nexo Notarial es una aplicación web para organizar documentos relacionados con actuaciones notariales extraprotocolarias en Perú. Permite registrar archivos, calcular su huella SHA-256, conservarlos cifrados localmente, mantener versiones, gestionar usuarios y producir constancias y copias con códigos QR de consulta.

La aplicación web, la API y la base de datos local funcionan en el equipo de desarrollo. La red HSK Testnet responde con Chain ID 133 y el proyecto incluye el contrato y comandos para preparar una wallet y desplegarlo. Sin embargo, la wallet configurada no tiene fondos, no existe una dirección de contrato desplegada en la configuración local y la aplicación no se encuentra publicada en una dirección accesible desde Internet. Por eso, **el anclaje blockchain y la verificación desde teléfonos externos todavía no están operativos**.

El sistema es una herramienta técnica de gestión e integridad de archivos. No sustituye la identificación, firma, protocolo, fe pública ni las formalidades legales propias de una actuación notarial.

## 2. Alcance funcional

### Incluido

- Gestión de documentos extraprotocolarios, como cartas notariales, constataciones de hechos, declaraciones, poderes simples, autorizaciones y otros tipos configurados.
- Alta de documentos con referencia, tipo, notas y archivo adjunto.
- Cálculo de la huella SHA-256 del archivo original.
- Almacenamiento local del archivo cifrado con AES-256-GCM.
- Consulta autenticada de expedientes y sus versiones.
- Comparación de un archivo presentado con la huella registrada.
- Comparación temporal de dos archivos en la pantalla **Comparar archivos**: SHA-256 completo de cada archivo, resultado de igualdad byte por byte, vista PDF/imagen/texto lado a lado, diferencias resaltadas para texto extraíble en PDF/DOCX/XLSX/TXT y modo diferencia para imágenes. Los archivos de comparación no se guardan como expedientes; la auditoría conserva solo los hashes y el resultado.
- Registro de nuevas versiones, conservando los metadatos y archivos anteriores.
- Constancia PDF con identificador público, huella, estado de anclaje y QR.
- Descarga del QR de consulta como PNG transparente o PDF de una página que contiene solo el QR.
- Descarga de una copia con QR PNG superpuesto en todas las páginas PDF, en los encabezados DOCX, en las hojas XLSX o sobre imágenes PNG/JPG, sin modificar las dimensiones del archivo.
- Descarga de una representación PDF de consulta para TXT, que no admite un QR integrado como imagen manteniendo el formato.
- Conservación y descarga independiente del archivo original sin modificar.
- Consulta pública de información técnica asociada al identificador del QR.
- Administración de usuarios con roles de Administrador, Notario, Operador y Auditor.
- Registro de eventos de auditoría para actividades del sistema.
- Contrato EVM para registrar la huella y las versiones de un documento, una vez desplegado y configurado.

### Fuera del alcance

- Escrituras públicas u otros actos que requieran un protocolo distinto.
- Validación jurídica del contenido, identidad, autoría, firma o fecha cierta.
- Firma digital cualificada, autenticación de identidad o integración con servicios oficiales.
- Despliegue en producción, alojamiento público, dominio, certificados TLS y copias externas.
- Garantía de disponibilidad, custodia institucional, conservación reglamentaria o recuperación ante desastres.

## 3. Arquitectura

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| Interfaz web | React, Vite, Bootstrap 5 | Inicio de sesión, panel, documentos, constancias, verificación y administración |
| API | Node.js, Express | Autenticación, permisos, expedientes, auditoría, verificación y conexión blockchain |
| Base de datos | SQLite con Prisma | Usuarios, documentos, versiones, estados de cadena y auditoría |
| Archivos | Sistema de archivos local | Conservación cifrada fuera de la blockchain |
| Contrato | Solidity, compatible con EVM | Registro inmutable de identificadores y huellas por versión |
| Red configurada | HSK Chain Testnet | Red de prueba, Chain ID 133 |

La API local escucha en `127.0.0.1:3001` y la interfaz de desarrollo en `127.0.0.1:5173`. Al estar ligada a loopback y usar direcciones locales, la configuración actual es solo para el mismo equipo; no permite que un teléfono externo consulte el QR.

## 4. Flujo de registro y verificación

1. Un usuario autorizado inicia sesión.
2. La API valida el tipo de archivo y los datos del expediente.
3. Se calcula la huella SHA-256 del archivo recibido.
4. El archivo se cifra con AES-256-GCM y se guarda en `private-storage/`; no se envía el archivo a la blockchain.
5. Los metadatos y la huella se guardan en SQLite.
6. Si hay una red, contrato y wallet válidos configurados, la API intenta anclar la huella. Si no, el estado queda pendiente o fallido, según el resultado.
7. El sistema genera una constancia PDF con la huella y el QR.
8. Al abrir el QR, la aplicación consulta el identificador público y muestra el estado técnico disponible. Si el anclaje está habilitado, compara la última huella de la cadena con la guardada en la base de datos.
9. En **Comparar archivos**, se pueden cargar dos archivos para calcular ambas huellas completas y determinar igualdad byte por byte. Cuando se extrae texto de PDF, DOCX, XLSX o TXT, se resaltan líneas añadidas y eliminadas; para imágenes se puede revisar la diferencia visual superpuesta. La extracción textual se limita a 1.500 líneas y 500.000 caracteres combinados, y no incluye OCR de PDF escaneados.
10. Para comprobar un archivo contra un expediente, el operador lo carga en la función **Verificar un archivo**; la aplicación calcula nuevamente la huella y la compara con la versión vigente local y, si el anclaje está configurado y accesible, con el registro de blockchain.

La consulta pública no devuelve el archivo privado. Expone datos técnicos mínimos del registro, como tipo, fecha, estado y, cuando corresponde, datos de la transacción.

La comparación por hash establece igualdad o diferencia de bytes; no explica por sí sola el cambio, por lo que la interfaz muestra diferencias de contenido cuando es posible extraer texto. Una coincidencia de hash local tampoco sustituye la confirmación independiente del contrato y de la transacción en la red.

## 5. Código QR: descarga y verificación

- El QR dirige a `/verificar/{identificador público}`. Se puede descargar como PNG transparente o como PDF de una página con solo el código; la constancia PDF también incluye el QR.
- En el detalle de un expediente, **Descargar copia con QR** crea una copia derivada en el formato original para PDF, DOCX, XLSX, PNG y JPEG. El QR se coloca en la parte superior: en PDF se superpone a todas las páginas sin cambiar sus dimensiones; en Word se integra como objeto flotante en los encabezados; en Excel se inserta como objeto flotante en cada hoja; en imágenes se compone sobre la imagen sin cambiar su ancho o alto.
- La imagen QR se genera como PNG transparente, sin rótulos ni recuadro; se inserta igual en PDF, DOCX, XLSX y PNG/JPEG. Se rechazan imágenes que no tienen dimensiones suficientes para que el QR mantenga un tamaño legible.
- La copia derivada puede invalidar firmas digitales embebidas en el original. El QR puede cubrir texto, sellos o firmas que coincidan con la esquina superior derecha; revisa cada copia antes de imprimirla o distribuirla. El original se mantiene cifrado y descargable sin alteraciones.
- TXT no incorpora imágenes QR como elemento del archivo en el flujo actual; se genera un PDF de consulta con el QR. Si el contenido no puede leerse o supera los límites de conversión, la API devuelve un error claro.
- La constancia PDF separada permanece disponible. El QR del archivo derivado y la constancia consultan el mismo identificador público.
- El PDF generado por la API construye el enlace usando `PUBLIC_APP_URL` de `.env`; la vista de constancia del navegador usa el origen actual de la aplicación.
- La configuración local utiliza direcciones `127.0.0.1`; el QR solo funciona en el equipo mientras los servicios estén activos. Para consultar desde un teléfono, se requiere desplegar la aplicación con una dirección HTTPS accesible y configurar esa URL.
- En el estado actual la consulta puede localizar el registro local, pero no puede confirmar blockchain porque el contrato todavía no está desplegado.
- El archivo original se conserva para que su huella SHA-256 represente exactamente el archivo recibido. La copia con QR es distinta y su hash no será igual al original; verifica siempre el archivo original cuando se requiera comparar la huella.

## 6. Usuarios, roles y acceso

| Rol | Uso previsto |
|---|---|
| Administrador | Gestiona usuarios, consulta expedientes y auditoría, registra y reintenta anclajes |
| Notario | Consulta expedientes permitidos y puede reintentar anclajes |
| Operador | Registra documentos y versiones según los permisos del sistema |
| Auditor | Consulta expedientes y eventos de auditoría; no administra usuarios |

Las cuentas nuevas se crean desde la sección **Usuarios**, disponible para administradores. El alta valida el correo, el nombre, la contraseña y el rol. Las contraseñas se almacenan como hash con scrypt y no como texto legible.

La API establece cookies de sesión `HttpOnly`, `SameSite=Strict` y marca `Secure` en modo producción. El inicio de sesión está limitado a cinco intentos por ventana de 15 minutos. El permiso se vuelve a comprobar en el servidor; ocultar una opción en la interfaz no sustituye esta autorización.

## 7. Datos y almacenamiento

### Base de datos

La base local se encuentra en `api/notaria.db`. Contiene:

- `User`: cuentas, correo, rol y estado.
- `Document`: datos generales del expediente, huella actual y estado de anclaje.
- `DocumentRevision`: historial de versiones y huellas.
- `AuditEvent`: eventos asociados a usuarios y documentos.

### Archivos

Los archivos cifrados se guardan en `private-storage/`. La base almacena la ruta interna, metadatos y hashes. La clave AES se guarda en `.env`; perderla impide descifrar los archivos respaldados.

### Respaldo

Para respaldar una instalación local, detener la API y copiar de forma segura:

1. `api/notaria.db`
2. La carpeta `private-storage/`
3. `.env`, con permisos restringidos y separado del repositorio

Los tres componentes deben conservarse juntos y probarse periódicamente mediante una restauración controlada. Una copia de la base sin los archivos o sin la clave de cifrado no permite recuperar los originales.

## 8. Blockchain

### Elementos disponibles

- Contrato: `contracts/NotarialDocumentRegistry.sol`.
- Compilador Solidity agregado al workspace de API.
- Comando `npm run blockchain:wallet` para crear una wallet local de prueba y guardar su clave en `.env` sin imprimirla.
- Comando `npm run blockchain:deploy` para compilar, comprobar el Chain ID, verificar saldo, desplegar y guardar la dirección del contrato.
- Función para registrar la primera huella y añadir versiones posteriores desde la wallet configurada.
- Ruta de reintento de anclaje disponible para Administrador y Notario.

### Estado comprobado en esta revisión

- RPC `https://testnet.hsk.xyz`: responde correctamente.
- Chain ID remoto: `133`.
- Wallet local de prueba: creada y guardada en `.env`; su clave no se incluye en este informe.
- Saldo observado: `0 HSK`.
- Dirección de contrato: no configurada.
- Despliegue: no completado por falta de fondos de prueba.
- Anclaje de documentos: pendiente mientras no se despliegue y configure el contrato.

No se debe afirmar que un expediente está anclado hasta que haya una transacción confirmada y la consulta pueda cotejar la huella en la red.

## 9. Rutas principales de API

| Ruta | Acceso | Función |
|---|---|---|
| `GET /api/health` | Estado del servicio | Comprueba la base de datos e informa si blockchain está configurada |
| `POST /api/auth/login` | Público, limitado por tasa | Inicia sesión |
| `GET /api/auth/me` | Sesión | Devuelve la cuenta activa |
| `POST /api/auth/logout` | Sesión | Cierra la sesión |
| `GET /api/users` | Administrador | Lista cuentas |
| `POST /api/users` | Administrador | Crea una cuenta con rol |
| `GET /api/documents` | Sesión | Lista expedientes según permisos |
| `POST /api/documents` | Administrador, Notario u Operador | Registra expediente y archivo |
| `GET /api/documents/:id` | Sesión y permiso sobre expediente | Consulta detalle y versiones |
| `POST /api/documents/:id/verify` | Sesión y permiso sobre expediente | Compara un archivo con su huella |
| `POST /api/documents/:id/revisions` | Administrador, Notario u Operador autorizado | Registra una nueva versión |
| `POST /api/documents/:id/anchor` | Administrador o Notario autorizado | Reintenta anclaje |
| `GET /api/documents/:id/certificate` | Sesión y permiso sobre expediente | Descarga constancia PDF |
| `GET /api/documents/:id/qr.png` | Sesión y permiso sobre expediente | Descarga QR PNG transparente |
| `GET /api/documents/:id/qr.pdf` | Sesión y permiso sobre expediente | Descarga PDF con solo el QR |
| `GET /api/documents/:id/file-with-qr` | Sesión y permiso sobre expediente | Descarga copia con QR; conserva PDF, DOCX, XLSX, PNG/JPEG y convierte TXT a PDF |
| `GET /api/public/verify/:publicId` | Público, limitado por tasa | Consulta el registro del QR |
| `GET /api/audit` | Administrador o Auditor | Consulta hasta 200 eventos recientes |

## 10. Estructura del proyecto

```text
Blockchain_Notaria/
├── api/
│   ├── prisma/              # Esquema y migraciones de SQLite
│   ├── src/
│   │   ├── lib/              # Prisma, criptografía, contraseñas y validación
│   │   ├── middleware/       # Autenticación, permisos y carga
│   │   ├── routes/           # Autenticación, usuarios, documentos, auditoría y QR
│   │   └── services/         # Blockchain, certificados y archivos cifrados
│   └── test/                 # Pruebas de API y servicios
├── contracts/
│   └── NotarialDocumentRegistry.sol
├── scripts/
│   ├── setup.js              # Configuración inicial local
│   ├── create-blockchain-wallet.js
│   └── deploy-blockchain.js
│   ├── Iniciar-Blockchain-Notaria.ps1
│   └── generar-informe.py
├── web/
│   └── src/                  # Interfaz React y estilos
├── private-storage/          # Archivos cifrados locales, excluidos de Git
├── .env.example              # Plantilla sin secretos
├── Iniciar-Blockchain-Notaria.cmd
├── README.md                 # Inicio rápido
└── INFORME_PROYECTO.md       # Este informe
```

## 11. Instalación y operación local

Requisitos: Windows, Node.js 20 o posterior y npm.

Desde la carpeta `Blockchain_Notaria`, en PowerShell:

```powershell
npm install
npm run setup
```

Guardar la contraseña de administrador que el asistente muestra una sola vez. Abrir dos terminales:

```powershell
npm run dev:api
```

```powershell
npm run dev:web
```

Para el inicio diario local, haz doble clic en `Iniciar-Blockchain-Notaria.cmd`. El script verifica requisitos, abre la API y la interfaz en ventanas separadas, espera la respuesta de los servicios y abre el navegador. Para la configuración inicial, sigue los pasos manuales anteriores. Abre `http://127.0.0.1:5173` e inicia sesión con la cuenta y contraseña iniciales. La API local se comprueba en `http://127.0.0.1:3001/api/health`.

## 12. Pruebas y validaciones ejecutadas

En la última revisión del código se verificó:

- `npm run build`: compilación del frontend exitosa.
- `npm test`: 25 pruebas exitosas en la última ejecución; cubren constancias, QR transparente y QR en PDF sin rótulos, cifrado/descifrado, validación AES y SHA-256, contraseñas, usuarios, inserción flotante DOCX, XLSX y PNG/JPEG, conversión TXT y validación de imágenes.
- Compilación Solidity local: exitosa.
- RPC HSK: respuesta correcta y Chain ID 133.
- Despliegue del contrato: no ejecutable hasta que la wallet tenga saldo.
- Lanzador Windows: implementado; requiere validación en el equipo de operación.

Estas comprobaciones no equivalen a una auditoría de seguridad, pruebas de carga, prueba de recuperación ante desastres ni aprobación legal. El lanzador de Windows es para iniciar el entorno local de desarrollo, no crea un servicio de producción ni publica la aplicación.

## 13. Pendientes para una puesta en servicio real

### Necesarios para probar anclaje en HSK Testnet

1. Conseguir fondos HSK de prueba por un canal oficial disponible para la red y transferirlos a la dirección pública de la wallet local.
2. Confirmar el saldo mediante el RPC.
3. Ejecutar `npm run blockchain:deploy`.
4. Verificar la dirección y transacción del contrato en el explorador.
5. Reiniciar la API y comprobar que `/api/health` informe blockchain configurada.
6. Reintentar el anclaje de los expedientes pendientes.
7. Escanear un QR y comprobar que la huella confirmada coincide con la transacción de la red.

No se logró confirmar un faucet operativo durante esta revisión; por tanto, la obtención de fondos sigue siendo una dependencia externa.

### Necesarios para QR desde otros dispositivos

1. Elegir un proveedor de alojamiento y un dominio o URL pública bajo control de la notaría.
2. Desplegar frontend y API con HTTPS y configurar el acceso público de forma segura.
3. Ajustar `PUBLIC_APP_URL`, `PUBLIC_API_URL`, `FRONTEND_ORIGIN`, cookies y variables de frontend al dominio real.
4. Exponer solo la ruta pública de verificación; no exponer SQLite ni el almacenamiento privado.
5. Probar el flujo con un teléfono desde una red distinta a la del servidor.

### Necesarios antes de usar expedientes reales

- Revisión legal y de privacidad aplicable a la notaría y su jurisdicción.
- Revisión de seguridad independiente, incluida gestión de secretos y permisos del servidor.
- Revisar las vulnerabilidades reportadas por `npm install` (en esta actualización: 6 altas) y actualizar dependencias de forma controlada.
- Definir control de acceso físico y lógico, retención, eliminación, recuperación y responsables.
- Definir copias cifradas externas y probar procedimientos de restauración.
- Usar una wallet institucional bajo custodia definida; nunca usar la wallet de prueba para producción.
- Migrar a infraestructura adecuada para concurrencia y operación institucional si SQLite local no cubre los requisitos.
- Establecer monitorización, actualizaciones, TLS, firewall, registros y plan de continuidad.

## 14. Evaluación final

**Listo para demostración y pruebas locales:** interfaz, API, SQLite, cuentas y roles, cifrado local, registro de documentos, consulta técnica local, PDF con QR y contrato compilable.

**No listo para considerarse 100 % operativo en Internet o producción:** el contrato no está desplegado, la wallet no tiene fondos, la URL del QR es local, no hay alojamiento público configurado y quedan revisiones de seguridad, legales y operativas.

La aplicación debe presentarse como una herramienta local en desarrollo hasta completar los pendientes de la sección 13. El QR conduce a la consulta cuando el entorno que lo sirve está accesible; por sí solo no publica la aplicación ni acredita validez notarial.

### Revisión de dependencias de esta entrega

Se actualizaron Vite a 6.4.5 y React Router DOM a 7.18.4 para atender avisos encontrados en versiones anteriores. La última instalación de dependencias reportó 6 vulnerabilidades altas; deben verificarse con `npm audit`, analizar su impacto y actualizarse de forma controlada antes de una cadena de compilación de producción. No debe interpretarse el resultado de análisis como certificación de seguridad.
