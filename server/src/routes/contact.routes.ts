import { Router } from 'express'
import { createContact } from '../controllers/contact.controller'
import { submitLimiter } from '../middleware/rateLimit.middleware'

const router = Router()

router.post('/', submitLimiter, createContact)

export default router
