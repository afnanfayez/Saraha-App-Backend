import { redisClient } from '../../database/redis.connection.js'

const keyPrefix = 'saraha:'
const getKey = (key) => `${keyPrefix}${key}`

export const getOtpCacheKey = (userId, subject) =>
  `user:${userId}:otp:${subject}`

export const getOtpTrailsCacheKey = (userId, subject) =>
  `user:${userId}:otp-trails:${subject}`

export const getWrongOtpTrailsCacheKey = (userId, subject) =>
  `user:${userId}:wrong-otp-trails:${subject}`

export const getUserBlockCacheKey = (userId, subject) =>
  `user:${userId}:block:${subject}`

export const getRevokedTokenCacheKey = ({ userId, jti }) =>
  `user:${userId}:revoked:${jti}`

export const getRevokedTokenCachePrefix = (userId) =>
  `user:${userId}:revoked:`

export const set = async ({ key, value, ttl }) => {
  const cacheValue = typeof value === 'string' ? value : JSON.stringify(value)
  const options = Number(ttl) > 0 ? { EX: Number(ttl) } : undefined

  if (options) {
    return await redisClient.set(getKey(key), cacheValue, options)
  }

  return await redisClient.set(getKey(key), cacheValue)
}

export const get = async ({ key }) => {
  const cacheValue = await redisClient.get(getKey(key))

  if (cacheValue === null || !/^[\s]*[\[{]/.test(cacheValue)) {
    return cacheValue
  }

  try {
    return JSON.parse(cacheValue)
  } catch {
    return cacheValue
  }
}

export const ttl = async ({ key }) => {
  return await redisClient.ttl(getKey(key))
}

export const expire = async ({ key, seconds }) => {
  return await redisClient.expire(getKey(key), Number(seconds))
}

export const exists = async ({ key }) => {
  return (await redisClient.exists(getKey(key))) > 0
}

export const del = async ({ key }) => {
  return await redisClient.del(getKey(key))
}

export const keys = async ({ pattern = '*' } = {}) => {
  return await redisClient.keys(`${keyPrefix}${pattern}`)
}

export const deleteByPrefix = async ({ prefix }) => {
  const matchedKeys = await keys({ pattern: `${prefix}*` })

  if (matchedKeys.length === 0) {
    return 0
  }

  return await redisClient.del(matchedKeys)
}

export const increment = async ({ key }) => {
  return await redisClient.incr(getKey(key))
}
