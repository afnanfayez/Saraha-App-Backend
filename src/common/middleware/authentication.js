import { userModel } from '../../database/models/index.js'
import { tokenTypeEnum } from '../enums/token.enum.js'
import { badRequestException } from '../utils/exceptions.js'
import { verifyToken } from '../security/jwt.js'

export const auth = (
  tokenType = tokenTypeEnum.access
) => async (req, res, next) => {
  const { authorization } = req.headers

  if (!authorization) {
    badRequestException('Token not provided')
  }

  const decoded = verifyToken({
    token: authorization,
    tokenType
  })

  const user = await userModel.findById(decoded.sub)

  req.user = user
  req.decoded = decoded

  next()
}
