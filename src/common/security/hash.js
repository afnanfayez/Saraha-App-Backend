import bcrypt from 'bcrypt'
import argon2 from 'argon2'
import { SALT_ROUND } from '../../config/config.service.js'
import { hashEnum } from '../enums/hash.enum.js'

export const myHash = ({
  plainText,
  saltRound = SALT_ROUND,
  lib = hashEnum.bcrypt
}) => {
  switch (lib) {
    case hashEnum.argon:
      return argon2.hash(plainText)
    case hashEnum.bcrypt:
      return bcrypt.hash(plainText, saltRound)
  }
}

export const myCompare = ({
  plainText,
  cipherText,
  lib = hashEnum.bcrypt
}) => {
  switch (lib) {
    case hashEnum.argon:
      return argon2.verify(cipherText, plainText)
    case hashEnum.bcrypt:
      return bcrypt.compare(plainText, cipherText)
  }
}
