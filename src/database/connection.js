import mongoose from 'mongoose'
import { DB_URI } from '../config/config.service.js'

export const dbConnect = async () => {
  try {
    await mongoose.connect(DB_URI)
    await mongoose.syncIndexes()
    console.log('Database connected successfully')
  } catch (error) {
    console.log(error.message)
    process.exit(1)
  }
}
