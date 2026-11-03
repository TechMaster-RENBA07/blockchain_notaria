const assert = require("node:assert/strict");
const test = require("node:test");
const { createCertificate } = require("../src/services/certificateService");

test("PDF certificate includes a QR image and its public verification URL", async () => {
  const pdf = await createCertificate({
    reference: "CARTA-PRUEBA-001",
    type: "NOTARIAL_LETTER",
    publicId: "11111111-2222-4333-8444-555555555555",
    currentHash: "a".repeat(64),
    chainStatus: "PENDING",
    transactionHash: null,
    chainId: null,
    createdAt: new Date("2026-01-01T12:00:00.000Z"),
  }, "http://127.0.0.1:5173/verificar/11111111-2222-4333-8444-555555555555");
  const pdfText = pdf.toString("latin1");

  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.match(pdfText, /\/Subtype\s*\/Image/);
  assert.match(pdfText, /\/URI \(http:\/\/127\.0\.0\.1:5173\/verificar\/11111111-2222-4333-8444-555555555555\)/);
  assert.doesNotMatch(pdfText, /ESCANEA PARA VERIFICAR/);
});
