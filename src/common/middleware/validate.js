import { AppError } from "../errors/app-error.js";

export function validate(schemas) {
  return (req, _res, next) => {
    const validated = {};
    for (const [key, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        const message = result.error.issues
          .map((issue) => issue.path.join(".") + ": " + issue.message)
          .join("; ");
        return next(new AppError(422, message, "VALIDATION_ERROR"));
      }
      validated[key] = result.data;
    }
    req.validated = validated;
    next();
  };
}
