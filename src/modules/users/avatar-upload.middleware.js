import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { formidable } from "formidable";
import { env } from "../../config/env.js";
import { AppError } from "../../common/errors/app-error.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function detectImage(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: ".jpg", mimeType: "image/jpeg" };
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { extension: ".png", mimeType: "image/png" };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { extension: ".webp", mimeType: "image/webp" };
  }
  return null;
}

export async function removeUploadedAvatar(file) {
  if (file?.path) await rm(file.path, { force: true }).catch(() => {});
}

export async function uploadAvatar(req, _res, next) {
  const temporaryRoot = path.join(path.dirname(env.avatarUploadDirectory), "tmp");
  const requestDirectory = path.join(temporaryRoot, randomUUID());

  try {
    await mkdir(requestDirectory, { recursive: true });
    const form = formidable({
      uploadDir: requestDirectory,
      maxFiles: 1,
      maxFields: 0,
      maxFileSize: env.avatarMaxSizeBytes,
      maxTotalFileSize: env.avatarMaxSizeBytes,
      allowEmptyFiles: false,
      keepExtensions: false,
      filter(part) {
        return part.name === "avatar" && allowedMimeTypes.has(part.mimetype || "");
      }
    });

    const [, files] = await form.parse(req);
    const uploaded = files.avatar;
    const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;

    if (!file) {
      throw new AppError(422, "Upload one JPEG, PNG, or WebP image using the avatar field", "INVALID_AVATAR");
    }

    const fileBuffer = await readFile(file.filepath);
    const detected = detectImage(fileBuffer);
    if (!detected || detected.mimeType !== file.mimetype) {
      throw new AppError(
        422,
        "The uploaded file content does not match an allowed image type",
        "INVALID_AVATAR_CONTENT"
      );
    }

    await mkdir(env.avatarUploadDirectory, { recursive: true });
    const filename = randomUUID() + detected.extension;
    const destination = path.join(env.avatarUploadDirectory, filename);
    await rename(file.filepath, destination);
    req.uploadedAvatar = {
      url: "/uploads/avatars/" + filename,
      path: destination,
      mimeType: detected.mimeType,
      size: file.size
    };

    await rm(requestDirectory, { recursive: true, force: true });
    return next();
  } catch (error) {
    await rm(requestDirectory, { recursive: true, force: true }).catch(() => {});
    if (error instanceof AppError) return next(error);
    if (error?.httpCode === 413 || error?.code === 1009) {
      return next(new AppError(413, "Avatar file exceeds the allowed size", "AVATAR_TOO_LARGE"));
    }
    return next(new AppError(400, "Avatar upload could not be processed", "AVATAR_UPLOAD_FAILED"));
  }
}
