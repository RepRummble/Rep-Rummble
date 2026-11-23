import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { perUserLimiter } from '../middleware/rateLimit.middleware'
import { cancelCheckIn, getNutrition, listCheckIns, requestCheckIn, requestNutrition } from '../controllers/coaching.controller'

const router = Router()
router.use(protect)
router.use(perUserLimiter(30, 60 * 1000))

router.get('/checkins', listCheckIns)
router.post('/checkins', requestCheckIn)
router.post('/checkins/:id/cancel', cancelCheckIn)
router.get('/nutrition', getNutrition)
router.post('/nutrition', requestNutrition)

export default router
