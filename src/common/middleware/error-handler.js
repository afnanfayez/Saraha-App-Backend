export const globalErrorHandler = (error, req, res, next) => {
  res.status(error.cause || 500).json({
    message: error.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'production' ? {} : { stack: error.stack })
  })
}
