const { z } = require("zod");

const roles = ["ADMIN", "NOTARY", "OPERATOR", "AUDITOR"];
const userSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  role: z.enum(roles),
});

module.exports = { roles, userSchema };
