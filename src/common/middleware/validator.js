export const validation = (schema) => (req, res, next) => {
  const { success, error, data } = schema.safeParse(req.body)

  if (!success) {
    throw error
  }

  req.validated = data
  next()
}
