const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const env = require("../config");
const { parseEncryptionKey, encryptBuffer, decryptBuffer } = require("../lib/documentCrypto");

let key;

function getKey() {
  if (!key) key = parseEncryptionKey(env.DOCUMENT_ENCRYPTION_KEY);
  return key;
}

async function ensureStorage() {
  await fs.mkdir(env.storagePath, { recursive: true, mode: 0o700 });
}

async function saveEncrypted(buffer, extension) {
  await ensureStorage();
  const fileId = randomUUID();
  const fileName = `${fileId}.enc`;
  const fullPath = path.join(env.storagePath, fileName);
  const encrypted = encryptBuffer(buffer, getKey());
  await fs.writeFile(fullPath, encrypted, { flag: "wx", mode: 0o600 });
  return { fileName, fileId, extension };
}

async function readDecrypted(fileName) {
  if (path.basename(fileName) !== fileName || !/^[\da-f-]{36}\.enc$/i.test(fileName)) {
    throw new Error("Ruta de almacenamiento no válida.");
  }
  const encrypted = await fs.readFile(path.join(env.storagePath, fileName));
  return decryptBuffer(encrypted, getKey());
}

async function removeEncrypted(fileName) {
  await fs.unlink(path.join(env.storagePath, path.basename(fileName)));
}

module.exports = { ensureStorage, saveEncrypted, readDecrypted, removeEncrypted };
