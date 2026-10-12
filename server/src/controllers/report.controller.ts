import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { isDBConnected } from '../config/database'
import { Workout } from '../models/Workout.model'
import { Meal } from '../models/Meal.model'

type Period = 'monthly' | 'yearly' | 'historical'

const FORMATS: Record<Period, string> = { monthly: '%Y-%m-%d', yearly: '%Y-%m', historical: '%Y' }

/** Every period label in the window, so quiet days/months still show up as zero rows. */
function labelsFor(period: Period, now: Date): string[] {
  const out: string[] = []
  if (period === 'monthly') {
    for (let i = 29; i >= 0; i--) out.push(new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10))
  } else if (period === 'yearly') {
    for (let i = 11; i >= 0; i--) out.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7))
  }
  return out
}

function windowStart(period: Period, now: Date): Date | null {
  if (period === 'monthly') return new Date(now.getTime() - 29 * 86_400_000)
  if (period === 'yearly') return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
  return null
}

export async function buildReportRows(userId: string, period: Period, now = new Date()) {
  const start = windowStart(period, now)
  if (start && period === 'monthly') start.setUTCHours(0, 0, 0, 0)
  const range = start ? { timestamp: { $gte: start } } : {}
  const format = FORMATS[period]

  const [workouts, meals] = await Promise.all([
    Workout.aggregate([
      { $match: { userId, completed: { $ne: false }, ...range } },
      { $group: {
        _id: { $dateToString: { format, date: '$timestamp' } },
        workouts: { $sum: 1 },
        minutes: { $sum: '$duration' },
        burned: { $sum: { $ifNull: ['$calories', 0] } },
      } },
    ]),
    Meal.aggregate([
      { $match: { userId, ...range } },
      { $group: {
        _id: { $dateToString: { format, date: '$timestamp' } },
        calories: { $sum: '$calories' },
        protein: { $sum: '$protein' },
        carbs: { $sum: '$carbs' },
        fat: { $sum: '$fat' },
      } },
    ]),
  ])

  const byKey = new Map<string, Record<string, number>>()
  for (const w of workouts) byKey.set(w._id, { workouts: w.workouts, minutes: w.minutes, burned: w.burned })
  for (const m of meals) byKey.set(m._id, { ...byKey.get(m._id), calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat })

  const keys = labelsFor(period, now)
  const labels = keys.length ? keys : [...byKey.keys()].sort()
  const n = (v: number | undefined) => Math.round((v ?? 0) * 10) / 10
  return labels.map((label) => {
    const r = byKey.get(label) ?? {}
    return [label, n(r.workouts), n(r.minutes), n(r.burned), n(r.calories), n(r.protein), n(r.carbs), n(r.fat)]
  })
}

// @desc    Download the signed-in user's own report as CSV
// @route   GET /api/reports/export?period=monthly|yearly|historical
// @access  Private
export const downloadReport = async (req: AuthRequest, res: Response) => {
  const period = String(req.query.period || 'monthly') as Period
  if (!(period in FORMATS)) return res.status(400).json({ success: false, message: 'Invalid period' })
  if (!isDBConnected()) return res.status(503).json({ success: false, message: 'Service temporarily unavailable' })

  try {
    const rows = await buildReportRows(req.user!.id, period)
    const header = ['Period (UTC)', 'Workouts', 'Workout minutes', 'Calories burned', 'Calories eaten', 'Protein (g)', 'Carbs (g)', 'Fat (g)']
    const csv = [header, ...rows].map((row) => row.join(',')).join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="reprummble-${period}-report.csv"`)
    return res.status(200).send(csv)
  } catch (error) {
    console.error('downloadReport error:', error)
    return res.status(500).json({ success: false, message: 'Could not build your report' })
  }
}
