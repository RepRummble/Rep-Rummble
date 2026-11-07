import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { aiQuota } from '../middleware/aiQuota.middleware'
import { perUserLimiter } from '../middleware/rateLimit.middleware'
import { addExercises, createRoutine, deleteRoutine, listRoutines, suggest, updateRoutine } from '../controllers/coach.controller'

const router = Router()
router.use(protect)
router.use(perUserLimiter(40, 60 * 1000))

router.post('/suggest', aiQuota('coach'), suggest)
router.get('/routines', listRoutines)
router.post('/routines', createRoutine)
router.put('/routines/:id', updateRoutine)
router.post('/routines/:id/exercises', addExercises)
router.delete('/routines/:id', deleteRoutine)

export default router
