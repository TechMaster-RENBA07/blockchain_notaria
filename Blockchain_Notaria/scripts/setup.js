const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");
const templatePath = path.join(root, ".env.example");

if (fs.existsSync(envPath)) {
  console.error("Ya existe .env; no se modificó para proteger tu configuración actual.");
  process.exit(1);
}

const password = crypto.randomBytes(18).toString("base64url");
let content = fs.readFileSync(templatePath, "utf8");
content = content
  .replace(/^INITIAL_ADMIN_PASSWORD=.*$/m, `INITIAL_ADMIN_PASSWORD=${password}`)
  .replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${crypto.randomBytes(48).toString("base64url")}`)
  .replace(/^DOCUMENT_ENCRYPTION_KEY=.*$/m, `DOCUMENT_ENCRYPTION_KEY=${crypto.randomBytes(32).toString("base64")}`);

const descriptor = fs.openSync(envPath, "wx", 0o600);
try {
  fs.writeFileSync(descriptor, content, "utf8");
} finally {
  fs.closeSync(descriptor);
}

console.log("Configuración local creada y secretos generados.");
console.log("Guarda esta contraseña de administrador; solo se muestra una vez:");
console.log(`Correo: admin@notaria.local`);
console.log(`Contraseña: ${password}`);
