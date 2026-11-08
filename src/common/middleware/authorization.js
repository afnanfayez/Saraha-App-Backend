import { AppError } from "../errors/app-error.js";

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError(401, "Authentication is required", "UNAUTHENTICATED"));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, "This action is not allowed for your role", "FORBIDDEN"));
    }
    next();
  };
}
