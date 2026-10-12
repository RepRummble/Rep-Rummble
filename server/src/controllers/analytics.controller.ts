import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { isDBConnected } from '../config/database'
import { getOverview } from '../services/activity.service'

// @desc    Everything the member dashboard shows: totals, streaks, daily trends, recent activity, wearables
// @route   GET /api/analytics/overview
// @access  Private
export const getAnalyticsOverview = async (req: AuthRequest, res: Response) => {
  if (!isDBConnected()) return res.status(503).json({ success: false, message: 'Service temporarily unavailable' })
  try {
    return res.json({ success: true, data: await getOverview(req.user!.id) })
  } catch (error) {
    console.error('getAnalyticsOverview error:', error)
    return res.status(500).json({ success: false, message: 'Could not load your analytics' })
  }
}
