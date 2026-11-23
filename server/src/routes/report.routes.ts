import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { perIpLimiter, perUserLimiter } from '../middleware/rateLimit.middleware'
import { downloadReport, getReportHistory } from '../controllers/report.controller'
import { requirePlan } from '../middleware/plan.middleware'

const needPro = requirePlan('pro', 'Reports and CSV export')
const needPremium = requirePlan('premium', 'PDF progress reports')
/** A CSV needs Pro, a PDF needs Premium. */
const exportGate = (req: Parameters<typeof needPro>[0], res: Parameters<typeof needPro>[1], next: Parameters<typeof needPro>[2]) => (req.query.format === 'pdf' ? needPremium : needPro)(req, res, next)

const router = Router()

// Reports contain personal health data, so they are only available to the signed-in owner.
// Per-IP first (so junk tokens are stopped before the sign-in check), then per person.
router.use(perIpLimiter(120))
router.use(protect)
router.get('/history', needPro, perUserLimiter(60, 15 * 60 * 1000), getReportHistory)
// Building a PDF is the heaviest request here, so keep downloads to 20 per 15 minutes.
router.get('/export', exportGate, perUserLimiter(20, 15 * 60 * 1000), downloadReport)

export default router
