import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";

function createLimiter(max, message) {
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.nodeEnv === "test" ? 1000 : max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      message,
      error: { code: "RATE_LIMITED" }
    }
  });
}

export const generalLimiter = createLimiter(env.rateLimitMax, "Too many requests; try again later");
export const authLimiter = createLimiter(
  env.authRateLimitMax,
  "Too many authentication attempts; try again later"
);
export const messageLimiter = createLimiter(env.messageRateLimitMax, "Too many messages; try again later");
