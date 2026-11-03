const express = require("express");
const { z } = require("zod");
const env = require("../config");
const prisma = require("../lib/prisma");
const { DUMMY_HASH, hashPassword, verifyPassword } = require("../lib/password");
const { requireAuth, createSessionCookie, clearSessionCookie } = require("../middleware/auth");

const router = express.Router();
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(1024),
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Escribe un correo y una contraseña válidos." });

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    const passwordMatches = await verifyPassword(parsed.data.password, user?.passwordHash || DUMMY_HASH);
    if (!user || !user.enabled || !user.passwordHash || !passwordMatches) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos." });
    }

    await prisma.auditEvent.create({ data: { action: "LOGIN_PASSWORD", userId: user.id } });
    createSessionCookie(res, user.id);
    res.json({ user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } });
  } catch (error) {
    next(error);
  }
});

async function ensureInitialAdmin() {
  const email = env.INITIAL_ADMIN_EMAIL.trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) {
    throw new Error("Configura INITIAL_ADMIN_EMAIL con un correo válido en el archivo .env.");
  }
  if (env.INITIAL_ADMIN_PASSWORD.length < 12) {
    throw new Error("INITIAL_ADMIN_PASSWORD debe tener al menos 12 caracteres; define una contraseña privada en .env.");
  }
  if (!env.INITIAL_ADMIN_NAME.trim()) {
    throw new Error("INITIAL_ADMIN_NAME no puede estar vacío.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = existing?.passwordHash || await hashPassword(env.INITIAL_ADMIN_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      displayName: env.INITIAL_ADMIN_NAME.trim(),
      passwordHash,
      role: "ADMIN",
    },
    update: {
      displayName: env.INITIAL_ADMIN_NAME.trim(),
      passwordHash,
      role: "ADMIN",
    },
  });
  if (!user.enabled) {
    throw new Error("La cuenta configurada como administrador inicial está deshabilitada en la base de datos.");
  }
  console.log(`Administrador inicial listo: ${email}`);
}

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email, displayName: req.user.displayName, role: req.user.role } });
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await prisma.auditEvent.create({ data: { action: "LOGOUT", userId: req.user.id } });
    clearSessionCookie(res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = { router, ensureInitialAdmin };
