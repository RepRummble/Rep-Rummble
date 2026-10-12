import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { perIpLimiter, perUserLimiter } from '../middleware/rateLimit.middleware'
import { downloadReport } from '../controllers/report.controller'

const router = Router()

// Reports contain personal health data, so they are only available to the signed-in owner.
// Reports aggregate a person's whole history, so keep them to 20 downloads per 15 minutes.
router.get('/export', perIpLimiter(60), protect, perUserLimiter(20, 15 * 60 * 1000), downloadReport)

export default router
