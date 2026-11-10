import { forbiddenException } from '../utils/exceptions.js'

export const authorization = (accessRoles = []) => (req, res, next) => {
  if (!accessRoles.includes(req.user.role)) {
    forbiddenException('Not authorized')
  }

  next()
}
