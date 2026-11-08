import { Router } from "express";
import { z } from "zod";
import { requireAuthentication } from "../../common/middleware/authentication.js";
import { validate } from "../../common/middleware/validate.js";
import { uploadAvatar } from "./avatar-upload.middleware.js";
import { userController } from "./user.controller.js";

const router = Router();

const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    bio: z.string().trim().max(280).optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one profile field is required");

const settingsSchema = z
  .object({
    acceptMessages: z.boolean()
  })
  .strict();

router.get("/me", requireAuthentication, userController.getMe);
router.patch("/me", requireAuthentication, validate({ body: profileSchema }), userController.updateProfile);
router.post("/me/avatar", requireAuthentication, uploadAvatar, userController.uploadAvatar);
router.patch(
  "/me/settings",
  requireAuthentication,
  validate({ body: settingsSchema }),
  userController.updateSettings
);

export default router;
