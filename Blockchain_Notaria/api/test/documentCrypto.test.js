const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { decryptBuffer, encryptBuffer, parseEncryptionKey, sha256 } = require("../src/lib/documentCrypto");

test("encrypts and decrypts the original file bytes", () => {
  const key = crypto.randomBytes(32);
  const original = Buffer.from("expediente notarial de prueba");
  const encrypted = encryptBuffer(original, key);

  assert.notDeepEqual(encrypted, original);
  assert.deepEqual(decryptBuffer(encrypted, key), original);
});

test("rejects modified ciphertext and an incorrect key", () => {
  const key = crypto.randomBytes(32);
  const encrypted = encryptBuffer(Buffer.from("contenido"), key);
  const modified = Buffer.from(encrypted);
  modified[modified.length - 1] ^= 1;

  assert.throws(() => decryptBuffer(modified, key));
  assert.throws(() => decryptBuffer(encrypted, crypto.randomBytes(32)));
});

test("requires a base64 encryption key containing exactly 32 bytes", () => {
  assert.equal(parseEncryptionKey(crypto.randomBytes(32).toString("base64")).length, 32);
  assert.throws(() => parseEncryptionKey(crypto.randomBytes(31).toString("base64")), /32 bytes/);
});

test("computes a stable SHA-256 digest", () => {
  assert.equal(
    sha256(Buffer.from("abc")),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});
