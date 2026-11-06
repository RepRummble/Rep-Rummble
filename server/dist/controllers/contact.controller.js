"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContact = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const Contact_model_1 = require("../models/Contact.model");
const database_1 = require("../config/database");
const memoryContacts = [];
function getTransporter() {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)
        return null;
    return nodemailer_1.default.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
async function sendNotification(name, email, message) {
    const transporter = getTransporter();
    if (!transporter)
        return;
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
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
    });
}
// @desc    Create contact message
// @route   POST /api/contact
// @access  Public
const createContact = async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and message are required'
            });
        }
        if ((0, database_1.isDBConnected)()) {
            const contact = await Contact_model_1.Contact.create({ name, email, message });
            await sendNotification(name, email, message);
            return res.status(201).json({
                success: true,
                message: 'Message sent. We will reply soon.',
                data: contact
            });
        }
        memoryContacts.push({
            name,
            email: String(email).toLowerCase(),
            message,
            createdAt: new Date().toISOString()
        });
        await sendNotification(name, email, message);
        return res.status(201).json({
            success: true,
            message: 'Message sent. We will reply soon.'
        });
    }
    catch (error) {
        const err = error;
        return res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
};
exports.createContact = createContact;
//# sourceMappingURL=contact.controller.js.map