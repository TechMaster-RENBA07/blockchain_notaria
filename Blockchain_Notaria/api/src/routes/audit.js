const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRoles } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireRoles("ADMIN", "AUDITOR"));

router.get("/", async (req, res, next) => {
  try {
    const events = await prisma.auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { email: true, displayName: true } },
        document: { select: { id: true, reference: true, publicId: true } },
      },
    });
    res.json({ events });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
