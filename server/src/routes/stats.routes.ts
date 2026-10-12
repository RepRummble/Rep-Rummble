import { Router } from 'express'
import { getPublicStats } from '../controllers/stats.controller'
import { publicReadLimiter } from '../middleware/rateLimit.middleware'

const router = Router()
router.get('/', publicReadLimiter, getPublicStats)
export default router
