import { OAuth2Client } from 'google-auth-library'
import userRepo from '../../database/repo/user.repo.js'
import { providerEnum } from '../../common/enums/provider.enum.js'
import {
  conflictException,
  notFoundException,
  unauthorizedException
} from '../../common/utils/exceptions.js'
import {
  createLoginTokens,
  encryption,
  myCompare,
  myHash
} from '../../common/security/index.js'
import {
  ACCESS_EXPIRATION,
  GOOGLE_CLIENT_ID
} from '../../config/config.service.js'

const googleClient = new OAuth2Client()

export const signup = async (data) => {
  const checkUser = await userRepo.findOne({ filter: { email: data.email } })

  if (checkUser) {
    conflictException('User already exists')
  }

  const { confirmPassword, ...userData } = data
  userData.password = await myHash({ plainText: data.password })
  userData.phone = encryption(data.phone)

  return await userRepo.create({ data: userData })
}

export const login = async (data) => {
  const user = await userRepo.findOne({ filter: { email: data.email } })

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

export const verifyGoogleAccount = async (idToken) => {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID
  })

  return ticket.getPayload()
}

export const loginWithGmail = async (data) => {
  const payload = await verifyGoogleAccount(data.idToken)
  const {
    email,
    email_verified: emailVerified,
    name,
    picture
  } = payload ?? {}

  if (!email || emailVerified !== true) {
    unauthorizedException('Email not verified')
  }

  let status = 200
  let user = await userRepo.findOne({ filter: { email } })

  if (!user) {
    const [firstName, ...lastNameParts] = String(name ?? email).trim().split(/\s+/)
    const lastName = lastNameParts.join(' ') || firstName

    user = await userRepo.create({
      data: {
        email,
        firstName,
        lastName,
        image: picture,
        provider: providerEnum.google
      }
    })
    status = 201
  }

  const tokens = createLoginTokens(user)
  return { tokens, status }
}
