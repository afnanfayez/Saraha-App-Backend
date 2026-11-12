import userRepo from '../../database/repo/user.repo.js'
import { authEnum } from '../enums/auth.enum.js'
import { tokenTypeEnum } from '../enums/token.enum.js'
import {
  badRequestException,
  notFoundException
} from '../utils/exceptions.js'
import { myCompare } from '../security/hash.js'
import { verifyToken } from '../security/jwt.js'

export const auth = (
  tokenType = tokenTypeEnum.access
) => async (req, res, next) => {
  const { authorization } = req.headers

  if (!authorization) {
    badRequestException('Token not provided')
  }

  const [prefix, token, ...extra] = authorization.trim().split(/\s+/)

  if (!token || extra.length > 0) {
    badRequestException('Invalid auth method')
  }

  switch (prefix) {
    case authEnum.bearer: {
      const decoded = verifyToken({ token, tokenType })
      const user = await userRepo.findById({ id: decoded.sub })
      req.user = user
      req.decoded = decoded
      break
    }
    case authEnum.basic: {
      const data = Buffer.from(token, 'base64').toString('utf8')
      const separator = data.indexOf(':')
      if (separator < 1) {
        notFoundException('User not found')
      }

      const email = data.slice(0, separator)
      const password = data.slice(separator + 1)
      const user = await userRepo.findOne({ filter: { email } })

      if (!user?.password) {
        notFoundException('User not found')
      }

      const match = await myCompare({
        plainText: password,
        cipherText: user.password
      })

      if (!match) {
        notFoundException('User not found')
      }

      req.user = user
      break
    }
    default:
      badRequestException('Invalid auth method')
  }

  next()
}
