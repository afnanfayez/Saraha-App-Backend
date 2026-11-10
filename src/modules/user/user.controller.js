import { Router } from 'express'
import { auth, authorization } from '../../common/middleware/index.js'
import { roleEnum } from '../../common/enums/role.enum.js'
import { successResponse } from '../../common/utils/response.js'
import { profile } from './user.service.js'

export const userController = Router()

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
