import { Router } from 'express'
import { protect, withLegacyUser } from '../middleware/auth.middleware'
import { perUserLimiter } from '../middleware/rateLimit.middleware'
import { createStory, deleteStory, getStories, storyViewers, viewStory } from '../controllers/story.controller'

const router = Router()
router.use(protect)
router.use(withLegacyUser)
router.use(perUserLimiter(120, 60 * 1000))

router.get('/', getStories)
router.post('/', createStory)
router.post('/:id/view', viewStory)
router.get('/:id/viewers', storyViewers)
router.delete('/:id', deleteStory)

export default router
