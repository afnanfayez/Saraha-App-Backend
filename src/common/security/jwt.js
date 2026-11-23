import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
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
import {
  exists,
  getRevokedTokenCacheKey
} from '../services/cache.service.js'
import { unauthorizedException } from '../utils/exceptions.js'
import userRepo from '../../database/repo/user.repo.js'

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

export const verifyToken = async ({
  token,
  tokenType = tokenTypeEnum.access
}) => {
  const decoded = jwt.decode(token)
  const audience = Array.isArray(decoded?.aud) ? decoded.aud[0] : decoded?.aud
  const role = Number(audience)
  const secret = getSecret(tokenType, role)

  const verifiedPayload = jwt.verify(token, secret)

  if (!verifiedPayload.sub || !verifiedPayload.jti || !verifiedPayload.exp) {
    unauthorizedException('Invalid token')
  }

  const isRevoked = await exists({
    key: getRevokedTokenCacheKey({
      userId: verifiedPayload.sub,
      jti: verifiedPayload.jti
    })
  })

  if (isRevoked) {
    unauthorizedException('Token revoked')
  }

  const user = await userRepo.findById({ id: verifiedPayload.sub })
  if (!user) {
    unauthorizedException('Invalid token')
  }

  const credentialsChangedAtSeconds = user.changeCredentialsAt
    ? Math.floor(user.changeCredentialsAt.getTime() / 1000)
    : null

  if (
    credentialsChangedAtSeconds !== null &&
    verifiedPayload.iat < credentialsChangedAtSeconds
  ) {
    unauthorizedException('Token revoked')
  }

  return verifiedPayload
}

export const createLoginTokens = (user) => {
  const jti = randomUUID()

  const accessToken = createToken({
    payload: {},
    secret: getSecret(tokenTypeEnum.access, user.role),
    options: {
      subject: user.id,
      audience: [String(user.role)],
      expiresIn: ACCESS_EXPIRATION,
      jwtid: jti
    }
  })

  const refreshToken = createToken({
    payload: {},
    secret: getSecret(tokenTypeEnum.refresh, user.role),
    options: {
      subject: user.id,
      audience: [String(user.role)],
      expiresIn: REFRESH_EXPIRATION,
      jwtid: jti
    }
  })

  return { accessToken, refreshToken }
}
