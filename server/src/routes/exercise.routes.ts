import { Router } from 'express'
import {
  getExercises,
  getExercise,
  NOT_AVAILABLE,
  seedDefaultExercises,
  analyzeExerciseForm,
  getFormFeedback
} from '../controllers/exercise.controller'
import { protect } from '../middleware/auth.middleware'

const router = Router()

// All routes require authentication
router.use(protect)

// ==================== EXERCISES ====================

// GET /api/exercises - Get all exercises with filters
router.get('/', getExercises)

// POST /api/exercises/seed - Seed default exercises (run once)
router.post('/seed', seedDefaultExercises)

// POST /api/exercises/generate - Generate new exercise with AI
router.post('/generate', NOT_AVAILABLE)

// POST /api/exercises/analyze-form - Analyze form from pose data
router.post('/analyze-form', analyzeExerciseForm)

// POST /api/exercises/form-feedback - Get feedback summary
router.post('/form-feedback', getFormFeedback)

// GET /api/exercises/:id - Get single exercise
router.get('/:id', getExercise)

export default router
