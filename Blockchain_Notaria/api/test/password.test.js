const assert = require("node:assert/strict");
const test = require("node:test");
const { hashPassword, verifyPassword } = require("../src/lib/password");

test("password hashes verify only the matching password", async () => {
  const password = "una-clave-notarial-larga-y-privada";
  const hash = await hashPassword(password);

  assert.notEqual(hash, password);
  assert.match(hash, /^scrypt\$16384\$8\$1\$/);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("otra-clave", hash), false);
});

test("malformed password hashes fail closed", async () => {
  assert.equal(await verifyPassword("password", ""), false);
  assert.equal(await verifyPassword("password", "scrypt$999999999$8$1$x$y"), false);
});
