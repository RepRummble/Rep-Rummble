import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { perIpLimiter, perUserLimiter } from '../middleware/rateLimit.middleware'
import { changePlan, createSetupIntent, getBilling, removePaymentMethod, setAutoRenew, syncPaymentMethod } from '../controllers/billing.controller'

const router = Router()

router.use(perIpLimiter(120))
router.use(protect)
router.use(perUserLimiter(30))
router.get('/', getBilling)
router.post('/plan', changePlan)
router.post('/auto-renew', setAutoRenew)
router.post('/setup-intent', createSetupIntent)
router.post('/payment-method/sync', syncPaymentMethod)
router.delete('/payment-method', removePaymentMethod)

export default router
