import { userModel } from '../../database/models/index.js'
import {
  conflictException,
  notFoundException
} from '../../common/utils/exceptions.js'
import {
  createLoginTokens,
  encryption,
  myCompare,
  myHash
} from '../../common/security/index.js'
import { ACCESS_EXPIRATION } from '../../config/config.service.js'

export const signup = async (data) => {
  const checkUser = await userModel.findOne({ email: data.email })

  if (checkUser) {
    conflictException('User already exists')
  }

  data.password = await myHash({ plainText: data.password })
  data.phone = encryption(data.phone)

  const user = await userModel.create(data)

  return user
}

export const login = async (data) => {
  const user = await userModel.findOne({ email: data.email })

  if (!user) {
    notFoundException('User not found')
  }

  const match = await myCompare({
    plainText: data.password,
    cipherText: user.password
  })

  if (!match) {
    notFoundException('User not found')
  }

  return createLoginTokens(user)
}

export const rotateToken = async (user, decoded) => {
  const currentTime = Date.now()
  const accessExpiresAt = (decoded.iat + ACCESS_EXPIRATION) * 1000

  if (currentTime < accessExpiresAt) {
    conflictException('Access token still valid')
  }

  return createLoginTokens(user)
}
