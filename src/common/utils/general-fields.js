import mongoose from 'mongoose'
import { z } from 'zod'
import { getErrorMessage, keys } from './get-error-message.js'

export const gf = Object.freeze({
  password: (lang) => z.string({
    error: getErrorMessage(keys.INVALID_TYPE, lang)
  })
    .min(5, { error: getErrorMessage(keys.SHORT_PASSWORD, lang) })
    .max(20),

  id: (lang) => {
    const invalidObjectId = getErrorMessage(keys.INVALID_OBJECT_ID, lang)

    return z.string({ error: getErrorMessage(keys.INVALID_TYPE, lang) })
      .length(24, { error: invalidObjectId })
      .refine((value) => mongoose.Types.ObjectId.isValid(value), {
        error: invalidObjectId
      })
  }
})
