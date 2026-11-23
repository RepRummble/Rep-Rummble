import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { CheckIn } from '../models/CheckIn.model'
import { Lead } from '../models/Lead.model'
import { NutritionRequest } from '../models/NutritionRequest.model'
import { sendMail } from '../services/mail.service'
import { cleanField, csvCell, parseNutritionPlan, safeHttpsUrl } from '../services/coaching.logic'
import { isId } from '../services/social.service'

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const mail = (to: string | undefined, subject: string, text: string) => { if (to) sendMail(to, subject, text).catch(() => {}) }

// @route GET /api/admin/status
export const adminStatus = async (_req: AuthRequest, res: Response) => {
  const [leads, checkins, nutrition] = await Promise.all([Lead.countDocuments(), CheckIn.countDocuments({ status: { $in: ['requested', 'scheduled'] } }), NutritionRequest.countDocuments({ status: 'requested' })])
  res.json({ success: true, data: { isAdmin: true, leads, openCheckIns: checkins, openNutrition: nutrition } })
}

// ── Waitlist ─────────────────────────────────────────────────────────────────────
// @route GET /api/admin/leads/stats
export const leadStats = async (_req: AuthRequest, res: Response) => {
  const now = Date.now(), day = 86_400_000
  const [total, last7, last30, bySource, perDay] = await Promise.all([
    Lead.countDocuments(),
    Lead.countDocuments({ createdAt: { $gte: new Date(now - 7 * day) } }),
    Lead.countDocuments({ createdAt: { $gte: new Date(now - 30 * day) } }),
    Lead.aggregate([{ $group: { _id: '$source', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Lead.aggregate([{ $match: { createdAt: { $gte: new Date(now - 30 * day) } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }]),
  ])
  const byDay = new Map<string, number>(perDay.map((d: { _id: string; count: number }) => [d._id, d.count]))
  const days = Array.from({ length: 30 }, (_, i) => { const k = new Date(now - (29 - i) * day).toISOString().slice(0, 10); return { date: k, count: byDay.get(k) ?? 0 } })
  res.json({ success: true, data: { total, last7, last30, bySource: bySource.map((s: { _id: string; count: number }) => ({ source: s._id || 'unknown', count: s.count })), days } })
}

const leadFilter = (req: AuthRequest) => {
  const f: Record<string, unknown> = {}
  const q = cleanField(req.query.search, 100), source = cleanField(req.query.source, 60)
  if (q) f.email = { $regex: esc(q.toLowerCase()) }
  if (source) f.source = { $eq: source }
  return f
}

// @route GET /api/admin/leads?search=&source=&page=&limit=
export const listLeads = async (req: AuthRequest, res: Response) => {
  const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit)) || 25)), page = Math.max(1, Math.floor(Number(req.query.page)) || 1)
  const filter = leadFilter(req)
  const [items, total] = await Promise.all([Lead.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Lead.countDocuments(filter)])
  res.json({ success: true, data: { items: items.map((l) => ({ _id: String(l._id), email: l.email, source: l.source || 'web', createdAt: (l as any).createdAt })), total, page, pages: Math.max(1, Math.ceil(total / limit)) } })
}

// @route GET /api/admin/leads/export   A CSV of everyone matching the same filters.
export const exportLeads = async (req: AuthRequest, res: Response) => {
  const rows = await Lead.find(leadFilter(req)).sort({ createdAt: -1 }).limit(50_000).lean()
  const csv = ['email,source,joined', ...rows.map((l) => [csvCell(l.email), csvCell(l.source || 'web'), csvCell(((l as any).createdAt as Date)?.toISOString?.() ?? '')].join(','))].join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="reprummble-waitlist.csv"')
  res.status(200).send(csv)
}

// @route DELETE /api/admin/leads/:id
export const deleteLead = async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  const r = isId(id) ? await Lead.deleteOne({ _id: id }) : null
  if (!r?.deletedCount) return res.status(404).json({ success: false, message: 'Not found.' })
  res.json({ success: true })
}

// ── Check-ins ────────────────────────────────────────────────────────────────────
const CHECKIN_STATUS = ['requested', 'scheduled', 'done', 'cancelled', 'declined']
// @route GET /api/admin/checkins?status=
export const adminCheckIns = async (req: AuthRequest, res: Response) => {
  const status = CHECKIN_STATUS.includes(String(req.query.status)) ? String(req.query.status) : 'requested'
  const items = await CheckIn.find({ status } as any).sort({ status: 1, scheduledFor: 1, createdAt: 1 }).limit(100).lean()
  res.json({ success: true, data: items.map((c) => ({ ...c, _id: String(c._id) })) })
}

// @route PATCH /api/admin/checkins/:id   { action: 'schedule' | 'complete' | 'decline', ... }
export const updateCheckIn = async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  const c = isId(id) ? await CheckIn.findById(id) : null
  if (!c) return res.status(404).json({ success: false, message: 'Check-in not found.' })
  const action = String(req.body?.action)
  const coachName = cleanField(req.body?.coachName, 80) || undefined

  if (action === 'schedule') {
    if (c.status !== 'requested' && c.status !== 'scheduled') return res.status(400).json({ success: false, message: 'Only a waiting check-in can be scheduled.' })
    const when = new Date(String(req.body?.scheduledFor))
    if (!Number.isFinite(when.getTime()) || when.getTime() < Date.now() - 60_000) return res.status(400).json({ success: false, message: 'Choose a time in the future.' })
    const link = safeHttpsUrl(req.body?.meetingLink)
    if (!link) return res.status(400).json({ success: false, message: 'Add the meeting link, starting with https://.' })
    c.status = 'scheduled'; c.scheduledFor = when; c.meetingLink = link; c.coachName = coachName
    await c.save()
    mail(c.email, 'Your coach check-in is booked', `Your check-in is on ${when.toUTCString()}${coachName ? ` with ${coachName}` : ''}.\n\nJoin here: ${link}\n\nYou can see it in the app under Profile, then Coaching.`)
  } else if (action === 'complete') {
    if (c.status !== 'scheduled' && c.status !== 'requested') return res.status(400).json({ success: false, message: 'That check-in is already finished.' })
    const summary = cleanField(req.body?.summary, 3000)
    if (summary.length < 10) return res.status(400).json({ success: false, message: 'Write a short summary for the member.' })
    c.status = 'done'; c.summary = summary; c.coachName = coachName ?? c.coachName
    c.actionItems = (Array.isArray(req.body?.actionItems) ? req.body.actionItems : []).map((a: unknown) => cleanField(a, 300)).filter(Boolean).slice(0, 10)
    await c.save()
    mail(c.email, 'Your check-in summary is ready', `${summary}\n\nSee the details in the app under Profile, then Coaching.`)
  } else if (action === 'decline') {
    if (c.status !== 'requested') return res.status(400).json({ success: false, message: 'Only a waiting check-in can be declined.' })
    const reason = cleanField(req.body?.reason, 500)
    if (reason.length < 5) return res.status(400).json({ success: false, message: 'Say why, so the member knows.' })
    c.status = 'declined'; c.declineReason = reason; c.counts = false     // a declined request is given back
    await c.save()
    mail(c.email, 'About your check-in request', `We could not take your check-in request: ${reason}\n\nIt does not count against your two a month.`)
  } else return res.status(400).json({ success: false, message: 'Unknown action.' })
  res.json({ success: true, data: { ...c.toObject(), _id: String(c._id) } })
}

// ── Nutrition plans ──────────────────────────────────────────────────────────────
// @route GET /api/admin/nutrition?status=
export const adminNutrition = async (req: AuthRequest, res: Response) => {
  const status = ['requested', 'delivered', 'declined'].includes(String(req.query.status)) ? String(req.query.status) : 'requested'
  const items = await NutritionRequest.find({ status } as any).sort({ createdAt: 1 }).limit(100).lean()
  res.json({ success: true, data: items.map((r) => ({ ...r, _id: String(r._id) })) })
}

// @route POST /api/admin/nutrition/:id/deliver   { plan, coachName? }
export const deliverNutrition = async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  const r = isId(id) ? await NutritionRequest.findById(id) : null
  if (!r) return res.status(404).json({ success: false, message: 'Request not found.' })
  if (r.status !== 'requested') return res.status(400).json({ success: false, message: 'That request is already finished.' })
  const parsed = parseNutritionPlan(req.body?.plan)
  if (!parsed.ok) return res.status(400).json({ success: false, message: parsed.message })
  r.plan = parsed.plan; r.status = 'delivered'; r.deliveredAt = new Date(); r.coachName = cleanField(req.body?.coachName, 80) || undefined
  await r.save()
  mail(r.email, 'Your custom nutrition plan is ready', `Your coach has written your plan: ${parsed.plan.calories} kcal, ${parsed.plan.protein} g protein.\n\nOpen the app, then Profile, then Coaching, to see it and use its targets.`)
  res.json({ success: true, data: { ...r.toObject(), _id: String(r._id) } })
}

// @route POST /api/admin/nutrition/:id/decline   { reason }
export const declineNutrition = async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  const r = isId(id) ? await NutritionRequest.findById(id) : null
  if (!r) return res.status(404).json({ success: false, message: 'Request not found.' })
  if (r.status !== 'requested') return res.status(400).json({ success: false, message: 'That request is already finished.' })
  const reason = cleanField(req.body?.reason, 500)
  if (reason.length < 5) return res.status(400).json({ success: false, message: 'Say why, so the member knows.' })
  r.status = 'declined'; r.declineReason = reason
  await r.save()
  mail(r.email, 'About your nutrition plan request', `We could not write your plan yet: ${reason}\n\nYou can ask again from the app.`)
  res.json({ success: true, data: { ...r.toObject(), _id: String(r._id) } })
}
