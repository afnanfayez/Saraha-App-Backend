export class AppError extends Error {
  constructor(statusCode, message, code = "REQUEST_FAILED") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace?.(this, AppError);
  }
}
