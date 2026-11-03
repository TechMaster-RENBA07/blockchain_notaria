const crypto = require("node:crypto");
const env = require("../config");
const prisma = require("../lib/prisma");

const COOKIE_NAME = "bn_session";
const SESSION_SECONDS = 8 * 60 * 60;

function signPayload(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", env.SESSION_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  if (!env.SESSION_SECRET || !token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac("sha256", env.SESSION_SECRET).update(encoded).digest();
  let received;
  try {
    received = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function requireAuth(req, res, next) {
  const payload = verifyToken(req.cookies[COOKIE_NAME]);
  if (!payload?.sub) return res.status(401).json({ error: "Inicia sesión con tu cuenta autorizada." });
  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.enabled) return res.status(401).json({ error: "La cuenta no está habilitada." });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "No tienes permisos para realizar esta operación." });
    }
    next();
  };
}

function createSessionCookie(res, userId) {
  const token = signPayload({ sub: userId, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "strict", path: "/" });
}

module.exports = { COOKIE_NAME, requireAuth, requireRoles, createSessionCookie, clearSessionCookie, verifyToken };
