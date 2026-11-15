import { z } from 'zod'
import { genderEnum } from '../../common/enums/gender.enum.js'
import { langEnum } from '../../common/enums/lang.enum.js'
import { gf } from '../../common/utils/general-fields.js'
import { getErrorMessage, keys } from '../../common/utils/get-error-message.js'

const emailField = (lang) => z.string({
  error: getErrorMessage(keys.INVALID_TYPE, lang)
}).email({ error: getErrorMessage(keys.INVALID_EMAIL, lang) })

const loginBodySchema = (lang) => z.strictObject({
  email: emailField(lang),
  password: gf.password(lang)
})

export const loginSchema = (lang = langEnum.EN) => z.object({
  body: loginBodySchema(lang)
})

export const signupSchema = (lang = langEnum.EN) => z.object({
  body: loginBodySchema(lang).extend({
    username: z.string().min(5).refine((username) => username.includes(' '), {
      message: 'Username must include space'
    }),
    phone: z.string().regex(/^\+[1-9]\d{1,14}$/, {
      message: 'Phone must be in E.164 format'
    }),
    gender: z.enum(genderEnum, {
      error: (issue) => issue.code === 'invalid_type'
        ? getErrorMessage(keys.INVALID_TYPE, lang)
        : undefined
    }),
    confirmPassword: z.string()
  }).superRefine((values, context) => {
    const { password, confirmPassword } = values

    if (password !== confirmPassword) {
      context.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Confirm password does not match password'
      })
    }
  })
})
