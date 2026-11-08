import mongoose from "mongoose";
import { AppError } from "../errors/app-error.js";

export function notFoundHandler(_req, _res, next) {
  next(new AppError(404, "Route not found", "NOT_FOUND"));
}

export function errorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error);

  let statusCode = error.statusCode || 500;
  let code = error.code || "INTERNAL_ERROR";
  let message = statusCode >= 500 ? "An unexpected error occurred" : error.message;

  if (error?.name === "ZodError" || error?.name === "ValidationError") {
    statusCode = 422;
    code = "VALIDATION_ERROR";
    message = error.message;
  } else if (error?.type === "entity.parse.failed") {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "The request body contains invalid JSON";
  } else if (error?.name === "CastError") {
    statusCode = 400;
    code = "INVALID_IDENTIFIER";
    message = "A supplied identifier is invalid";
  } else if (error?.code === 11000) {
    statusCode = 409;
    code = "DUPLICATE_VALUE";
    message = "A record with one of these values already exists";
  } else if (error instanceof mongoose.Error.VersionError) {
    statusCode = 409;
    code = "CONCURRENT_UPDATE";
    message = "This record changed while it was being updated; reload and retry";
  }

  if (statusCode >= 500) {
    console.error(JSON.stringify({ code, name: error?.name || "Error" }));
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: { code }
  });
}
