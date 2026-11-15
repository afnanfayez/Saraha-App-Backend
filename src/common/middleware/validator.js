import { langEnum } from '../enums/lang.enum.js'

export const validation = (schemaFactory) => (req, res, next) => {
  const language = req.headers['accept-language'] === String(langEnum.AR)
    ? langEnum.AR
    : langEnum.EN
  const schema = schemaFactory(language)
  const { success, error, data } = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
    headers: req.headers
  })

  if (!success) {
    throw error
  }

  req.validated = data
  return next()
}
