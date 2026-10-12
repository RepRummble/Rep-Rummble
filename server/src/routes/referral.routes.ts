import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { perIpLimiter, perUserLimiter, referralClaimLimiter } from '../middleware/rateLimit.middleware'
import { claimReferral, getMyReferral } from '../controllers/referral.controller'

const router = Router()

router.use(perIpLimiter(200))
router.use(protect)
router.use(perUserLimiter(60))
router.get('/me', getMyReferral)
router.post('/claim', referralClaimLimiter, claimReferral)

export default router
