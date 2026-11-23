import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { adminByEmail } from '../middleware/business.middleware'
import { perIpLimiter, perUserLimiter } from '../middleware/rateLimit.middleware'
import {
  adminCheckIns, adminNutrition, adminStatus, declineNutrition, deleteLead, deliverNutrition, exportLeads, leadStats, listLeads, updateCheckIn,
} from '../controllers/admin.controller'

// Staff only: the signed-in person's verified email must be listed in ADMIN_EMAILS.
const router = Router()
router.use(perIpLimiter(200))
router.use(protect)
router.use(adminByEmail)
router.use(perUserLimiter(120))

router.get('/status', adminStatus)
router.get('/leads/stats', leadStats)
router.get('/leads/export', exportLeads)
router.get('/leads', listLeads)
router.delete('/leads/:id', deleteLead)
router.get('/checkins', adminCheckIns)
router.patch('/checkins/:id', updateCheckIn)
router.get('/nutrition', adminNutrition)
router.post('/nutrition/:id/deliver', deliverNutrition)
router.post('/nutrition/:id/decline', declineNutrition)

export default router
