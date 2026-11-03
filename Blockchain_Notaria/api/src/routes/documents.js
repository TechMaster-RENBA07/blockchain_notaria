const crypto = require("node:crypto");
const path = require("node:path");
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { z } = require("zod");
const env = require("../config");
const prisma = require("../lib/prisma");
const { sha256 } = require("../lib/documentCrypto");
const storage = require("../services/storageService");
const blockchain = require("../services/blockchainService");
const { createCertificate } = require("../services/certificateService");
const { createQrDocument, createStandaloneQr } = require("../services/qrDocumentService");
const { compareFiles } = require("../services/documentComparisonService");
const { upload, compareUpload, validateFileSignature } = require("../middleware/upload");
const { requireAuth, requireRoles } = require("../middleware/auth");

const router = express.Router();
const compareLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false });
const documentTypes = ["NOTARIAL_LETTER", "FACT_INSPECTION", "SWORN_STATEMENT", "SIMPLE_POWER", "AUTHORIZATION", "OTHER_EXTRA_PROTOCOLAR"];
const createSchema = z.object({
  type: z.enum(documentTypes),
  reference: z.string().trim().min(2).max(80).regex(/^[\p{L}\p{N} ._/#-]+$/u),
  notes: z.string().trim().max(500).optional().default(""),
});

router.use(requireAuth);

function publicDocument(document) {
  return {
    id: document.id,
    publicId: document.publicId,
    type: document.type,
    reference: document.reference,
    notes: document.notes,
    originalName: document.originalName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    currentHash: document.currentHash,
    chainStatus: document.chainStatus,
    chainId: document.chainId,
    contractAddress: document.contractAddress,
    transactionHash: document.transactionHash,
    blockNumber: document.blockNumber?.toString() || null,
    archivedAt: document.archivedAt,
    createdAt: document.createdAt,
    createdBy: document.createdBy ? { displayName: document.createdBy.displayName, email: document.createdBy.email } : undefined,
    revisions: document.revisions?.map((revision) => ({
      id: revision.id,
      version: revision.version,
      fileHash: revision.fileHash,
      status: revision.status,
      originalName: revision.originalName,
      sizeBytes: revision.sizeBytes,
      hasFile: Boolean(revision.encryptedPath),
      transactionHash: revision.transactionHash,
      blockNumber: revision.blockNumber?.toString() || null,
      createdAt: revision.createdAt,
    })),
  };
}

async function recordAnchor(document, revision, isNewDocument) {
  try {
    const chain = await blockchain.anchorDocument(document.publicId, revision.fileHash, isNewDocument);
    await prisma.$transaction([
      prisma.document.update({
        where: { id: document.id },
        data: {
          chainStatus: chain.status,
          chainId: chain.chainId,
          contractAddress: chain.status === "ANCHORED" ? env.NOTARY_REGISTRY_ADDRESS : null,
          transactionHash: chain.transactionHash,
          blockNumber: chain.blockNumber,
        },
      }),
      prisma.documentRevision.update({
        where: { id: revision.id },
        data: { transactionHash: chain.transactionHash, blockNumber: chain.blockNumber },
      }),
      prisma.auditEvent.create({
        data: {
          action: chain.status === "ANCHORED" ? "BLOCKCHAIN_ANCHORED" : "BLOCKCHAIN_NOT_CONFIGURED",
          userId: revision.createdById,
          documentId: document.id,
          details: { version: revision.version, chainStatus: chain.status, transactionHash: chain.transactionHash },
        },
      }),
    ]);
    return chain;
  } catch (error) {
    await prisma.$transaction([
      prisma.document.update({ where: { id: document.id }, data: { chainStatus: "FAILED" } }),
      prisma.auditEvent.create({
        data: {
          action: "BLOCKCHAIN_ANCHOR_FAILED",
          userId: revision.createdById,
          documentId: document.id,
          details: { version: revision.version, error: error.message.slice(0, 300) },
        },
      }),
    ]);
    return { status: "FAILED", transactionHash: null, error: error.message };
  }
}

router.get("/", async (req, res, next) => {
  try {
    const archived = req.query.archived === "true";
    if (archived && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Solo un administrador puede consultar expedientes archivados." });
    }
    const documents = await prisma.document.findMany({
      where: {
        archivedAt: archived ? { not: null } : null,
        ...(req.user.role === "ADMIN" || req.user.role === "AUDITOR" ? {} : { createdById: req.user.id }),
      },
      orderBy: { createdAt: "desc" },
      include: { createdBy: true, revisions: { orderBy: { version: "asc" } } },
    });
    res.json({ total: documents.length, documents: documents.map(publicDocument) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!document || document.archivedAt) return res.status(404).json({ error: "Expediente no encontrado o ya archivado." });
    const archivedAt = new Date();
    await prisma.$transaction([
      prisma.document.update({ where: { id: document.id }, data: { archivedAt } }),
      prisma.auditEvent.create({
        data: {
          action: "DOCUMENT_ARCHIVED",
          userId: req.user.id,
          documentId: document.id,
          details: { reference: document.reference, publicId: document.publicId, archivedAt: archivedAt.toISOString() },
        },
      }),
    ]);
    res.json({ archived: true, archivedAt });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/restore", requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!document || !document.archivedAt) return res.status(404).json({ error: "Expediente archivado no encontrado." });
    await prisma.$transaction([
      prisma.document.update({ where: { id: document.id }, data: { archivedAt: null } }),
      prisma.auditEvent.create({
        data: {
          action: "DOCUMENT_RESTORED",
          userId: req.user.id,
          documentId: document.id,
          details: { reference: document.reference, publicId: document.publicId },
        },
      }),
    ]);
    res.json({ restored: true });
  } catch (error) {
    next(error);
  }
});

router.post("/compare", compareLimiter, compareUpload.array("files", 2), async (req, res, next) => {
  try {
    if (!Array.isArray(req.files) || req.files.length !== 2) {
      return res.status(400).json({ error: "Adjunta exactamente dos archivos para comparar." });
    }

    const files = [];
    for (const file of req.files) {
      const { extension, mimeType } = await validateFileSignature(file);
      files.push({
        buffer: file.buffer,
        extension,
        mimeType,
        sizeBytes: file.size,
        name: path.basename(file.originalname),
        hash: sha256(file.buffer),
      });
    }

    const comparison = await compareFiles(files[0], files[1]);
    await prisma.auditEvent.create({
      data: {
        action: "DOCUMENTS_COMPARED",
        userId: req.user.id,
        details: {
          leftHash: files[0].hash,
          rightHash: files[1].hash,
          exactMatch: files[0].hash === files[1].hash,
          textComparable: comparison.textComparable,
        },
      },
    });

    res.setHeader("Cache-Control", "no-store");
    res.json({
      exactMatch: files[0].hash === files[1].hash,
      files: files.map(({ name, mimeType, sizeBytes, hash }) => ({ name, mimeType, sizeBytes, hash })),
      comparison,
    });
  } catch (error) {
    if (error.code === "INVALID_COMPARISON_FILE") {
      return res.status(422).json({ error: error.message });
    }
    next(error);
  }
});

router.post("/", requireRoles("ADMIN", "NOTARY", "OPERATOR"), upload.single("file"), async (req, res, next) => {
  let savedFile;
  try {
    if (!req.file) return res.status(400).json({ error: "Adjunta el archivo que se va a registrar." });
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Tipo o referencia no válidos.", issues: parsed.error.issues });
    const { extension, mimeType } = await validateFileSignature(req.file);
    const fileHash = sha256(req.file.buffer);
    savedFile = await storage.saveEncrypted(req.file.buffer, extension);
    const safeName = `${parsed.data.type.toLowerCase()}-${crypto.randomUUID()}${extension}`;

    const document = await prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          type: parsed.data.type,
          reference: parsed.data.reference,
          notes: parsed.data.notes || null,
          originalName: safeName,
          mimeType,
          sizeBytes: req.file.size,
          encryptedPath: savedFile.fileName,
          currentHash: fileHash,
          createdById: req.user.id,
          revisions: {
            create: {
              version: 1,
              fileHash,
              encryptedPath: savedFile.fileName,
              originalName: safeName,
              mimeType,
              sizeBytes: req.file.size,
              createdById: req.user.id,
            },
          },
        },
        include: { revisions: true, createdBy: true },
      });
      await tx.auditEvent.create({
        data: {
          action: "DOCUMENT_REGISTERED",
          userId: req.user.id,
          documentId: created.id,
          details: { type: parsed.data.type, fileHash, fileSize: req.file.size },
        },
      });
      return created;
    });
    savedFile = null;

    const anchor = await recordAnchor(document, document.revisions[0], true);
    const result = await prisma.document.findUnique({
      where: { id: document.id },
      include: { createdBy: true, revisions: { orderBy: { version: "asc" } } },
    });
    res.status(201).json({
      document: publicDocument(result),
      blockchain: anchor.status,
      blockchainMessage: anchor.status === "ANCHORED"
        ? "Huella confirmada en blockchain."
        : anchor.status === "PENDING"
          ? "Registro guardado localmente; la blockchain no está configurada, por lo que NO se emitió certificado on-chain."
          : `Registro guardado; anclaje blockchain falló: ${anchor.error}`,
    });
  } catch (error) {
    if (savedFile) {
      try { await storage.removeEncrypted(savedFile.fileName); } catch (cleanupError) {
        console.error("No se pudo limpiar el archivo cifrado tras fallo de alta:", cleanupError.message);
      }
    }
    next(error);
  }
});

router.get("/:id/certificate", async (req, res, next) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, ...(req.user.role === "ADMIN" || req.user.role === "AUDITOR" ? {} : { createdById: req.user.id }) },
    });
    if (!document) return res.status(404).json({ error: "Documento no encontrado." });
    const verificationUrl = `${env.PUBLIC_APP_URL}/verificar/${document.publicId}`;
    const pdf = await createCertificate(document, verificationUrl);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="constancia-${document.publicId}.pdf"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(pdf);
  } catch (error) {
    next(error);
  }
});

async function sendStandaloneQr(req, res, next, format) {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, ...(req.user.role === "ADMIN" || req.user.role === "AUDITOR" ? {} : { createdById: req.user.id }) },
    });
    if (!document) return res.status(404).json({ error: "Documento no encontrado." });
    const verificationUrl = `${env.PUBLIC_APP_URL}/verificar/${document.publicId}`;
    const qr = await createStandaloneQr(verificationUrl);
    await prisma.auditEvent.create({
      data: { action: "DOCUMENT_QR_DOWNLOADED", userId: req.user.id, documentId: document.id, details: { format } },
    });
    const isPdf = format === "pdf";
    res.setHeader("Content-Type", isPdf ? "application/pdf" : "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="qr-${document.publicId}.${format}"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(isPdf ? qr.pdf : qr.png);
  } catch (error) {
    next(error);
  }
}

router.get("/:id/qr.png", (req, res, next) => sendStandaloneQr(req, res, next, "png"));
router.get("/:id/qr.pdf", (req, res, next) => sendStandaloneQr(req, res, next, "pdf"));

router.get("/:id/file", async (req, res, next) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, ...(req.user.role === "ADMIN" || req.user.role === "AUDITOR" ? {} : { createdById: req.user.id }) },
    });
    if (!document) return res.status(404).json({ error: "Documento no encontrado." });
    const buffer = await storage.readDecrypted(document.encryptedPath);
    await prisma.auditEvent.create({
      data: { action: "DOCUMENT_DOWNLOADED", userId: req.user.id, documentId: document.id },
    });
    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(document.originalName)}"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

router.get("/:id/file-with-qr", async (req, res, next) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, ...(req.user.role === "ADMIN" || req.user.role === "AUDITOR" ? {} : { createdById: req.user.id }) },
    });
    if (!document) return res.status(404).json({ error: "Documento no encontrado." });
    const original = await storage.readDecrypted(document.encryptedPath);
    const verificationUrl = `${env.PUBLIC_APP_URL}/verificar/${document.publicId}`;
    const qrCopy = await createQrDocument(original, document, verificationUrl);
    await prisma.auditEvent.create({
      data: {
        action: "DOCUMENT_QR_COPY_DOWNLOADED",
        userId: req.user.id,
        documentId: document.id,
        details: { originalHash: document.currentHash, originalName: document.originalName },
      },
    });
    const downloadName = `nexo-notarial-verificado-${document.publicId}${qrCopy.extension}`;
    res.setHeader("Content-Type", qrCopy.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Original-File-Available", "true");
    res.send(qrCopy.buffer);
  } catch (error) {
    if (error.code === "DOCUMENT_CONVERSION") {
      return res.status(422).json({ error: error.message });
    }
    next(error);
  }
});

router.get("/:id/revisions/:version/file", async (req, res, next) => {
  try {
    const version = Number(req.params.version);
    if (!Number.isSafeInteger(version) || version < 1) {
      return res.status(400).json({ error: "Número de versión no válido." });
    }
    const document = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        ...(req.user.role === "ADMIN" || req.user.role === "AUDITOR" ? {} : { createdById: req.user.id }),
      },
      include: { revisions: { where: { version } } },
    });
    const revision = document?.revisions[0];
    if (!document || !revision) return res.status(404).json({ error: "Versión no encontrada." });
    if (!revision.encryptedPath || !revision.originalName || !revision.mimeType) {
      return res.status(410).json({ error: "El archivo de esta versión histórica no está disponible en el almacenamiento." });
    }
    const buffer = await storage.readDecrypted(revision.encryptedPath);
    await prisma.auditEvent.create({
      data: {
        action: "DOCUMENT_REVISION_DOWNLOADED",
        userId: req.user.id,
        documentId: document.id,
        details: { version },
      },
    });
    res.setHeader("Content-Type", revision.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(revision.originalName)}"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, ...(req.user.role === "ADMIN" || req.user.role === "AUDITOR" ? {} : { createdById: req.user.id }) },
      include: { createdBy: true, revisions: { orderBy: { version: "asc" } } },
    });
    if (!document) return res.status(404).json({ error: "Documento no encontrado." });
    res.json({ document: publicDocument(document) });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/verify", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Adjunta un archivo para verificar." });
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, ...(req.user.role === "ADMIN" || req.user.role === "AUDITOR" ? {} : { createdById: req.user.id }) },
      include: { revisions: { orderBy: { version: "asc" } } },
    });
    if (!document) return res.status(404).json({ error: "Documento no encontrado." });
    await validateFileSignature(req.file);
    const submittedHash = sha256(req.file.buffer);
    const databaseMatch = submittedHash === document.currentHash;
    let chainMatch = null;
    let chainError = null;
    if (document.chainStatus === "ANCHORED") {
      try {
        const result = await blockchain.verifyLatest(document.publicId);
        chainMatch = result.available ? result.latestHash === submittedHash : null;
      } catch (error) {
        chainError = error.message;
      }
    }
    await prisma.auditEvent.create({
      data: {
        action: databaseMatch ? "DOCUMENT_HASH_MATCH" : "DOCUMENT_HASH_MISMATCH",
        userId: req.user.id,
        documentId: document.id,
        details: { submittedHash, databaseMatch, chainMatch },
      },
    });
    res.json({
      match: databaseMatch && (chainMatch === null || chainMatch),
      databaseMatch,
      chainMatch,
      chainError,
      submittedHash,
      currentHash: document.currentHash,
      chainStatus: document.chainStatus,
      message: chainMatch === null
        ? "Se comparó la huella con la base de datos; no se pudo confirmar la blockchain."
        : chainMatch
          ? "La huella coincide con el último registro en blockchain."
          : "El archivo no coincide con la huella registrada.",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/revisions", requireRoles("ADMIN", "NOTARY", "OPERATOR"), upload.single("file"), async (req, res, next) => {
  let savedFile;
  try {
    if (!req.file) return res.status(400).json({ error: "Adjunta la nueva versión." });
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, ...(req.user.role === "ADMIN" ? {} : { createdById: req.user.id }) },
      include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!document) return res.status(404).json({ error: "Documento no encontrado." });
    const { extension, mimeType } = await validateFileSignature(req.file);
    const fileHash = sha256(req.file.buffer);
    if (fileHash === document.currentHash) return res.status(200).json({ unchanged: true, message: "El archivo coincide con la versión actual." });
    savedFile = await storage.saveEncrypted(req.file.buffer, extension);
    const version = document.revisions[0].version + 1;
    const safeName = `${document.type.toLowerCase()}-${crypto.randomUUID()}${extension}`;

    const revision = await prisma.$transaction(async (tx) => {
      const updatedDocument = await tx.document.update({
        where: { id: document.id },
        data: {
          currentHash: fileHash,
          encryptedPath: savedFile.fileName,
          originalName: safeName,
          mimeType,
          sizeBytes: req.file.size,
          chainStatus: "PENDING",
          chainId: null,
          contractAddress: null,
          transactionHash: null,
          blockNumber: null,
        },
      });
      const createdRevision = await tx.documentRevision.create({
        data: {
          documentId: document.id,
          version,
          fileHash,
          encryptedPath: savedFile.fileName,
          originalName: safeName,
          mimeType,
          sizeBytes: req.file.size,
          createdById: req.user.id,
        },
      });
      await tx.auditEvent.create({
        data: { action: "DOCUMENT_REVISION_CREATED", userId: req.user.id, documentId: document.id, details: { version, fileHash } },
      });
      return { document: updatedDocument, revision: createdRevision };
    });
    savedFile = null;

    const anchor = await recordAnchor(revision.document, revision.revision, false);
    const latest = await prisma.document.findUnique({
      where: { id: document.id },
      include: { createdBy: true, revisions: { orderBy: { version: "asc" } } },
    });
    res.status(201).json({
      document: publicDocument(latest),
      blockchain: anchor.status,
      blockchainMessage: anchor.status === "ANCHORED" ? "Nueva huella anclada en blockchain." : "Versión guardada, pero el anclaje blockchain está pendiente o falló.",
    });
  } catch (error) {
    if (savedFile) {
      try { await storage.removeEncrypted(savedFile.fileName); } catch (cleanupError) {
        console.error("No se pudo limpiar archivo de revisión tras fallo:", cleanupError.message);
      }
    }
    next(error);
  }
});

router.post("/:id/anchor", requireRoles("ADMIN", "NOTARY"), async (req, res, next) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, ...(req.user.role === "ADMIN" ? {} : { createdById: req.user.id }) },
      include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!document) return res.status(404).json({ error: "Documento no encontrado." });
    const revision = document.revisions[0];
    const result = await recordAnchor(document, revision, revision.version === 1);
    if (result.status === "FAILED") return res.status(502).json({ error: result.error, chainStatus: result.status });
    if (result.status === "PENDING") return res.status(503).json({ error: "Configura RPC, contrato y wallet firmante antes de anclar.", chainStatus: result.status });
    res.json({ chainStatus: result.status, transactionHash: result.transactionHash, blockNumber: result.blockNumber?.toString() || null });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
