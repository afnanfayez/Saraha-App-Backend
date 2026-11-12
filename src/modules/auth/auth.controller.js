import { Router } from 'express'
import { signup, login, rotateToken, loginWithGmail } from './auth.service.js'
import { loginSchema, signupSchema } from './auth.validation.js'
import { successResponse } from '../../common/utils/response.js'
import { auth } from '../../common/middleware/authentication.js'
import { validation } from '../../common/middleware/validator.js'
import { tokenTypeEnum } from '../../common/enums/token.enum.js'

export const authController = Router()

authController.post('/signup', validation(signupSchema), async (req, res) => {
  const user = await signup(req.validated)

  return successResponse({
    res,
    status: 201,
    message: 'User created successfully',
    data: user
  })
})

authController.post('/login', validation(loginSchema), async (req, res) => {
  const tokens = await login(req.validated)

  return successResponse({
    res,
    message: 'User logged in',
    data: tokens
  })
})

authController.post('/login-with-gmail', async (req, res) => {
  const { tokens, status } = await loginWithGmail(req.body)

  return successResponse({
    res,
    status,
    message: status === 201 ? 'User created successfully' : 'User logged in',
    data: tokens
  })
})

authController.post(
  '/rotate-token',
  auth(tokenTypeEnum.refresh),
  async (req, res) => {
    const tokens = await rotateToken(req.user, req.decoded)

    return successResponse({
      res,
      data: tokens
    })
  }
)
