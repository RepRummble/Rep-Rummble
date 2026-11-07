import { Router } from 'express'
import { protect, withLegacyUser } from '../middleware/auth.middleware'
import { perUserLimiter } from '../middleware/rateLimit.middleware'
import { block, listBlocks, listReports, report, unblock, updateReport } from '../controllers/safety.controller'

const router = Router()
router.use(protect)
router.use(withLegacyUser)
router.use(perUserLimiter(30, 60 * 1000))

router.post('/report', report)
router.get('/blocks', listBlocks)
router.post('/block/:userId', block)
router.delete('/block/:userId', unblock)
router.get('/reports', listReports) // reviewers only
router.patch('/reports/:id', updateReport) // reviewers only

export default router
