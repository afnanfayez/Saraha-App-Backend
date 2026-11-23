import { EventEmitter } from 'node:events'
import { sendMail } from '../services/mail.service.js'
import { emailTemplate } from '../templates/email.template.js'

export const emailEventEnum = Object.freeze({
  OTP: 'otp'
})

export const emailEventEmitter = new EventEmitter()

const sendOtpEmail = ({ email, otp, subject, title, message, expiresIn }) => {
  sendMail({
    receivers: { to: email },
    subject: subject ?? 'Confirm your email',
    html: emailTemplate({
      title: title ?? 'Confirm your email',
      message: message ?? 'Use the code below to confirm your email address.',
      otp,
      expiresIn: expiresIn ?? '5 minutes'
    })
  }).catch(() => {
    console.error('OTP email could not be sent')
  })
}

emailEventEmitter.on(emailEventEnum.OTP, sendOtpEmail)
