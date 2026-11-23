import { Router } from 'express'
import { auth, authorization } from '../../common/middleware/index.js'
import { roleEnum } from '../../common/enums/role.enum.js'
import { successResponse } from '../../common/utils/response.js'
import { validation } from '../../common/middleware/validator.js'
import { getUserProfile, profile } from './user.service.js'
import { userProfileSchema, userUploadSchema } from './user.validation.js'
import { uploadFiles, processFile } from '../../common/middleware/file-upload.js'
import { imageFileTypes } from '../../common/enums/file-type.enum.js'
import { badRequestException } from '../../common/utils/exceptions.js'

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

const uploadUserImage = uploadFiles({
  storageType: 'disk',
  storageFolder: 'users',
  types: imageFileTypes
})

userController.post(
  '/:id',
  validation(userUploadSchema),
  uploadUserImage.single('image'),
  processFile({
    storageType: 'disk',
    storageFolder: 'users',
    types: imageFileTypes
  }),
  async (req, res) => {
    if (!req.file) badRequestException('Image file is required')

    return successResponse({
      res,
      message: 'Image uploaded successfully',
      data: {
        userId: req.validated.params.id,
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    })
  }
)

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
