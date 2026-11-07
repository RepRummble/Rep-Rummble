import { Router } from 'express'
import { protect, withLegacyUser } from '../middleware/auth.middleware'
import { perUserLimiter } from '../middleware/rateLimit.middleware'
import { inbox, markRead, send, thread, unreadCount } from '../controllers/message.controller'

const router = Router()
router.use(protect)
router.use(withLegacyUser)
router.use(perUserLimiter(120, 60 * 1000)) // the app checks for new messages every few seconds while a chat is open

router.get('/', inbox)
router.get('/unread', unreadCount)
router.get('/:userId', thread)
router.post('/:userId', perUserLimiter(30, 60 * 1000), send)
router.post('/:userId/read', markRead)

export default router
