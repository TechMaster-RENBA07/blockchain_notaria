const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const path = require("node:path");

async function createCertificate(document, publicVerificationUrl) {
  const qrCode = await QRCode.toBuffer(publicVerificationUrl, {
    type: "png",
    width: 240,
    margin: 4,
    errorCorrectionLevel: "H",
    color: { dark: "#FFFFFFFF", light: "#00000000" },
  });
  const logoPath = path.resolve(__dirname, "../../../web/public/milton-guzman-notaria.png");
  const pdf = new PDFDocument({ size: "A4", margin: 54, info: { Title: "Constancia técnica de integridad", Author: "Nexo Notarial" } });
  const chunks = [];
  pdf.on("data", (chunk) => chunks.push(chunk));
  const completed = new Promise((resolve, reject) => {
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
  });

  pdf.rect(0, 0, pdf.page.width, 150).fill("#123c8c");
  pdf.rect(0, 146, pdf.page.width, 4).fill("#d71920");
  pdf.image(logoPath, 48, 34, { fit: [68, 68] });
  pdf.fillColor("#ffffff").fontSize(9).text("MILTON GUZMÁN · ABOGADO NOTARIO", 128, 45, { characterSpacing: 1 });
  pdf.fillColor("#ffffff").fontSize(16).font("Helvetica-Bold").text("Constancia técnica de integridad", 128, 68, { width: 300 });
  pdf.fillColor("#dce7fa").font("Helvetica").fontSize(8).text("Registro verificable de huella digital", 128, 108, { width: 300 });
  pdf.image(qrCode, 464, 39, { width: 68, height: 68 });
  let y = 190;
  const field = (label, value) => {
    pdf.fillColor("#64748b").font("Helvetica-Bold").fontSize(9).text(label.toUpperCase(), 54, y);
    y += 17;
    pdf.fillColor("#0f172a").font("Helvetica").fontSize(12).text(String(value || "No disponible"), 54, y, { width: 480 });
    y = pdf.y + 21;
  };

  field("Referencia del documento", document.reference);
  field("Tipo de acto extraprotocolar", document.type);
  field("Identificador de consulta", document.publicId);
  field("Huella SHA-256", document.currentHash);
  field("Estado de anclaje", document.chainStatus === "ANCHORED" ? "Anclado en blockchain" : `No anclado (${document.chainStatus})`);
  if (document.transactionHash) field("Transacción", document.transactionHash);
  if (document.chainId) field("Chain ID", document.chainId);
  field("Fecha de registro en base de datos", document.createdAt.toISOString());

  y += 5;
  pdf.roundedRect(54, y, 487, 83, 8).fillAndStroke("#fff7ed", "#fed7aa");
  pdf.fillColor("#9a3412").font("Helvetica-Bold").fontSize(10).text("Importante", 68, y + 13);
  pdf.fillColor("#7c2d12").font("Helvetica").fontSize(9).text(
    "Esta constancia permite revisar la integridad del archivo. No reemplaza la actuación ni las formalidades notariales.",
    68,
    y + 31,
    { width: 456, height: 44, lineGap: 2 }
  );

  y += 112;
  pdf.fillColor("#475569").fontSize(9).text(`Verificación pública: ${publicVerificationUrl}`, 54, y, { width: 487, link: publicVerificationUrl, underline: true });
  pdf.moveTo(54, 744).lineTo(541, 744).strokeColor("#e2e8f0").stroke();
  pdf.fillColor("#94a3b8").fontSize(8).text("Emitido por sistema de gestión documental · Conserve el archivo original y este identificador.", 54, 756);
  pdf.end();
  return completed;
}

module.exports = { createCertificate };
