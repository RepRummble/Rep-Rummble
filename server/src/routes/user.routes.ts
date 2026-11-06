import { Router } from 'express'
import { getProfile, updateProfile } from '../controllers/user.controller'
import { protect, withLegacyUser } from '../middleware/auth.middleware'

const router = Router()

router.use(protect) // All routes require authentication
router.use(withLegacyUser) // profile, xp and search use the Mongo user record

router.get('/profile', getProfile)
router.put('/profile', updateProfile)

export default router
