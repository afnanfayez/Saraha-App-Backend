import { OAuth2Client } from 'google-auth-library'
import userRepo from '../../database/repo/user.repo.js'
import { providerEnum } from '../../common/enums/provider.enum.js'
import {
  conflictException,
  notFoundException,
  unauthorizedException,
  tooManyRequestsException
} from '../../common/utils/exceptions.js'
import { logoutActionEnum } from '../../common/enums/logout-action.enum.js'
import { otpSubjectEnum } from '../../common/enums/otp-subject.enum.js'
import {
  set,
  get,
  del,
  ttl as getCacheTtl,
  exists,
  expire,
  increment,
  deleteByPrefix,
  getOtpCacheKey,
  getOtpTrailsCacheKey,
  getWrongOtpTrailsCacheKey,
  getUserBlockCacheKey,
  getRevokedTokenCacheKey,
  getRevokedTokenCachePrefix
} from '../../common/services/cache.service.js'
import {
  emailEventEmitter,
  emailEventEnum
} from '../../common/events/email.event.js'
import {
  createLoginTokens,
  encryption,
  myCompare,
  myHash
} from '../../common/security/index.js'
import {
  ACCESS_EXPIRATION,
  GOOGLE_CLIENT_ID,
  MAX_TRIALS
} from '../../config/config.service.js'

const googleClient = new OAuth2Client()
const OTP_TTL_SECONDS = 300
const ATTEMPT_TTL_SECONDS = 900
const maxTrials = Number(MAX_TRIALS) > 0 ? Number(MAX_TRIALS) : 5

const otpEmailContent = Object.freeze({
  [otpSubjectEnum.SIGNUP]: {
    subject: 'Confirm your email',
    title: 'Confirm your email',
    message: 'Use the code below to confirm your email address.'
  },
  [otpSubjectEnum.FORGOT_PASSWORD]: {
    subject: 'Reset your password',
    title: 'Reset your password',
    message: 'Use the code below to reset your password.'
  }
})

export const checkIfUserBlocked = async (userId, subject) => {
  const key = getUserBlockCacheKey(userId, subject)

  if (await exists({ key })) {
    const remainingSeconds = await getCacheTtl({ key })
    const waitMinutes = Math.max(1, Math.ceil(remainingSeconds / 60))
    tooManyRequestsException(`Too many attempts. Try again in ${waitMinutes} minutes`)
  }
}

const setBlock = async (userId, subject) => {
  await set({
    key: getUserBlockCacheKey(userId, subject),
    value: true,
    ttl: ATTEMPT_TTL_SECONDS
  })
  await checkIfUserBlocked(userId, subject)
}

const recordSendAttempt = async (userId, subject) => {
  const key = getOtpTrailsCacheKey(userId, subject)
  const attempts = await increment({ key })

  if (attempts === 1) {
    await expire({ key, seconds: ATTEMPT_TTL_SECONDS })
  }

  if (attempts > maxTrials) {
    await setBlock(userId, subject)
  }
}

const recordWrongOtpAttempt = async (userId, subject) => {
  const key = getWrongOtpTrailsCacheKey(userId, subject)
  const attempts = await increment({ key })

  if (attempts === 1) {
    await expire({ key, seconds: ATTEMPT_TTL_SECONDS })
  }

  if (attempts >= maxTrials) {
    await setBlock(userId, subject)
  }
}

const clearOtpAttemptState = async (userId, subject) => {
  await Promise.all([
    del({ key: getOtpTrailsCacheKey(userId, subject) }),
    del({ key: getWrongOtpTrailsCacheKey(userId, subject) }),
    del({ key: getUserBlockCacheKey(userId, subject) })
  ])
}

const getConfirmedUserByEmail = async (email) => {
  const user = await userRepo.findOne({ filter: { email } })

  if (!user) notFoundException('User not found')
  if (!user.confirmEmail) unauthorizedException('Please confirm your email first')

  return user
}

const verifyOtp = async ({ user, otp, subject }) => {
  await checkIfUserBlocked(user.id, subject)

  const key = getOtpCacheKey(user.id, subject)
  const cachedOtp = await get({ key })

  if (cachedOtp === null || String(cachedOtp) !== String(otp)) {
    await recordWrongOtpAttempt(user.id, subject)
    unauthorizedException('Invalid or expired OTP')
  }

  return key
}

export const createAndSendOTP = async ({
  user,
  subject,
  title,
  message,
  emailSubject
}) => {
  await checkIfUserBlocked(user.id, subject)
  await recordSendAttempt(user.id, subject)

  const otp = Math.trunc(Math.random() * 10000).toString().padStart(4, '0')
  const content = otpEmailContent[subject] ?? {}

  await set({
    key: getOtpCacheKey(user.id, subject),
    value: otp,
    ttl: OTP_TTL_SECONDS
  })
  emailEventEmitter.emit(emailEventEnum.OTP, {
    email: user.email,
    otp,
    subject: emailSubject ?? content.subject,
    title: title ?? content.title,
    message: message ?? content.message,
    expiresIn: '5 minutes'
  })
}

export const signup = async (data) => {
  const checkUser = await userRepo.findOne({ filter: { email: data.email } })

  if (checkUser) {
    conflictException('User already exists')
  }

  const { confirmPassword, ...userData } = data
  userData.password = await myHash({ plainText: data.password })
  userData.phone = encryption(data.phone)

  const user = await userRepo.create({ data: userData })
  await createAndSendOTP({
    user,
    subject: otpSubjectEnum.SIGNUP
  })

  return user
}

export const login = async (data) => {
  const user = await userRepo.findOne({
    filter: { email: data.email },
    projection: { email: 1, password: 1, role: 1, confirmEmail: 1 }
  })

  if (!user?.password) {
    notFoundException('User not found')
  }

  const match = await myCompare({
    plainText: data.password,
    cipherText: user.password
  })

  if (!match) {
    notFoundException('User not found')
  }

  if (!user.confirmEmail) {
    await createAndSendOTP({
      user,
      subject: otpSubjectEnum.SIGNUP
    })
    unauthorizedException('Please confirm your email first')
  }

  return createLoginTokens(user)
}

export const rotateToken = async (user, decoded) => {
  const currentTime = Date.now()
  const accessExpiresAt = (decoded.iat + ACCESS_EXPIRATION) * 1000

  if (currentTime < accessExpiresAt) {
    conflictException('Access token still valid')
  }

  const tokens = createLoginTokens(user)
  await revokeToken(decoded)

  return tokens
}

const revokeToken = async ({ sub, jti, exp }) => {
  const ttl = exp - Math.floor(Date.now() / 1000)

  if (ttl > 0) {
    await set({
      key: getRevokedTokenCacheKey({ userId: sub, jti }),
      value: true,
      ttl
    })
  }
}

export const logout = async ({
  user,
  decoded,
  action = logoutActionEnum.DEVICE
}) => {
  if (action === logoutActionEnum.ALL) {
    const logoutCutoff = new Date((Math.floor(Date.now() / 1000) + 1) * 1000)

    await userRepo.findByIdAndUpdate({
      id: user.id,
      update: { $set: { changeCredentialsAt: logoutCutoff } }
    })
    await deleteByPrefix({ prefix: getRevokedTokenCachePrefix(user.id) })
    return
  }

  await revokeToken(decoded)
}

export const confirmEmail = async ({ email, otp }) => {
  const user = await userRepo.findOne({ filter: { email } })

  if (!user) {
    notFoundException('User not found')
  }

  await verifyOtp({ user, otp, subject: otpSubjectEnum.SIGNUP })

  await userRepo.findByIdAndUpdate({
    id: user.id,
    update: { $set: { confirmEmail: new Date() } }
  })
  await del({ key: getOtpCacheKey(user.id, otpSubjectEnum.SIGNUP) })
  await clearOtpAttemptState(user.id, otpSubjectEnum.SIGNUP)
}

export const resendOtp = async ({ email, subject }) => {
  const user = await userRepo.findOne({ filter: { email } })

  if (!user) notFoundException('User not found')
  await checkIfUserBlocked(user.id, subject)

  if (subject === otpSubjectEnum.SIGNUP && user.confirmEmail) {
    conflictException('Email is already confirmed')
  }

  if (subject === otpSubjectEnum.FORGOT_PASSWORD && !user.confirmEmail) {
    unauthorizedException('Please confirm your email first')
  }

  const otpKey = getOtpCacheKey(user.id, subject)
  if ((await get({ key: otpKey })) !== null) {
    conflictException('OTP is still valid')
  }

  await createAndSendOTP({ user, subject })
}

export const forgotPassword = async ({ email }) => {
  const user = await getConfirmedUserByEmail(email)
  await createAndSendOTP({
    user,
    subject: otpSubjectEnum.FORGOT_PASSWORD
  })
}

export const verifyForgetPasswordOtp = async ({ email, otp }) => {
  const user = await getConfirmedUserByEmail(email)
  const key = await verifyOtp({
    user,
    otp,
    subject: otpSubjectEnum.FORGOT_PASSWORD
  })

  await expire({ key, seconds: OTP_TTL_SECONDS })
  await clearOtpAttemptState(user.id, otpSubjectEnum.FORGOT_PASSWORD)
}

export const resetPassword = async ({ email, otp, password }) => {
  const user = await getConfirmedUserByEmail(email)
  await verifyOtp({
    user,
    otp,
    subject: otpSubjectEnum.FORGOT_PASSWORD
  })
  const hashedPassword = await myHash({ plainText: password })

  await userRepo.findByIdAndUpdate({
    id: user.id,
    update: {
      $set: {
        password: hashedPassword,
        changeCredentialsAt: new Date()
      }
    }
  })
  await del({ key: getOtpCacheKey(user.id, otpSubjectEnum.FORGOT_PASSWORD) })
  await clearOtpAttemptState(user.id, otpSubjectEnum.FORGOT_PASSWORD)
}

export const verifyGoogleAccount = async (idToken) => {
  let ticket

  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    })
  } catch {
    unauthorizedException('Invalid Google token')
  }

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
