const assert = require("node:assert/strict");
const test = require("node:test");
const sharp = require("sharp");
const { validateFileSignature } = require("../src/middleware/upload");

test("accepts actual PNG and JPEG image buffers for document registration", async () => {
  const png = await sharp({
    create: { width: 200, height: 160, channels: 3, background: "#fff" },
  }).png().toBuffer();
  const jpeg = await sharp({
    create: { width: 200, height: 160, channels: 3, background: "#fff" },
  }).jpeg().toBuffer();

  assert.equal((await validateFileSignature({
    originalname: "acta.png",
    mimetype: "image/png",
    buffer: png,
  })).extension, ".png");
  assert.equal((await validateFileSignature({
    originalname: "foto.jpg",
    mimetype: "image/jpeg",
    buffer: jpeg,
  })).extension, ".jpg");
});

test("rejects an image whose extension does not match its decoded format", async () => {
  const png = await sharp({
    create: { width: 100, height: 100, channels: 3, background: "#fff" },
  }).png().toBuffer();

  await assert.rejects(
    validateFileSignature({
      originalname: "falso.jpg",
      mimetype: "image/jpeg",
      buffer: png,
    }),
    /cabecera JPEG|no coincide/,
  );
});

test("rejects damaged images", async () => {
  await assert.rejects(
    validateFileSignature({
      originalname: "falso.png",
      mimetype: "image/png",
      buffer: Buffer.from("89504e470d0a1a0a", "hex"),
    }),
    /dañada|no se puede leer/,
  );
});
