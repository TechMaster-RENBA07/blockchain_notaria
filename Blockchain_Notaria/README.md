# Nexo Notarial

Aplicación local para gestionar documentos notariales extraprotocolarios: cartas notariales, constataciones de hechos, declaraciones juradas, poderes simples, autorizaciones y otros actos configurados. No necesita una API de terceros, Docker ni instalar un servidor de base de datos. La web y la API corren en tu equipo; SQLite guarda los datos localmente.

Consulta [INFORME_PROYECTO.md](./INFORME_PROYECTO.md) para el alcance completo, arquitectura, flujo del QR, estado real de blockchain, rutas API, seguridad, pruebas y pendientes de publicación.
También está disponible en [formato Word](./INFORME_PROYECTO.docx), con portada y formato institucional blanco y azul. Para regenerarlo tras editar el Markdown:

```powershell
python -m pip install -r scripts/requirements-report.txt
python scripts/generar-informe.py
```

El generador de Word usa Python y `python-docx`; es independiente de la aplicación web.

> Es una herramienta de gestión técnica. No acredita por sí sola identidad, autoría, firma, fecha cierta, veracidad ni validez legal de un documento o actuación notarial.

## Inicio rápido en Windows

Requiere Node.js 20 o posterior. En PowerShell, abre la carpeta `Blockchain_Notaria` y ejecuta:

```powershell
npm install
npm run setup
```

`npm run setup` crea `.env`, genera las claves locales, crea la base de datos SQLite y prepara el esquema. Muestra una contraseña aleatoria para el administrador inicial **una sola vez**; guárdala antes de continuar. El usuario inicial es `admin@notaria.local`. Si ya existe `.env`, el asistente no lo sobrescribe.

Abre dos terminales en esa misma carpeta:

```powershell
npm run dev:api
```

```powershell
npm run dev:web
```

Abre `http://127.0.0.1:5173`. La API local corre en `http://127.0.0.1:3001`; el indicador del login informa si está disponible. Usa el correo y la contraseña que mostró el asistente.

En los siguientes inicios, puedes hacer doble clic en `Iniciar-Blockchain-Notaria.cmd`. El script inicia los servidores locales en ventanas separadas, comprueba que respondan y abre la aplicación en el navegador. Este lanzador es para desarrollo local, no es un instalador ni pone el sistema en producción. La primera vez, completa antes `npm install` y `npm run setup`.

## Datos y archivos locales

- La base de datos está en `api/notaria.db`.
- Los documentos se cifran con AES-256-GCM y se guardan fuera de la cadena en `private-storage/`.
- El QR de verificación se descarga como PNG con fondo transparente o como PDF de una página que contiene solo el QR. La constancia PDF también incluye el QR.
- En el detalle de cada expediente, **Descargar copia con QR** inserta el QR sin rótulos ni recuadro en la esquina superior derecha de todas las páginas PDF, en los encabezados de Word, en las hojas de Excel y sobre las imágenes PNG/JPG, sin ampliar las dimensiones del original. TXT se convierte a un PDF de consulta porque ese formato no admite imágenes QR. El QR puede cubrir contenido situado en esa zona; revisa la copia antes de imprimirla o compartirla. **Descargar original** conserva el archivo registrado sin cambios y es el que se usa para verificar su huella. La copia derivada puede invalidar firmas digitales del original.
- Las imágenes de menos de 96 píxeles útiles para el QR se rechazan en la copia derivada para evitar un código ilegible. El original sigue disponible y sin cambios.
- **Comparar archivos** calcula SHA-256 completo de dos archivos sin guardarlos. Muestra hashes, igualdad byte por byte y vistas lado a lado; resalta cambios textuales para PDF, DOCX, XLSX y TXT y ofrece superposición visual para imágenes. La extracción textual está limitada a 1.500 líneas y 500.000 caracteres combinados. Los archivos escaneados sin texto extraíble se comparan por hash y vista, no por OCR.
- La comparación no crea un expediente ni prueba por sí sola el anclaje blockchain. Para verificar un archivo contra un registro existente, usa **Verificar un archivo** dentro del expediente; la pantalla distingue la coincidencia local de la confirmación en cadena.
- La administración puede crear cuentas desde **Usuarios**, asignándoles uno de estos roles: Administrador, Notario, Operador o Auditor. Cada cuenta requiere una contraseña inicial de al menos 12 caracteres.
- Los administradores pueden archivar expedientes desde la lista de documentos y restaurarlos desde **Archivados**. Archivar no borra archivos, versiones ni auditoría; los QR existentes siguen consultando el expediente.
- Para que un teléfono externo abra el QR, cambia `PUBLIC_APP_URL` en `.env` a una dirección IP de red o dominio accesible desde ese teléfono; `127.0.0.1` solo funciona en el mismo equipo.
- `.env` contiene la clave de cifrado, el secreto de sesión y la contraseña inicial: no la compartas ni la subas al repositorio.
- Haz copias de seguridad de `api/notaria.db`, `private-storage/` y `.env`. Sin `.env`, los archivos cifrados no se pueden recuperar.
- La blockchain es opcional; sin RPC, contrato y firmante configurados, los documentos quedan pendientes de anclaje.
- **Comparar archivos** no escribe los archivos comparados en SQLite ni en el almacenamiento privado; registra solo un evento de auditoría con los hashes y el resultado técnico.
- Para habilitar HSK Testnet, ejecuta `npm run blockchain:wallet`. Esto crea una wallet local y guarda su clave privada en `.env`; el comando solo muestra la dirección pública. Consigue HSK de prueba para esa dirección desde un faucet oficial. El RPC y Chain ID (133) están indicados en `.env.example`. Cuando tenga saldo, ejecuta `npm run blockchain:deploy` para compilar y desplegar el contrato; la dirección del contrato se guardará en `.env`. Reinicia la API y comprueba `/api/health` antes de reintentar los expedientes pendientes. El despliegue y cada anclaje consumen fondos de prueba de la wallet.

## Comandos

```powershell
npm run setup       # Preparar la base local por primera vez
npm run dev:api     # API y base de datos local
npm run dev:web     # Interfaz web
npm run build       # Compilación de producción del frontend
npm run test        # Pruebas automatizadas de la API
npm run blockchain:wallet # Crear una wallet local de prueba para HSK
npm run blockchain:deploy # Desplegar el registro en la red configurada
```

## Inicio rápido diario

Después de completar la instalación inicial, haz doble clic en `Iniciar-Blockchain-Notaria.cmd`. Comprueba que las ventanas de API y web indiquen que iniciaron correctamente. El lanzador consulta la salud de la API, informa si blockchain no está configurada y abre el navegador. También se puede ejecutar desde PowerShell:

```powershell
.\scripts\Iniciar-Blockchain-Notaria.ps1
```

Este lanzador inicia servidores de desarrollo locales; no configura servicio Windows, HTTPS, alojamiento remoto ni despliegue de producción.

El informe detallado está disponible en [Markdown](./INFORME_PROYECTO.md) y [Word](./INFORME_PROYECTO.docx).

Para aplicar un cambio nuevo de esquema en desarrollo, edita `api/prisma/schema.prisma`, genera una migración con `npm run db:migrate:dev` y vuelve a generar Prisma con `npm run db:generate`.

No ingreses expedientes reales hasta completar la revisión legal, privacidad, acceso, respaldo y operación institucional que corresponda.
