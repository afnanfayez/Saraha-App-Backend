import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import userRoutes from "../modules/users/user.routes.js";
import messageRoutes from "../modules/messages/message.routes.js";
import publicMessageRoutes from "../modules/messages/public-message.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import { success } from "../common/utils/responses.js";

const router = Router();

router.get("/health", (_req, res) => success(res, { status: "ok" }, "Service is healthy"));
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/public", publicMessageRoutes);
router.use("/messages", messageRoutes);
router.use("/admin", adminRoutes);

export default router;
