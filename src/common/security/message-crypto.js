import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import { AppError } from "../errors/app-error.js";

// AES-256-GCM adds an authentication tag so altered ciphertext is rejected.
// A fresh 96-bit IV is generated for every message.
const ALGORITHM = "aes-256-gcm";

export function encryptMessage(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, env.encryptionKey, iv);
  cipher.setAAD(Buffer.from("saraha-message:" + env.encryptionKeyVersion));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return {
    encryptedContent: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    encryptionKeyVersion: env.encryptionKeyVersion
  };
}

export function decryptMessage(record) {
  const key = env.encryptionKeys[record.encryptionKeyVersion];
  if (!key) {
    throw new AppError(
      500,
      "The message encryption key version is unavailable",
      "DECRYPTION_KEY_UNAVAILABLE"
    );
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(record.iv, "base64"));
    decipher.setAAD(Buffer.from("saraha-message:" + record.encryptionKeyVersion));
    decipher.setAuthTag(Buffer.from(record.authTag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(record.encryptedContent, "base64")),
      decipher.final()
    ]);
    return plaintext.toString("utf8");
  } catch {
    throw new AppError(500, "The stored message could not be authenticated", "MESSAGE_AUTHENTICATION_FAILED");
  }
}
