import { Router } from 'express'
import { getReviews, submitReview, approveReview, deleteReview, getPendingReviews } from '../controllers/review.controller'
import { optionalAuth, protect, adminOnly } from '../middleware/auth.middleware'
import { publicReadLimiter, submitLimiter, adminLimiter } from '../middleware/rateLimit.middleware'

const router = Router()
router.get('/', publicReadLimiter, getReviews)
router.post('/', submitLimiter, optionalAuth, submitReview)
router.get('/pending', adminLimiter, protect, adminOnly, getPendingReviews)
router.patch('/:id/approve', adminLimiter, protect, adminOnly, approveReview)
router.delete('/:id', adminLimiter, protect, adminOnly, deleteReview)
export default router
