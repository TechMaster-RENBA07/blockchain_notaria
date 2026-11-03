const express = require("express");
const prisma = require("../lib/prisma");
const { hashPassword } = require("../lib/password");
const { userSchema } = require("../lib/userValidation");
const { requireAuth, requireRoles } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireRoles("ADMIN"));

router.get("/", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ enabled: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        enabled: true,
        createdAt: true,
      },
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = userSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Revisa el nombre, correo, contraseña y rol seleccionados." });
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Ya existe una cuenta con ese correo." });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          displayName: parsed.data.displayName,
          passwordHash,
          role: parsed.data.role,
          enabled: true,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          enabled: true,
          createdAt: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          action: "USER_CREATED",
          userId: req.user.id,
          details: { createdUserId: createdUser.id, role: createdUser.role },
        },
      });
      return createdUser;
    });

    res.status(201).json({ user });
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "Ya existe una cuenta con ese correo." });
    }
    next(error);
  }
});

module.exports = { router, userSchema };
