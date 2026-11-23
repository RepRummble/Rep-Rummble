import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { adminEmails } from '../middleware/business.middleware'
import { planOf, upgradeBody } from '../middleware/plan.middleware'
import { PLAN_RANK } from '../config/billing'
import { CheckIn } from '../models/CheckIn.model'
import { NutritionRequest } from '../models/NutritionRequest.model'
import { sendMail } from '../services/mail.service'
import { MAX_CHECKINS_PER_MONTH, OPEN_CHECKIN_STATUSES, cleanField, monthKeyOf, nextMonthStart } from '../services/coaching.logic'
import { isId } from '../services/social.service'

const isPremium = async (userId: string) => PLAN_RANK[await planOf(userId)] >= PLAN_RANK.premium
const tellTeam = (subject: string, text: string) => { const to = adminEmails(); if (to.length) sendMail(to, subject, text).catch(() => {}) }

const shapeCheckIn = (c: any) => ({
  _id: String(c._id), topic: c.topic, preferredTimes: c.preferredTimes, status: c.status, createdAt: c.createdAt,
  scheduledFor: c.scheduledFor ?? null, meetingLink: c.meetingLink ?? null, coachName: c.coachName ?? null,
  summary: c.summary ?? null, actionItems: c.actionItems ?? [], declineReason: c.declineReason ?? null,
})

// @route GET /api/coaching/checkins?tz=
export const listCheckIns = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id
  const month = monthKeyOf(new Date(), req.query.tz)
  const [items, used, premium] = await Promise.all([
    CheckIn.find({ userId }).sort({ createdAt: -1 }).limit(30).lean(),
    CheckIn.countDocuments({ userId, monthKey: month, counts: true }),
    isPremium(userId),
  ])
  const open = items.some((c) => (OPEN_CHECKIN_STATUSES as readonly string[]).includes(c.status))
  const remaining = Math.max(0, MAX_CHECKINS_PER_MONTH - used)
  res.json({ success: true, data: { premium, items: items.map(shapeCheckIn), limit: MAX_CHECKINS_PER_MONTH, used, remaining, resetsOn: nextMonthStart(month), canRequest: premium && remaining > 0 && !open } })
}

// @route POST /api/coaching/checkins   { topic, preferredTimes?, tz? }   Premium only. Two a month, one open at a time.
export const requestCheckIn = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id
  if (!(await isPremium(userId))) return res.status(402).json(upgradeBody('premium', 'Coach check-ins'))
  const topic = cleanField(req.body?.topic, 600)
  if (topic.length < 10) return res.status(400).json({ success: false, message: 'Tell your coach what you would like to talk about (at least a sentence).' })
  const month = monthKeyOf(new Date(), req.body?.tz)
  if (await CheckIn.exists({ userId, status: { $in: [...OPEN_CHECKIN_STATUSES] } })) return res.status(409).json({ success: false, code: 'open_checkin', message: 'You already have a check-in waiting. Cancel it or wait for it to be done before asking for another.' })
  if (await CheckIn.countDocuments({ userId, monthKey: month, counts: true }) >= MAX_CHECKINS_PER_MONTH) {
    return res.status(409).json({ success: false, code: 'limit_reached', resetsOn: nextMonthStart(month), message: `You have used your ${MAX_CHECKINS_PER_MONTH} check-ins for this month. They come back on ${nextMonthStart(month)}.` })
  }
  const c = await CheckIn.create({ userId, email: req.user?.email, name: req.user?.displayName, topic, preferredTimes: cleanField(req.body?.preferredTimes, 300), monthKey: month })
  tellTeam('New coach check-in request', `${req.user?.displayName ?? 'A member'} (${req.user?.email ?? 'no email'}) asked for a check-in.\n\nTopic: ${topic}\nPreferred times: ${c.preferredTimes || 'not given'}\n\nSchedule it in the admin area.`)
  res.status(201).json({ success: true, data: shapeCheckIn(c) })
}

// @route POST /api/coaching/checkins/:id/cancel
export const cancelCheckIn = async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  const c = isId(id) ? await CheckIn.findOne({ _id: id, userId: req.user!.id }) : null
  if (!c) return res.status(404).json({ success: false, message: 'Check-in not found.' })
  if (!(OPEN_CHECKIN_STATUSES as readonly string[]).includes(c.status)) return res.status(400).json({ success: false, message: 'That check-in is already finished.' })
  // Cancelling before a coach scheduled it gives the check-in back; after that it counts.
  if (c.status === 'requested') c.counts = false
  c.status = 'cancelled'
  await c.save()
  res.json({ success: true, data: shapeCheckIn(c) })
}

const shapeNutrition = (r: any) => r && ({
  _id: String(r._id), goal: r.goal, mealsPerDay: r.mealsPerDay, dietPrefs: r.dietPrefs, allergies: r.allergies, notes: r.notes,
  status: r.status, createdAt: r.createdAt, plan: r.plan ?? null, coachName: r.coachName ?? null, deliveredAt: r.deliveredAt ?? null, declineReason: r.declineReason ?? null,
})

// @route GET /api/coaching/nutrition?tz=
export const getNutrition = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id
  const month = monthKeyOf(new Date(), req.query.tz)
  const [latest, delivered, usedThisMonth, premium] = await Promise.all([
    NutritionRequest.findOne({ userId }).sort({ createdAt: -1 }).lean(),
    NutritionRequest.findOne({ userId, status: 'delivered' }).sort({ deliveredAt: -1 }).lean(),
    NutritionRequest.countDocuments({ userId, monthKey: month, status: { $ne: 'declined' } }),
    isPremium(userId),
  ])
  res.json({ success: true, data: { premium, latest: shapeNutrition(latest), current: shapeNutrition(delivered), canRequest: premium && latest?.status !== 'requested' && usedThisMonth === 0, resetsOn: nextMonthStart(month) } })
}

// @route POST /api/coaching/nutrition   { goal, mealsPerDay?, dietPrefs?, allergies?, notes?, tz? }   Premium only. One a month.
export const requestNutrition = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id
  if (!(await isPremium(userId))) return res.status(402).json(upgradeBody('premium', 'A custom nutrition plan'))
  const goal = cleanField(req.body?.goal, 200)
  if (goal.length < 3) return res.status(400).json({ success: false, message: 'Tell your coach your goal, for example "lose 5 kg" or "build muscle".' })
  const month = monthKeyOf(new Date(), req.body?.tz)
  if (await NutritionRequest.exists({ userId, status: 'requested' })) return res.status(409).json({ success: false, code: 'open_request', message: 'Your coach is already working on your plan.' })
  if (await NutritionRequest.countDocuments({ userId, monthKey: month, status: { $ne: 'declined' } }) >= 1) {
    return res.status(409).json({ success: false, code: 'limit_reached', resetsOn: nextMonthStart(month), message: `You can ask for one new plan a month. You can ask again on ${nextMonthStart(month)}.` })
  }
  const meals = Math.round(Number(req.body?.mealsPerDay))
  const r = await NutritionRequest.create({
    userId, email: req.user?.email, name: req.user?.displayName, goal, monthKey: month,
    mealsPerDay: Number.isFinite(meals) ? Math.min(8, Math.max(2, meals)) : 3,
    dietPrefs: cleanField(req.body?.dietPrefs, 400), allergies: cleanField(req.body?.allergies, 400), notes: cleanField(req.body?.notes, 800),
  })
  tellTeam('New custom nutrition plan request', `${req.user?.displayName ?? 'A member'} (${req.user?.email ?? 'no email'}) asked for a nutrition plan.\n\nGoal: ${goal}\nAllergies: ${r.allergies || 'none given'}\n\nWrite it in the admin area.`)
  res.status(201).json({ success: true, data: shapeNutrition(r) })
}
