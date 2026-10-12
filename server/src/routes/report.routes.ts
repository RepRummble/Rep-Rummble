import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { perIpLimiter, perUserLimiter } from '../middleware/rateLimit.middleware'
import { downloadReport, getReportHistory } from '../controllers/report.controller'

const router = Router()

// Reports contain personal health data, so they are only available to the signed-in owner.
// Per-IP first (so junk tokens are stopped before the sign-in check), then per person.
router.use(perIpLimiter(120))
router.use(protect)
router.get('/history', perUserLimiter(60, 15 * 60 * 1000), getReportHistory)
// Building a PDF is the heaviest request here, so keep downloads to 20 per 15 minutes.
router.get('/export', perUserLimiter(20, 15 * 60 * 1000), downloadReport)

export default router
