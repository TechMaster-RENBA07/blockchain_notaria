const crypto = require("node:crypto");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const env = require("./config");
const prisma = require("./lib/prisma");
const storage = require("./services/storageService");
const blockchain = require("./services/blockchainService");
const { ensureInitialAdmin, router: authRouter } = require("./routes/auth");

if (env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET es obligatorio y debe tener al menos 32 caracteres.");
}

const app = express();
app.disable("x-powered-by");
app.use(helmet({
  crossOriginResourcePolicy: { policy: "same-site" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
}));
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());

app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.get("origin");
    if (origin && origin !== env.FRONTEND_ORIGIN) {
      return res.status(403).json({ error: "Origen de solicitud no autorizado." });
    }
  }
  next();
});

app.get("/api/health", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      database: "sqlite-connected",
      authentication: "password",
      blockchain: blockchain.isConfigured() ? "configured" : "not-configured",
      environment: env.NODE_ENV,
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60_000, limit: 5, standardHeaders: "draft-7", legacyHeaders: false }));
app.use("/api/auth", authRouter);
app.use("/api/users", require("./routes/users").router);
app.use("/api/public", rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: "draft-7", legacyHeaders: false }), require("./routes/public"));
app.use("/api/documents", require("./routes/documents"));
app.use("/api/audit", require("./routes/audit"));

app.use((_req, res) => res.status(404).json({ error: "Recurso no encontrado." }));

app.use((error, _req, res, _next) => {
  if (error?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: `El archivo supera el límite de ${env.MAX_UPLOAD_MB} MB.` });
  }
  if (error?.name === "ZodError") return res.status(400).json({ error: "Datos de solicitud no válidos." });
  if (error?.code?.startsWith("P")) {
    console.error("Error de base de datos:", error.code);
    return res.status(500).json({ error: "No se pudo completar la operación en la base de datos." });
  }
  console.error("Error de API:", error.message);
  res.status(500).json({
    error: env.NODE_ENV === "development" ? error.message : "Error interno del servidor.",
    requestId: crypto.randomUUID(),
  });
});

async function start() {
  if (!env.DOCUMENT_ENCRYPTION_KEY) {
    throw new Error("DOCUMENT_ENCRYPTION_KEY es obligatorio para proteger los archivos privados.");
  }
  await storage.ensureStorage();
  await prisma.$connect();
  await ensureInitialAdmin();
  app.listen(env.PORT, "127.0.0.1", () => {
    console.log(`API notarial activa en http://127.0.0.1:${env.PORT}`);
    console.log(`SQLite conectado · Blockchain ${blockchain.isConfigured() ? "configurada" : "pendiente de credenciales"}`);
  });
}

start().catch(async (error) => {
  console.error("No se pudo iniciar la API:", error.message);
  await prisma.$disconnect();
  process.exitCode = 1;
});

module.exports = app;
