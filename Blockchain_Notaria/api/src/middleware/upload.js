const multer = require("multer");
const path = require("node:path");
const sharp = require("sharp");
const env = require("../config");
const MAX_IMAGE_PIXELS = 40_000_000;

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".xlsx", ".txt", ".png", ".jpg", ".jpeg"]);

const storage = multer.memoryStorage();
const fileFilter = (_req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return callback(new Error("Solo se permiten archivos PDF, DOCX, XLSX, TXT, PNG o JPG."));
  }
  callback(null, true);
};
const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter,
});
const compareUpload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 2 },
  fileFilter,
});

async function validateFileSignature(file) {
  if (!file?.buffer?.length) throw new Error("Debes adjuntar un archivo no vacío.");
  const extension = path.extname(file.originalname).toLowerCase();
  if (extension === ".pdf" && file.buffer.subarray(0, 5).toString() !== "%PDF-") {
    throw new Error("El archivo no tiene una cabecera PDF válida.");
  }
  if ((extension === ".docx" || extension === ".xlsx") && file.buffer.subarray(0, 2).toString() !== "PK") {
    throw new Error("El archivo Office no tiene un contenedor ZIP válido.");
  }
  if (extension === ".png" && file.buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("El archivo no tiene una cabecera PNG válida.");
  }
  if ((extension === ".jpg" || extension === ".jpeg")
    && file.buffer.subarray(0, 3).toString("hex") !== "ffd8ff") {
    throw new Error("El archivo no tiene una cabecera JPEG válida.");
  }
  if (extension === ".png" || extension === ".jpg" || extension === ".jpeg") {
    let metadata;
    try {
      metadata = await sharp(file.buffer, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
    } catch {
      throw new Error("La imagen está dañada o no se puede leer.");
    }
    if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
      throw new Error("La imagen supera el límite de tamaño seguro.");
    }
    const expectedFormat = extension === ".png" ? "png" : "jpeg";
    if (metadata.format !== expectedFormat || !metadata.width || !metadata.height) {
      throw new Error("El formato real de la imagen no coincide con su extensión.");
    }
  }
  if (extension === ".txt" && file.buffer.includes(0)) {
    throw new Error("El archivo TXT contiene bytes binarios no permitidos.");
  }
  return { extension, mimeType: file.mimetype || "application/octet-stream" };
}

module.exports = { upload, compareUpload, validateFileSignature };
