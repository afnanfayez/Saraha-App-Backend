import { Router } from 'express'
import { signup, login, rotateToken } from './auth.service.js'
import { successResponse } from '../../common/utils/response.js'
import { auth } from '../../common/middleware/authentication.js'
import { tokenTypeEnum } from '../../common/enums/token.enum.js'

export const authController = Router()

authController.post('/signup', async (req, res) => {
  const user = await signup(req.body)

  return successResponse({
    res,
    status: 201,
    message: 'User created successfully',
    data: user
  })
})

authController.post('/login', async (req, res) => {
  const tokens = await login(req.body)

  return successResponse({
    res,
    message: 'User logged in',
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
