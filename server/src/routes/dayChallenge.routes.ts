import { Router } from 'express'
import { protect, withLegacyUser } from '../middleware/auth.middleware'
import { perUserLimiter } from '../middleware/rateLimit.middleware'
import { createChallenge, endChallenge, getChallenge, inviteFriends, leave, listChallenges, respond } from '../controllers/dayChallenge.controller'

const router = Router()
router.use(protect)
router.use(withLegacyUser)
router.use(perUserLimiter(60, 60 * 1000))

router.get('/', listChallenges)
router.post('/', createChallenge)
router.get('/:id', getChallenge)
router.post('/:id/invite', inviteFriends)
router.post('/:id/accept', respond(true))
router.post('/:id/decline', respond(false))
router.post('/:id/leave', leave)
router.delete('/:id', endChallenge)

export default router
