import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { referralClaimLimiter } from '../middleware/rateLimit.middleware'
import { claimReferral, getMyReferral } from '../controllers/referral.controller'

const router = Router()

router.use(protect)
router.get('/me', getMyReferral)
router.post('/claim', referralClaimLimiter, claimReferral)

export default router
