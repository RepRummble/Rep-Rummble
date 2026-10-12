import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { isDBConnected } from '../config/database'
import { PERIODS, Period, getHistory, wearableDays } from '../services/activity.service'
import { buildReportPdf } from '../services/report-pdf.service'

const parsePeriod = (value: unknown): Period | null => PERIODS.find((p) => p === value) ?? null
const unavailable = (res: Response) => res.status(503).json({ success: false, message: 'Service temporarily unavailable' })

// @desc    A person's own history for a period, as JSON (powers the Reports page)
// @route   GET /api/reports/history?period=monthly|yearly|historical
// @access  Private
export const getReportHistory = async (req: AuthRequest, res: Response) => {
  const period = parsePeriod(req.query.period ?? 'monthly')
  if (!period) return res.status(400).json({ success: false, message: 'Invalid period' })
  if (!isDBConnected()) return unavailable(res)
  try {
    return res.json({ success: true, data: await getHistory(req.user!.id, period) })
  } catch (error) {
    console.error('getReportHistory error:', error)
    return res.status(500).json({ success: false, message: 'Could not load your history' })
  }
}

const csvCell = (v: string | number) => String(v)

// @desc    Download the signed-in user's own report as CSV or PDF
// @route   GET /api/reports/export?period=monthly|yearly|historical&format=csv|pdf
// @access  Private
export const downloadReport = async (req: AuthRequest, res: Response) => {
  const period = parsePeriod(req.query.period ?? 'monthly')
  const format = req.query.format === 'pdf' ? 'pdf' : req.query.format === undefined || req.query.format === 'csv' ? 'csv' : null
  if (!period) return res.status(400).json({ success: false, message: 'Invalid period' })
  if (!format) return res.status(400).json({ success: false, message: 'Invalid format' })
  if (!isDBConnected()) return unavailable(res)

  try {
    const history = await getHistory(req.user!.id, period)

    if (format === 'pdf') {
      const wearables = await wearableDays(req.user!.id, period === 'monthly' ? 30 : 90)
      const pdf = await buildReportPdf(history, { name: req.user!.displayName, email: req.user!.email }, wearables)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="reprummble-${period}-report.pdf"`)
      return res.status(200).send(pdf)
    }

    const header = ['Period (UTC)', 'Workouts', 'Workout minutes', 'Calories burned', 'Calories eaten', 'Protein (g)', 'Carbs (g)', 'Fat (g)']
    const rows = history.rows.map((r) => [r.period, r.workouts, r.minutes, r.burned, r.calories, r.protein, r.carbs, r.fat])
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="reprummble-${period}-report.csv"`)
    return res.status(200).send([header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n'))
  } catch (error) {
    console.error('downloadReport error:', error)
    return res.status(500).json({ success: false, message: 'Could not build your report' })
  }
}
