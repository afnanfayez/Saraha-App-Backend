import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { AppError } from "./common/errors/app-error.js";
import { generalLimiter } from "./common/middleware/rate-limits.js";
import { errorHandler, notFoundHandler } from "./common/middleware/error-handler.js";
import apiRoutes from "./routes/index.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new AppError(403, "Origin is not allowed by CORS", "CORS_ORIGIN_DENIED"));
      },
      credentials: false
    })
  );
  app.use(express.json({ limit: "16kb" }));
  app.use(
    "/uploads/avatars",
    express.static(env.avatarUploadDirectory, { dotfiles: "deny", index: false, maxAge: "1d" })
  );
  app.use(generalLimiter);
  app.use("/api/v1", apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
