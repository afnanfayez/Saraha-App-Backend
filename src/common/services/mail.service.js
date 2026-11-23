import nodemailer from 'nodemailer'
import { EMAIL_PASS, EMAIL_USER } from '../../config/config.service.js'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
})

export const sendMail = async ({ receivers, subject, html }) => {
  return await transporter.sendMail({
    from: EMAIL_USER,
    to: receivers.to,
    cc: receivers.cc,
    bcc: receivers.bcc,
    subject,
    html
  })
}
