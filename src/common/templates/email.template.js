export const emailTemplate = ({ title, message, otp, expiresIn }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #222;">
    <h1 style="font-size: 24px; margin-bottom: 16px;">${title}</h1>
    <p style="font-size: 16px; line-height: 1.5;">${message}</p>
    <div style="margin: 24px 0; padding: 16px; background-color: #f3f4f6; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
      ${otp}
    </div>
    <p style="font-size: 14px; color: #555;">This code expires in ${expiresIn}.</p>
  </div>
`
