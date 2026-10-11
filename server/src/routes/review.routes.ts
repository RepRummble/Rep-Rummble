import { Router } from 'express'
import { getReviews, submitReview, approveReview, deleteReview, getPendingReviews } from '../controllers/review.controller'
import { optionalAuth, adminOnly } from '../middleware/auth.middleware'

const router = Router()
router.get('/', getReviews)
router.post('/', optionalAuth, submitReview)
// Admin only
router.get('/pending', adminOnly, getPendingReviews)
router.patch('/:id/approve', adminOnly, approveReview)
router.delete('/:id', adminOnly, deleteReview)
export default router
