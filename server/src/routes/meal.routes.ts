import { Router } from 'express'
import { getMeals, createMeal, getMeal, deleteMeal, getMealStats } from '../controllers/meal.controller'
import { protect, optionalAuth } from '../middleware/auth.middleware'

const router = Router()

router.use(protect) // All routes require authentication

router.route('/')
  .get(getMeals)
  .post(createMeal)

// Allow unauthenticated visitors to fetch aggregated stats (optional auth)
router.get('/stats', optionalAuth, getMealStats)

router.route('/:id')
  .get(getMeal)
  .delete(deleteMeal)

export default router
