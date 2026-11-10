import { config } from 'dotenv'
import { resolve } from 'node:path'

const envFilePath = resolve(`./.env.${process.env.NODE_ENV}`)
config({ path: envFilePath })

export const port = Number(process.env.PORT)
export const DB_URI = process.env.DB_URI
export const SALT_ROUND = Number(process.env.SALT_ROUND)
export const ENC_KEY = process.env.ENC_KEY
export const ENC_IV_LENGTH = Number(process.env.ENC_IV_LENGTH)
export const ENC_ALGO = process.env.ENC_ALGO

export const ACCESS_USER_SECRET = process.env.JWT_ACCESS_USER_SECRET
export const REFRESH_USER_SECRET = process.env.JWT_REFRESH_USER_SECRET
export const ACCESS_ADMIN_SECRET = process.env.JWT_ACCESS_ADMIN_SECRET
export const REFRESH_ADMIN_SECRET = process.env.JWT_REFRESH_ADMIN_SECRET

export const ACCESS_EXPIRATION = Number(process.env.JWT_ACCESS_EXPIRATION)
export const REFRESH_EXPIRATION = Number(process.env.JWT_REFRESH_EXPIRATION)
