import { Router } from 'express'
import { protect, withLegacyUser } from '../middleware/auth.middleware'
import { perUserLimiter } from '../middleware/rateLimit.middleware'
import { claimMissions, getMissions } from '../controllers/progress.controller'

const router = Router()
router.use(protect)
router.use(withLegacyUser) // XP lives on the person's account record
router.use(perUserLimiter(60, 60 * 1000))

router.get('/missions', getMissions)
router.post('/missions/claim', claimMissions)

export default router
