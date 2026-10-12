import { Router } from 'express'
import { createLead } from '../controllers/lead.controller'
import { submitLimiter } from '../middleware/rateLimit.middleware'

const router = Router()

router.post('/', submitLimiter, createLead)

export default router
