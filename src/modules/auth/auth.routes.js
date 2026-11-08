import { Router } from "express";
import { z } from "zod";
import { validate } from "../../common/middleware/validate.js";
import { requireAuthentication } from "../../common/middleware/authentication.js";
import { authLimiter } from "../../common/middleware/rate-limits.js";
import { authController } from "./auth.controller.js";

const router = Router();

const signupSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]{3,30}$/),
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(12).max(128)
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(128)
  })
  .strict();

const refreshSchema = z
  .object({
    refreshToken: z.string().min(32).max(256)
  })
  .strict();
const emailSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) }).strict();
const tokenSchema = z.object({ token: z.string().min(32).max(256) }).strict();
const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(256),
    password: z.string().min(12).max(128)
  })
  .strict();

router.post("/signup", authLimiter, validate({ body: signupSchema }), authController.signup);
router.post("/login", authLimiter, validate({ body: loginSchema }), authController.login);
router.post("/refresh", authLimiter, validate({ body: refreshSchema }), authController.refresh);
router.post("/logout", requireAuthentication, authController.logout);
router.post("/verify-email", authLimiter, validate({ body: tokenSchema }), authController.verifyEmail);
router.post(
  "/resend-verification",
  authLimiter,
  validate({ body: emailSchema }),
  authController.resendVerification
);
router.post(
  "/forgot-password",
  authLimiter,
  validate({ body: emailSchema }),
  authController.requestPasswordReset
);
router.post(
  "/reset-password",
  authLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword
);

export default router;
