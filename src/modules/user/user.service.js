import userRepo from '../../database/repo/user.repo.js'
import { notFoundException } from '../../common/utils/exceptions.js'

export const profile = (user) => {
  return user
}

export const getUserProfile = async (userId) => {
  const user = await userRepo.findById({
    id: userId,
    projection: {
      password: 0,
      phone: 0,
      __v: 0,
      createdAt: 0,
      updatedAt: 0,
      role: 0,
      provider: 0
    }
  })

  if (!user) {
    notFoundException('User not found')
  }

  return user
}
