const path = require("node:path");
const { z } = require("zod");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  FRONTEND_ORIGIN: z.string().url().default("http://127.0.0.1:5173"),
  PUBLIC_APP_URL: z.string().url().default("http://127.0.0.1:5173"),
  PUBLIC_API_URL: z.string().url().default("http://127.0.0.1:3001"),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().optional().default(""),
  DOCUMENT_ENCRYPTION_KEY: z.string().optional().default(""),
  DOCUMENT_STORAGE_PATH: z.string().default("./private-storage"),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().max(50).default(20),
  INITIAL_ADMIN_EMAIL: z.string().default(""),
  INITIAL_ADMIN_NAME: z.string().default("Administrador"),
  INITIAL_ADMIN_PASSWORD: z.string().default(""),
  CHAIN_RPC_URL: z.string().optional().default(""),
  CHAIN_ID: z.string().optional().default(""),
  NOTARY_REGISTRY_ADDRESS: z.string().optional().default(""),
  BLOCKCHAIN_SIGNER_PRIVATE_KEY: z.string().optional().default(""),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Configuración inválida: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
}

const env = parsed.data;

module.exports = {
  ...env,
  storagePath: path.resolve(__dirname, "../../", env.DOCUMENT_STORAGE_PATH),
};
