import crypto from 'node:crypto'
import {
  ENC_ALGO,
  ENC_IV_LENGTH,
  ENC_KEY
} from '../../config/config.service.js'

export const encryption = (text) => {
  const iv = crypto.randomBytes(ENC_IV_LENGTH)
  const cipher = crypto.createCipheriv(
    ENC_ALGO,
    Buffer.from(ENC_KEY, 'hex'),
    iv
  )

  let result = cipher.update(text, 'utf8', 'hex')
  result += cipher.final('hex')

  return iv.toString('hex') + ':' + result
}

export const decryption = (cipherText) => {
  const [ivHex, encrypted] = cipherText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv(
    ENC_ALGO,
    Buffer.from(ENC_KEY, 'hex'),
    iv
  )

  let result = decipher.update(encrypted, 'hex', 'utf8')
  result += decipher.final('utf8')

  return result
}
