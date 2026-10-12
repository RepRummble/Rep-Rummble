import { Request, Response } from 'express'
import nodemailer from 'nodemailer'
import { Contact } from '../models/Contact.model'
import { isDBConnected } from '../config/database'
import { ApiError } from '../types'

type ContactEntry = {
  name: string
  email: string
  message: string
  createdAt: string
}

const memoryContacts: ContactEntry[] = []

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function sendNotification(name: string, email: string, message: string) {
  const transporter = getTransporter()
  if (!transporter) return

  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(email)
  await transporter.sendMail({
    from: `"Reprummble Contact" <${process.env.GMAIL_USER}>`,
    to: 'makamdilip1997@gmail.com',
    subject: `New contact message from ${name.replace(/[\r\n]/g, ' ').slice(0, 100)}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
    `,
  })
}

// @desc    Create contact message
// @route   POST /api/contact
// @access  Public
export const createContact = async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      })
    }

    if (isDBConnected()) {
      const contact = await Contact.create({ name, email, message })
      await sendNotification(name, email, message)
      return res.status(201).json({
        success: true,
        message: 'Message sent. We will reply soon.',
        data: contact
      })
    }

    memoryContacts.push({
      name,
      email: String(email).toLowerCase(),
      message,
      createdAt: new Date().toISOString()
    })
    await sendNotification(name, email, message)

    return res.status(201).json({
      success: true,
      message: 'Message sent. We will reply soon.'
    })
  } catch (error) {
    const err = error as ApiError
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    })
  }
}
