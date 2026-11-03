const crypto = require("node:crypto");

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function parseEncryptionKey(value) {
  const key = Buffer.from(value || "", "base64");
  if (key.length !== 32) {
    throw new Error("DOCUMENT_ENCRYPTION_KEY debe ser una clave base64 de exactamente 32 bytes.");
  }
  return key;
}

function encryptBuffer(buffer, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), ciphertext]);
}

function decryptBuffer(encrypted, key) {
  if (encrypted.length < 29 || encrypted[0] !== 1) {
    throw new Error("Formato del archivo cifrado no reconocido.");
  }
  const iv = encrypted.subarray(1, 13);
  const authTag = encrypted.subarray(13, 29);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted.subarray(29)), decipher.final()]);
}

module.exports = { sha256, parseEncryptionKey, encryptBuffer, decryptBuffer };
