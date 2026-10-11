import { Request, Response } from 'express'
import { User } from '../models/User.model'
import { Lead } from '../models/Lead.model'
import { WorkoutSession } from '../models/WorkoutSession.model'
import { Review } from '../models/Review.model'
import { isDBConnected } from '../config/database'

export async function getPublicStats(_req: Request, res: Response) {
  if (!isDBConnected()) {
    return res.json({ userCount: 0, waitlistCount: 0, workoutCount: 0, reviewCount: 0, averageRating: null })
  }
  try {
    const [userCount, waitlistCount, workoutCount, ratingAgg] = await Promise.all([
      User.countDocuments(),
      Lead.countDocuments(),
      WorkoutSession.countDocuments({ status: 'completed' }),
      Review.aggregate([
        { $match: { approved: true } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
    ])
    const reviewStats = ratingAgg[0] ?? { avg: null, count: 0 }
    res.json({
      userCount,
      waitlistCount,
      workoutCount,
      reviewCount: reviewStats.count,
      averageRating: reviewStats.avg ? Math.round(reviewStats.avg * 10) / 10 : null,
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
}
