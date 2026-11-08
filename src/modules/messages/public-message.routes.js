import { Router } from "express";
import { z } from "zod";
import { validate } from "../../common/middleware/validate.js";
import { messageLimiter } from "../../common/middleware/rate-limits.js";
import { messageController } from "./message.controller.js";
import { userController } from "../users/user.controller.js";

const router = Router();
const paramsSchema = z.object({
  username: z.string().regex(/^[a-z0-9_]{3,30}$/i)
});
const bodySchema = z
  .object({
    content: z.string().trim().min(1).max(2000)
  })
  .strict();

router.get("/users/:username", validate({ params: paramsSchema }), userController.getPublicProfile);

router.post(
  "/users/:username/messages",
  messageLimiter,
  validate({
    params: paramsSchema,
    body: bodySchema
  }),
  messageController.sendAnonymous
);

export default router;
