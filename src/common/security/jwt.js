import jwt from 'jsonwebtoken'
import {
  ACCESS_ADMIN_SECRET,
  ACCESS_EXPIRATION,
  ACCESS_USER_SECRET,
  REFRESH_ADMIN_SECRET,
  REFRESH_EXPIRATION,
  REFRESH_USER_SECRET
} from '../../config/config.service.js'
import { roleEnum } from '../enums/role.enum.js'
import { tokenTypeEnum } from '../enums/token.enum.js'

export const createToken = ({
  payload = {},
  secret,
  options = {}
}) => {
  return jwt.sign(payload, secret, options)
}

export const getSecret = (
  tokenType = tokenTypeEnum.access,
  role = roleEnum.user
) => {
  let secrets

  switch (role) {
    case roleEnum.admin:
      secrets = {
        access: ACCESS_ADMIN_SECRET,
        refresh: REFRESH_ADMIN_SECRET
      }
      break
    default:
      secrets = {
        access: ACCESS_USER_SECRET,
        refresh: REFRESH_USER_SECRET
      }
  }

  switch (tokenType) {
    case tokenTypeEnum.refresh:
      return secrets.refresh
    default:
      return secrets.access
  }
}

export const verifyToken = ({
  token,
  tokenType = tokenTypeEnum.access
}) => {
  const decoded = jwt.decode(token)
  const audience = Array.isArray(decoded?.aud) ? decoded.aud[0] : decoded?.aud
  const role = Number(audience)
  const secret = getSecret(tokenType, role)

  return jwt.verify(token, secret)
}

export const createLoginTokens = (user) => {
  const accessToken = createToken({
    payload: {},
    secret: getSecret(tokenTypeEnum.access, user.role),
    options: {
      subject: user.id,
      audience: [String(user.role)],
      expiresIn: ACCESS_EXPIRATION
    }
  })

  const refreshToken = createToken({
    payload: {},
    secret: getSecret(tokenTypeEnum.refresh, user.role),
    options: {
      subject: user.id,
      audience: [String(user.role)],
      expiresIn: REFRESH_EXPIRATION
    }
  })

  return { accessToken, refreshToken }
}
