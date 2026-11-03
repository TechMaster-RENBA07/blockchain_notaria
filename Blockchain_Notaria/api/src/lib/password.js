const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const OPTIONS = { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION, maxmem: 64 * 1024 * 1024 };
const DUMMY_HASH = [
  "scrypt",
  COST,
  BLOCK_SIZE,
  PARALLELIZATION,
  Buffer.alloc(16).toString("base64url"),
  crypto.scryptSync("not-a-valid-account-password", Buffer.alloc(16), KEY_LENGTH, OPTIONS).toString("base64url"),
].join("$");

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, OPTIONS);
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELIZATION}$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

async function verifyPassword(password, encodedHash) {
  const [algorithm, cost, blockSize, parallelization, saltText, hashText, extra] = String(encodedHash || "").split("$");
  if (
    extra !== undefined
    || algorithm !== "scrypt"
    || cost !== String(COST)
    || blockSize !== String(BLOCK_SIZE)
    || parallelization !== String(PARALLELIZATION)
    || !/^[\da-zA-Z_-]{22}$/.test(saltText || "")
    || !/^[\da-zA-Z_-]{86}$/.test(hashText || "")
  ) {
    return false;
  }

  const expected = Buffer.from(hashText, "base64url");
  const actual = await scrypt(password, Buffer.from(saltText, "base64url"), expected.length, OPTIONS);
  return expected.length === KEY_LENGTH && crypto.timingSafeEqual(actual, expected);
}

module.exports = { DUMMY_HASH, hashPassword, verifyPassword };
