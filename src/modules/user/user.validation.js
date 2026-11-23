import { z } from 'zod'
import { langEnum } from '../../common/enums/lang.enum.js'
import { gf } from '../../common/utils/general-fields.js'

export const userProfileSchema = (lang = langEnum.EN) => z.object({
  params: z.strictObject({
    userId: gf.id(lang)
  })
})

export const userUploadSchema = (lang = langEnum.EN) => z.object({
  params: z.strictObject({
    id: gf.id(lang)
  })
})
