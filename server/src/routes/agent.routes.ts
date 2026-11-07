import { Router } from 'express'
import {
  getDashboard,
  getQueue,
  getActiveChats,
  claimConversation,
  transferConversation,
  updateStatus,
  getAnalytics,
  getAgentConversation
} from '../controllers/agent.controller'
import { protect, withLegacyUser, agentOnly } from '../middleware/auth.middleware'

const router = Router()

// All agent routes require authentication and agent role
router.use(protect)
router.use(withLegacyUser) // agents are records keyed by the account record, not by the sign-in id
router.use(agentOnly)

// Dashboard and stats
router.get('/dashboard', getDashboard)
router.get('/analytics', getAnalytics)

// Queue management
router.get('/queue', getQueue)
router.get('/active', getActiveChats)

// Conversation management
router.get('/conversation/:id', getAgentConversation)
router.post('/claim/:conversationId', claimConversation)
router.post('/transfer/:conversationId', transferConversation)

// Agent status
router.put('/status', updateStatus)

export default router
