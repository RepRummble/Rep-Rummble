import { Router } from 'express'
import { analyzeFood, quickLogMeal, getNutritionInfo, searchNutrition, getAiUsage } from '../controllers/ai.controller'
import { protect } from '../middleware/auth.middleware'
import { perUserLimiter } from '../middleware/rateLimit.middleware'
import { aiQuota } from '../middleware/aiQuota.middleware'

const router = Router()

// All AI routes require authentication
router.use(protect)
// A burst limit per person, then a daily allowance per kind of AI call (free vs paid), counted on the server.
router.use(perUserLimiter(30, 60 * 1000))

// GET /api/ai/usage - what is left of today's allowance
router.get('/usage', getAiUsage)

// POST /api/ai/analyze-food - Analyze food image
router.post('/analyze-food', aiQuota('scan'), analyzeFood)

// POST /api/ai/quick-log - Quick log meal from text
router.post('/quick-log', aiQuota('quicklog'), quickLogMeal)

// GET /api/ai/nutrition - Search nutrition database
router.get('/nutrition', aiQuota('search'), searchNutrition)

// GET /api/ai/nutrition/:foodName - Get nutrition info
router.get('/nutrition/:foodName', aiQuota('search'), getNutritionInfo)

export default router
