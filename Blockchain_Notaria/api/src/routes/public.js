const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const blockchain = require("../services/blockchainService");

const router = express.Router();
const publicIdSchema = z.string().uuid();

router.get("/verify/:publicId", async (req, res, next) => {
  try {
    if (!publicIdSchema.safeParse(req.params.publicId).success) {
      return res.status(400).json({ error: "Identificador de verificación no válido." });
    }
    const document = await prisma.document.findUnique({
      where: { publicId: req.params.publicId },
      select: {
        publicId: true,
        type: true,
        currentHash: true,
        chainStatus: true,
        chainId: true,
        transactionHash: true,
        blockNumber: true,
        createdAt: true,
      },
    });
    if (!document) return res.status(404).json({ error: "No existe un registro con ese identificador." });

    let chain = { available: false, matches: null, latestHash: null };
    if (document.chainStatus === "ANCHORED") {
      chain = await blockchain.verifyLatest(document.publicId);
      if (chain.available) {
        chain.matches = chain.latestHash === document.currentHash;
      }
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({
      exists: true,
      documentType: document.type,
      registeredAt: document.createdAt,
      chainStatus: document.chainStatus,
      chainId: document.chainId,
      transactionHash: document.transactionHash,
      blockNumber: document.blockNumber?.toString() || null,
      integrityConfirmed: chain.available ? chain.matches : null,
      verificationAvailable: chain.available,
      hash: chain.available ? chain.latestHash : null,
      disclaimer: "La consulta confirma únicamente la integridad técnica del registro; no sustituye los requisitos notariales.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
