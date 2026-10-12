import { Router } from 'express'
import { register, login, resendVerification, getMe, getOAuthUrl, logout, updateProfile, deleteAccount } from '../controllers/auth.controller'
import { protect } from '../middleware/auth.middleware'
import { authLimiter, loginLimiter, resendLimiter } from '../middleware/rateLimit.middleware'

const router = Router()

// Public routes (rate-limited against brute-force / credential stuffing)
router.post('/register', authLimiter, register)
router.post('/login', loginLimiter, login)
router.post('/resend-verification', resendLimiter, resendVerification)

// OAuth routes (Supabase handles the callback)
router.get('/oauth/:provider', getOAuthUrl)

// Protected routes
router.get('/me', protect, getMe)
router.post('/logout', protect, logout)
router.put('/profile', protect, updateProfile)
// Note: For local testing you can use the bypass token by setting
// the Authorization header to: "Bearer <TEMP_BYPASS_TOKEN>"
router.delete('/account', protect, deleteAccount)

export default router
