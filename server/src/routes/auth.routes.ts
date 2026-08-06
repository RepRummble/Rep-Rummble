import { Router } from 'express'
import { register, login, getMe, getOAuthUrl, logout, updateProfile, deleteAccount } from '../controllers/auth.controller'
import { protect } from '../middleware/auth.middleware'
import { authLimiter, loginLimiter } from '../middleware/rateLimit.middleware'

const router = Router()

// Public routes (rate-limited against brute-force / credential stuffing)
router.post('/register', authLimiter, register)
router.post('/login', loginLimiter, login)

// OAuth routes (Supabase handles the callback)
router.get('/oauth/:provider', getOAuthUrl)

// Protected routes
router.get('/me', protect, getMe)
router.post('/logout', protect, logout)
router.put('/profile', protect, updateProfile)
router.delete('/account', protect, deleteAccount)

export default router
