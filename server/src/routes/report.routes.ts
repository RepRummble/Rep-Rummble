import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { downloadReport } from '../controllers/report.controller'

const router = Router()

// Reports contain personal health data, so they are only available to the signed-in owner.
router.get('/export', protect, downloadReport)

export default router
