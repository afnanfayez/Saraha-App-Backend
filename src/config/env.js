import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URI: z.string().url().default("mongodb://127.0.0.1:27017/saraha_app"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1).default("saraha-app"),
  JWT_AUDIENCE: z.string().min(1).default("saraha-api"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  ENCRYPTION_KEY_VERSION: z.string().min(1).default("v1"),
  ENCRYPTION_KEY: z.string().min(1),
  ENCRYPTION_OLD_KEYS: z.string().optional().default(""),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://127.0.0.1:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  MESSAGE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  EMAIL_PROVIDER: z.enum(["console", "memory", "resend", "disabled"]).optional(),
  EMAIL_FROM: z.string().email().optional(),
  RESEND_API_KEY: z.string().optional(),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  REQUIRE_EMAIL_VERIFICATION: z.enum(["true", "false"]).optional(),
  AVATAR_UPLOAD_DIR: z.string().min(1).default("uploads/avatars"),
  AVATAR_MAX_SIZE_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .max(5 * 1024 * 1024)
    .default(2 * 1024 * 1024)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => issue.path.join(".") + ": " + issue.message).join("; ");
  throw new Error("Invalid environment configuration: " + issues);
}

const values = parsed.data;
const encryptionKey = Buffer.from(values.ENCRYPTION_KEY, "base64");
if (encryptionKey.length !== 32) {
  throw new Error("ENCRYPTION_KEY must be a base64-encoded 32-byte key");
}

const encryptionKeys = { [values.ENCRYPTION_KEY_VERSION]: encryptionKey };
if (values.ENCRYPTION_OLD_KEYS.trim()) {
  let oldKeys;
  try {
    oldKeys = JSON.parse(values.ENCRYPTION_OLD_KEYS);
  } catch {
    throw new Error("ENCRYPTION_OLD_KEYS must be a JSON object mapping key versions to base64 keys");
  }
  if (!oldKeys || typeof oldKeys !== "object" || Array.isArray(oldKeys)) {
    throw new Error("ENCRYPTION_OLD_KEYS must be a JSON object");
  }
  for (const [version, encodedKey] of Object.entries(oldKeys)) {
    if (!version || typeof encodedKey !== "string" || Object.hasOwn(encryptionKeys, version)) {
      throw new Error("ENCRYPTION_OLD_KEYS contains an invalid or duplicate key version");
    }
    const decodedKey = Buffer.from(encodedKey, "base64");
    if (decodedKey.length !== 32) {
      throw new Error(`Encryption key ${version} must decode to exactly 32 bytes`);
    }
    encryptionKeys[version] = decodedKey;
  }
}

const databaseName = new URL(values.MONGODB_URI).pathname.replace(/^\//, "");
if (!["saraha_app", "saraha_app_test"].includes(databaseName)) {
  throw new Error("MONGODB_URI must target saraha_app or the isolated saraha_app_test database");
}
if (values.NODE_ENV === "test" && databaseName !== "saraha_app_test") {
  throw new Error("Tests are only allowed to use saraha_app_test");
}

const emailProvider =
  values.EMAIL_PROVIDER ??
  (values.NODE_ENV === "test" ? "memory" : values.NODE_ENV === "production" ? "resend" : "console");
const requireEmailVerification =
  values.REQUIRE_EMAIL_VERIFICATION === undefined ? true : values.REQUIRE_EMAIL_VERIFICATION === "true";

if (values.NODE_ENV === "production" && emailProvider !== "resend") {
  throw new Error("Production requires EMAIL_PROVIDER=resend");
}
if (requireEmailVerification && emailProvider === "disabled") {
  throw new Error("Email verification cannot be required when email delivery is disabled");
}
if (emailProvider === "resend" && (!values.RESEND_API_KEY || !values.EMAIL_FROM)) {
  throw new Error("RESEND_API_KEY and EMAIL_FROM are required when EMAIL_PROVIDER=resend");
}

export const env = Object.freeze({
  nodeEnv: values.NODE_ENV,
  port: values.PORT,
  mongoUri: values.MONGODB_URI,
  databaseName,
  accessSecret: values.JWT_ACCESS_SECRET,
  jwtIssuer: values.JWT_ISSUER,
  jwtAudience: values.JWT_AUDIENCE,
  accessTokenTtl: values.ACCESS_TOKEN_TTL,
  refreshTokenTtlDays: values.REFRESH_TOKEN_TTL_DAYS,
  encryptionKeyVersion: values.ENCRYPTION_KEY_VERSION,
  encryptionKey,
  encryptionKeys: Object.freeze(encryptionKeys),
  corsOrigins: values.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  rateLimitWindowMs: values.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: values.RATE_LIMIT_MAX,
  authRateLimitMax: values.AUTH_RATE_LIMIT_MAX,
  messageRateLimitMax: values.MESSAGE_RATE_LIMIT_MAX,
  emailProvider,
  emailFrom: values.EMAIL_FROM,
  resendApiKey: values.RESEND_API_KEY,
  appBaseUrl: values.APP_BASE_URL.replace(/\/$/, ""),
  requireEmailVerification,
  avatarUploadDirectory: path.resolve(process.cwd(), values.AVATAR_UPLOAD_DIR),
  avatarMaxSizeBytes: values.AVATAR_MAX_SIZE_BYTES
});
