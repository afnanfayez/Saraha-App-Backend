import { Router } from 'express'
import { auth, authorization } from '../../common/middleware/index.js'
import { roleEnum } from '../../common/enums/role.enum.js'
import { successResponse } from '../../common/utils/response.js'
import { validation } from '../../common/middleware/validator.js'
import { getUserProfile, profile } from './user.service.js'
import { userProfileSchema } from './user.validation.js'

export const userController = Router()

userController.get(
  '/user-profile/:userId',
  validation(userProfileSchema),
  async (req, res) => {
    const user = await getUserProfile(req.validated.params.userId)

    return successResponse({
      res,
      data: user
    })
  }
)

userController.use(auth())

userController.get('/profile', async (req, res) => {
  const user = await profile(req.user)

  return successResponse({
    res,
    data: user
  })
})

userController.get(
  '/admin-profile',
  authorization([roleEnum.admin]),
  async (req, res) => {
    const user = await profile(req.user)

    return successResponse({
      res,
      data: user
    })
  }
)
