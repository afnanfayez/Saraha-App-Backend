import { createClient } from 'redis'
import { REDIS_URI } from '../config/config.service.js'

export const redisClient = createClient({ url: REDIS_URI })

redisClient.on('connect', () => {
  console.log('Redis connection started')
})

redisClient.on('ready', () => {
  console.log('Redis connected successfully')
})

redisClient.on('error', (error) => {
  console.error('Redis Client Error', error)
})

export const redisConnect = async () => {
  try {
    await redisClient.connect()
  } catch (error) {
    console.log(error.message)
    process.exit(1)
  }
}
