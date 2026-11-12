import { userModel } from '../models/user.model.js'
import baseRepo from './base.repo.js'

const userRepo = baseRepo(userModel)

export default userRepo
