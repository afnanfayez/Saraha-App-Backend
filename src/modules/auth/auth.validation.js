import { z } from 'zod'

export const loginSchema = z.strictObject({
  email: z.string().email(),
  password: z.string()
})

export const signupSchema = loginSchema.extend({
  username: z.string().min(5).refine((username) => username.includes(' '), {
    message: 'Username must include space'
  }),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone must be in E.164 format'
  }),
  gender: z.number().int(),
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
