import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { perIpLimiter, perUserLimiter } from '../middleware/rateLimit.middleware'
import { getAnalyticsOverview } from '../controllers/analytics.controller'

const router = Router()

router.use(perIpLimiter(200))
router.use(protect)
router.use(perUserLimiter(60))
router.get('/overview', getAnalyticsOverview)

export default router
