import { ZodError } from 'zod'

export const globalErrorHandler = (error, req, res, next) => {
  const isValidationError = error instanceof ZodError

  res.status(isValidationError ? 400 : error.cause || 500).json({
    message: isValidationError
      ? error.issues
      : error.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'production' ? {} : { stack: error.stack })
  })
}
