import { langEnum } from '../enums/lang.enum.js'

export const keys = Object.freeze({
  INVALID_EMAIL: 'INVALID_EMAIL',
  SHORT_PASSWORD: 'SHORT_PASSWORD',
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_OBJECT_ID: 'INVALID_OBJECT_ID'
})

const messages = Object.freeze({
  [keys.INVALID_EMAIL]: Object.freeze({
    [langEnum.AR]: 'إيميل غير صالح',
    [langEnum.EN]: 'Invalid email'
  }),
  [keys.SHORT_PASSWORD]: Object.freeze({
    [langEnum.AR]: 'كلمة السر قصيرة جدا',
    [langEnum.EN]: 'Password is too short'
  }),
  [keys.INVALID_TYPE]: Object.freeze({
    [langEnum.AR]: 'نوع بيانات غير صالح',
    [langEnum.EN]: 'Invalid data type'
  }),
  [keys.INVALID_OBJECT_ID]: Object.freeze({
    [langEnum.AR]: 'معرّف المستخدم غير صالح',
    [langEnum.EN]: 'Invalid ObjectId'
  })
})

export const getErrorMessage = (code, lang = langEnum.EN) => {
  return messages[code]?.[lang] ?? messages[code]?.[langEnum.EN] ?? code
}
