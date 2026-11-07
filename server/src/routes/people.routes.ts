import { Router } from 'express'
import { protect, withLegacyUser } from '../middleware/auth.middleware'
import { perUserLimiter } from '../middleware/rateLimit.middleware'
import { search, streakBoard } from '../controllers/people.controller'

const router = Router()
router.use(protect)
router.use(withLegacyUser)
router.use(perUserLimiter(60, 60 * 1000))

router.get('/search', search)
router.get('/streaks', streakBoard)

export default router
