import { Router } from 'express'
import { getWorkouts, createWorkout, getWorkout, deleteWorkout, getWorkoutStats } from '../controllers/workout.controller'
import { protect, optionalAuth } from '../middleware/auth.middleware'

const router = Router()

router.use(protect) // All routes require authentication

router.route('/')
  .get(getWorkouts)
  .post(createWorkout)

// Allow unauthenticated visitors to fetch aggregated stats (optional auth)
router.get('/stats', optionalAuth, getWorkoutStats)

router.route('/:id')
  .get(getWorkout)
  .delete(deleteWorkout)

export default router
