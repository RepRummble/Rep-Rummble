import nodemailer from 'nodemailer'

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
}

const oneLine = (v: string) => v.replace(/[\r\n]+/g, ' ').trim()

/**
 * Plain-text notification email. Best effort: it never throws, so a mail problem can't
 * break the request that triggered it. Does nothing when GMAIL_USER / GMAIL_APP_PASSWORD are not set.
 */
export async function sendMail(to: string | string[], subject: string, text: string): Promise<boolean> {
  const transporter = getTransporter()
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean)
  if (!transporter || recipients.length === 0) return false
  try {
    await transporter.sendMail({
      from: `"Reprummble" <${process.env.GMAIL_USER}>`,
      to: recipients,
      subject: oneLine(subject).slice(0, 150),
      text,
    })
    return true
  } catch (error) {
    console.error('sendMail error:', error instanceof Error ? error.message : error)
    return false
  }
}
