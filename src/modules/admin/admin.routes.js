import { Router } from "express";
import { z } from "zod";
import { requireAuthentication } from "../../common/middleware/authentication.js";
import { requireRole } from "../../common/middleware/authorization.js";
import { validate } from "../../common/middleware/validate.js";
import { adminController } from "./admin.controller.js";

const router = Router();
const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
const userListQuery = paginationQuery
  .extend({
    search: z.string().trim().max(80).optional()
  })
  .strict();
const reportListQuery = paginationQuery
  .extend({
    status: z.enum(["OPEN", "REVIEWED", "DISMISSED"]).optional()
  })
  .strict();
const userStatusBody = z.object({ isActive: z.boolean() }).strict();
const reportStatusBody = z.object({ status: z.enum(["REVIEWED", "DISMISSED"]) }).strict();

router.use(requireAuthentication, requireRole("ADMIN"));

router.get("/users", validate({ query: userListQuery }), adminController.listUsers);

router.patch(
  "/users/:id/status",
  validate({
    params: z.object({ id: objectId }),
    body: userStatusBody
  }),
  adminController.setUserStatus
);

router.get("/reports", validate({ query: reportListQuery }), adminController.listReports);

router.patch(
  "/reports/:id",
  validate({
    params: z.object({ id: objectId }),
    body: reportStatusBody
  }),
  adminController.reviewReport
);

export default router;
