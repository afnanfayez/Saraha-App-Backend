import { rm } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";

export async function removeStoredAvatar(avatarUrl) {
  if (typeof avatarUrl !== "string" || !avatarUrl.startsWith("/uploads/avatars/")) return;
  const filename = path.basename(avatarUrl);
  if (!filename || filename === "." || filename === "..") return;
  const filePath = path.join(env.avatarUploadDirectory, filename);
  await rm(filePath, { force: true }).catch(() => {});
}
