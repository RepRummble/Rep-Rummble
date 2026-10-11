import { Router } from 'express'
import { getReviews, submitReview } from '../controllers/review.controller'
import { optionalAuth } from '../middleware/auth.middleware'

const router = Router()
router.get('/', getReviews)
router.post('/', optionalAuth, submitReview)
export default router
