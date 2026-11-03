const fs = require("node:fs");
const path = require("node:path");
const { Wallet } = require("ethers");

const envPath = path.resolve(__dirname, "..", ".env");

function replaceSetting(content, key, value) {
  const setting = new RegExp(`^${key}=.*$`, "m");
  return setting.test(content)
    ? content.replace(setting, `${key}=${value}`)
    : `${content.trimEnd()}\n${key}=${value}\n`;
}

function main() {
  if (!fs.existsSync(envPath)) {
    throw new Error("No se encontró .env. Ejecuta npm run setup antes de preparar blockchain.");
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  const existingKey = envContent.match(/^BLOCKCHAIN_SIGNER_PRIVATE_KEY=(.+)$/m)?.[1].trim();
  if (existingKey) {
    const wallet = new Wallet(existingKey);
    console.log(`Ya existe una wallet configurada: ${wallet.address}`);
    console.log("La clave privada no se mostrará ni se modificará.");
    return;
  }

  const wallet = Wallet.createRandom();
  const updatedEnv = replaceSetting(envContent, "BLOCKCHAIN_SIGNER_PRIVATE_KEY", wallet.privateKey);
  fs.writeFileSync(envPath, updatedEnv, { mode: 0o600 });
  console.log("Wallet de prueba creada y guardada localmente en .env.");
  console.log(`Dirección pública para recibir HSK de testnet: ${wallet.address}`);
  console.log("No compartas la clave privada ni subas .env al repositorio.");
  console.log("Cuando la wallet tenga saldo, ejecuta npm run blockchain:deploy.");
}

try {
  main();
} catch (error) {
  console.error(`No se pudo preparar la wallet: ${error.message}`);
  process.exitCode = 1;
}
