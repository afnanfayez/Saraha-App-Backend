import { Router } from "express";
import { z } from "zod";
import { requireAuthentication } from "../../common/middleware/authentication.js";
import { validate } from "../../common/middleware/validate.js";
import { messageController } from "./message.controller.js";

const router = Router();
const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  read: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
});

const reportSchema = z
  .object({
    reason: z.enum(["HARASSMENT", "THREATS", "SPAM", "OTHER"]),
    details: z.string().trim().max(500).optional()
  })
  .strict();

router.get("/inbox", requireAuthentication, validate({ query: pageQuery }), messageController.listInbox);

router.get(
  "/:id",
  requireAuthentication,
  validate({ params: z.object({ id: objectId }) }),
  messageController.getMessage
);

router.patch(
  "/:id/read",
  requireAuthentication,
  validate({ params: z.object({ id: objectId }) }),
  messageController.markRead
);

router.delete(
  "/:id",
  requireAuthentication,
  validate({ params: z.object({ id: objectId }) }),
  messageController.deleteMessage
);

router.post(
  "/:id/report",
  requireAuthentication,
  validate({
    params: z.object({ id: objectId }),
    body: reportSchema
  }),
  messageController.reportMessage
);

export default router;
