import mongoose, { Model } from 'mongoose'
import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { BusinessRequest, adminEmails, findBusinessFor, isAdminUser } from '../middleware/business.middleware'
import { sendMail } from '../services/mail.service'
import { isEmail } from '../utils/validation'
import { isDBConnected } from '../config/database'
import {
  BUSINESS_TYPES, Business, BusinessFood, BusinessMealPlan, BusinessMember, BusinessPlan, BusinessStaff, STAFF_ROLES,
} from '../models/Business.model'
import { Workout } from '../models/Workout.model'

const DAY = 86_400_000
const LIMITS = { members: 5000, plans: 200, mealPlans: 200, foods: 2000, staff: 50 }

// ── small input helpers ────────────────────────────────────────────────────────
// Only real strings count: objects/arrays/numbers become '' and fail validation instead of becoming "[object Object]".
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const email = (v: unknown) => text(v, 254).toLowerCase()
const num = (v: unknown, min: number, max: number): number | null => {
  const n = Number(v)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}
const objectId = (v: unknown) => (typeof v === 'string' && mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null)
const fail = (res: Response, status: number, message: string) => res.status(status).json({ success: false, message })
const isDup = (err: unknown) => (err as { code?: number }).code === 11000
const serverError = (res: Response, label: string, err: unknown) => {
  console.error(`${label}:`, err)
  return fail(res, 500, 'Server error')
}
const unavailable = (res: Response) => fail(res, 503, 'Service temporarily unavailable')

// ── email notices (best effort; they never block the request) ─────────────────────────
const siteUrl = () => (process.env.WEB_URL || process.env.CLIENT_URL || 'https://www.reprummble.com').replace(/\/$/, '')

function notifyReviewers(name: string, type: string, city: string) {
  void sendMail(
    adminEmails(),
    `New business application: ${name}`,
    `${name} (${type}${city ? `, ${city}` : ''}) has applied to collaborate with Reprummble.\n\nReview it here: ${siteUrl()}/admin/applications\n`,
  )
}

function notifyApplicant(to: string, name: string, decision: 'approved' | 'rejected' | 'revoked', reason?: string) {
  const subject = decision === 'approved' ? `You're approved: ${name} on Reprummble` : `Update on your Reprummble application`
  const body = decision === 'approved'
    ? `Good news: ${name} has been approved.\n\nOpen your business dashboard: ${siteUrl()}/business\n`
    : decision === 'revoked'
      ? `Access to the Reprummble business dashboard for ${name} has been turned off.${reason ? `\n\nReason: ${reason}` : ''}\n\nIf you think this is a mistake, reply to this email or contact us: ${siteUrl()}/contact\n`
      : `We could not approve ${name} this time.${reason ? `\n\nReason: ${reason}` : ''}\n\nYou can update your details and apply again: ${siteUrl()}/collaborate#apply\n`
  void sendMail(to, subject, body)
}

// ── application & account ──────────────────────────────────────────────────────
// @route POST /api/business/apply
export const apply = async (req: AuthRequest, res: Response) => {
  if (!isDBConnected()) return unavailable(res)
  try {
    const ownerEmail = req.user!.email?.toLowerCase()
    if (!ownerEmail) return fail(res, 400, 'Your account needs an email address to apply')
    if (!req.user!.emailVerified) return fail(res, 403, 'Please verify your email address before applying')

    const name = text(req.body?.name, 120)
    const type = text(req.body?.type, 60)
    const contactEmail = email(req.body?.contactEmail) || ownerEmail
    if (name.length < 2) return fail(res, 400, 'Please enter your business name')
    if (!(BUSINESS_TYPES as readonly string[]).includes(type)) return fail(res, 400, 'Please choose a business type')
    if (!isEmail(contactEmail)) return fail(res, 400, 'Please enter a valid contact email')

    const fields = {
      ownerEmail, name, type, contactEmail,
      city: text(req.body?.city, 120), size: text(req.body?.size, 40), message: text(req.body?.message, 2000),
    }

    const existing = await Business.findOne({ ownerId: req.user!.id })
    if (existing) {
      if (existing.status !== 'rejected') return fail(res, 409, `You already have a ${existing.status} application`)
      // Rejected applicants may apply again with updated details.
      Object.assign(existing, fields, { status: 'pending', rejectionReason: undefined, reviewedAt: undefined, reviewedBy: undefined })
      await existing.save()
      notifyReviewers(existing.name, existing.type, existing.city)
      return res.status(200).json({ success: true, data: { status: existing.status } })
    }

    const created = await Business.create({ ownerId: req.user!.id, ...fields })
    notifyReviewers(created.name, created.type, created.city)
    return res.status(201).json({ success: true, data: { status: created.status } })
  } catch (error) {
    if (isDup(error)) return fail(res, 409, 'You already have an application')
    return serverError(res, 'business.apply', error)
  }
}

// @route GET /api/business/me
export const getMe = async (req: AuthRequest, res: Response) => {
  if (!isDBConnected()) return unavailable(res)
  try {
    const found = await findBusinessFor(req.user!)
    if (!found) return res.json({ success: true, data: { business: null } })
    const { business, role } = found
    return res.json({
      success: true,
      data: {
        role,
        business: {
          id: business.id, name: business.name, type: business.type, city: business.city, contactEmail: business.contactEmail,
          status: business.status, rejectionReason: business.status === 'rejected' ? business.rejectionReason : undefined,
        },
      },
    })
  } catch (error) {
    return serverError(res, 'business.me', error)
  }
}

// @route PATCH /api/business/profile   (owner)
export const updateProfile = async (req: BusinessRequest, res: Response) => {
  try {
    const b = req.business!
    const name = text(req.body?.name ?? b.name, 120)
    const type = text(req.body?.type ?? b.type, 60)
    const contactEmail = email(req.body?.contactEmail ?? b.contactEmail)
    if (name.length < 2) return fail(res, 400, 'Please enter your business name')
    if (!(BUSINESS_TYPES as readonly string[]).includes(type)) return fail(res, 400, 'Please choose a business type')
    if (contactEmail && !isEmail(contactEmail)) return fail(res, 400, 'Please enter a valid contact email')
    Object.assign(b, { name, type, contactEmail, city: text(req.body?.city ?? b.city, 120) })
    await b.save()
    return res.json({ success: true })
  } catch (error) {
    return serverError(res, 'business.profile', error)
  }
}

// ── for the signed-in person who was invited (called from the web and mobile apps) ───
// @route GET /api/business/memberships
export const getMemberships = async (req: AuthRequest, res: Response) => {
  if (!isDBConnected()) return unavailable(res)
  try {
    const userEmail = req.user!.email?.toLowerCase()
    // Invites are matched by email, so an unverified address must never claim someone else's invite.
    if (!userEmail || !req.user!.emailVerified) return res.json({ success: true, data: [] })

    // First sign-in after being invited: connect the invite to this account.
    await BusinessMember.updateMany({ email: userEmail, userId: { $exists: false } }, { $set: { userId: req.user!.id } })
    const rows = await BusinessMember.find({ userId: req.user!.id })
    const out = []
    for (const m of rows) {
      const business = await Business.findOne({ _id: m.businessId, status: 'approved' })
      if (!business) continue
      const [plan, mealPlan] = await Promise.all([
        m.planId ? BusinessPlan.findOne({ _id: m.planId, businessId: m.businessId }) : null,
        m.mealPlanId ? BusinessMealPlan.findOne({ _id: m.mealPlanId, businessId: m.businessId }) : null,
      ])
      out.push({
        business: { name: business.name },
        workoutPlan: plan && { name: plan.name, goal: plan.goal, level: plan.level, weeks: plan.weeks, daysPerWeek: plan.daysPerWeek, notes: plan.notes },
        mealPlan: mealPlan && { name: mealPlan.name, calories: mealPlan.calories, protein: mealPlan.protein, carbs: mealPlan.carbs, fat: mealPlan.fat, mealsPerDay: mealPlan.mealsPerDay, notes: mealPlan.notes },
      })
    }
    return res.json({ success: true, data: out })
  } catch (error) {
    return serverError(res, 'business.memberships', error)
  }
}

// ── member activity (computed from the workouts members log) ───────────────────────
interface Activity { last: Date | null; c7: number; c28: number }

async function activityFor(userIds: string[]): Promise<Map<string, Activity>> {
  const out = new Map<string, Activity>()
  if (!userIds.length) return out
  const now = Date.now()
  const since28 = new Date(now - 28 * DAY)
  const since7 = new Date(now - 7 * DAY)
  const rows = await Workout.aggregate([
    { $match: { userId: { $in: userIds }, completed: { $ne: false }, timestamp: { $gte: new Date(now - 90 * DAY) } } },
    { $group: {
      _id: '$userId',
      last: { $max: '$timestamp' },
      c28: { $sum: { $cond: [{ $gte: ['$timestamp', since28] }, 1, 0] } },
      c7: { $sum: { $cond: [{ $gte: ['$timestamp', since7] }, 1, 0] } },
    } },
  ])
  for (const r of rows) out.set(r._id, { last: r.last, c7: r.c7, c28: r.c28 })
  return out
}

const daysSince = (d: Date | null) => (d ? Math.floor((Date.now() - d.getTime()) / DAY) : null)

function describeMember(m: InstanceType<typeof BusinessMember>, plans: Map<string, { daysPerWeek: number }>, act: Map<string, Activity>) {
  const a = m.userId ? act.get(m.userId) : undefined
  const lastActiveDays = daysSince(a?.last ?? null)
  const plan = m.planId ? plans.get(String(m.planId)) : undefined
  const status = !m.userId ? 'invited' : lastActiveDays !== null && lastActiveDays <= 14 ? 'active' : 'inactive'
  const adherence = plan && m.userId ? Math.min(100, Math.round(((a?.c28 ?? 0) / (plan.daysPerWeek * 4)) * 100)) : null
  return {
    id: m.id, name: m.name, email: m.email, status,
    planId: m.planId ? String(m.planId) : null,
    mealPlanId: m.mealPlanId ? String(m.mealPlanId) : null,
    adherence, sessionsWeek: a?.c7 ?? 0, lastActiveDays,
  }
}

// ── stats: powers Overview and Reports ───────────────────────────────────────────
// @route GET /api/business/stats?weeks=4|8|12
export const getStats = async (req: BusinessRequest, res: Response) => {
  try {
    const businessId = req.business!._id
    const weeks = [4, 8, 12].includes(Number(req.query.weeks)) ? Number(req.query.weeks) : 12
    const [members, plans, mealPlanCount] = await Promise.all([
      BusinessMember.find({ businessId }), BusinessPlan.find({ businessId }), BusinessMealPlan.countDocuments({ businessId }),
    ])
    const planMap = new Map(plans.map((p) => [String(p._id), p]))
    const linked = members.filter((m) => m.userId).map((m) => m.userId as string)
    const act = await activityFor(linked)
    const described = members.map((m) => describeMember(m, planMap, act))

    // Sessions per week across linked members, oldest week first.
    const since = new Date(Date.now() - weeks * 7 * DAY)
    const weekly = Array<number>(weeks).fill(0)
    if (linked.length) {
      const rows = await Workout.aggregate([
        { $match: { userId: { $in: linked }, completed: { $ne: false }, timestamp: { $gte: since } } },
        { $group: { _id: { $floor: { $divide: [{ $subtract: ['$timestamp', since] }, 7 * DAY] } }, n: { $sum: 1 } } },
      ])
      for (const r of rows) if (r._id >= 0 && r._id < weeks) weekly[r._id] = r.n
    }

    const scored = described.filter((m) => m.adherence !== null)
    const avgAdherence = scored.length ? Math.round(scored.reduce((n, m) => n + (m.adherence as number), 0) / scored.length) : null
    const band = (test: (n: number) => boolean) => scored.filter((m) => test(m.adherence as number)).length

    return res.json({
      success: true,
      data: {
        counts: {
          members: members.length,
          active: described.filter((m) => m.status === 'active').length,
          invited: described.filter((m) => m.status === 'invited').length,
          workoutPlans: plans.length,
          mealPlans: mealPlanCount,
        },
        avgAdherence,
        weeklySessions: weekly,
        adherenceBands: { high: band((n) => n >= 80), mid: band((n) => n >= 50 && n < 80), low: band((n) => n < 50) },
        needsCheckIn: described
          .filter((m) => m.status === 'inactive' || (m.status === 'active' && (m.lastActiveDays ?? 0) >= 7))
          .map(({ id, name, lastActiveDays, adherence }) => ({ id, name, lastActiveDays, adherence })),
        planUsage: plans.map((p) => ({ name: p.name, members: members.filter((m) => String(m.planId) === String(p._id)).length })),
        members: described.filter((m) => m.status !== 'invited').map(({ name, adherence }) => ({ name, adherence })),
      },
    })
  } catch (error) {
    return serverError(res, 'business.stats', error)
  }
}

// ── members ─────────────────────────────────────────────────────────────────────
export const listMembers = async (req: BusinessRequest, res: Response) => {
  try {
    const businessId = req.business!._id
    const [members, plans] = await Promise.all([BusinessMember.find({ businessId }).sort({ createdAt: -1 }), BusinessPlan.find({ businessId })])
    const act = await activityFor(members.filter((m) => m.userId).map((m) => m.userId as string))
    const planMap = new Map(plans.map((p) => [String(p._id), p]))
    return res.json({ success: true, data: members.map((m) => describeMember(m, planMap, act)) })
  } catch (error) {
    return serverError(res, 'business.members.list', error)
  }
}

/** Plan ids must belong to the same business, otherwise one business could attach another's plan. */
async function ownedRef(model: Model<any>, id: unknown, businessId: mongoose.Types.ObjectId) {
  if (id === null || id === '' || id === undefined) return { ok: true as const, value: null }
  const oid = objectId(id)
  if (!oid || !(await model.exists({ _id: oid, businessId }))) return { ok: false as const }
  return { ok: true as const, value: oid }
}

export const createMember = async (req: BusinessRequest, res: Response) => {
  try {
    const businessId = req.business!._id
    const name = text(req.body?.name, 80)
    const memberEmail = email(req.body?.email)
    if (name.length < 2) return fail(res, 400, 'Please enter the member\'s name')
    if (!isEmail(memberEmail)) return fail(res, 400, 'Please enter a valid email address')
    if ((await BusinessMember.countDocuments({ businessId })) >= LIMITS.members) return fail(res, 400, 'Member limit reached')
    const plan = await ownedRef(BusinessPlan, req.body?.planId, businessId)
    if (!plan.ok) return fail(res, 400, 'Unknown workout plan')
    const member = await BusinessMember.create({ businessId, name, email: memberEmail, planId: plan.value })
    return res.status(201).json({ success: true, data: { id: member.id } })
  } catch (error) {
    if (isDup(error)) return fail(res, 409, 'That email is already in your member list')
    return serverError(res, 'business.members.create', error)
  }
}

export const updateMember = async (req: BusinessRequest, res: Response) => {
  try {
    const businessId = req.business!._id
    const id = objectId(req.params.id)
    if (!id) return fail(res, 400, 'Invalid member id')
    const update: Record<string, unknown> = {}
    if ('planId' in (req.body ?? {})) {
      const plan = await ownedRef(BusinessPlan, req.body.planId, businessId)
      if (!plan.ok) return fail(res, 400, 'Unknown workout plan')
      update.planId = plan.value
    }
    if ('mealPlanId' in (req.body ?? {})) {
      const meal = await ownedRef(BusinessMealPlan, req.body.mealPlanId, businessId)
      if (!meal.ok) return fail(res, 400, 'Unknown meal plan')
      update.mealPlanId = meal.value
    }
    const member = await BusinessMember.findOneAndUpdate({ _id: id, businessId }, { $set: update })
    return member ? res.json({ success: true }) : fail(res, 404, 'Member not found')
  } catch (error) {
    return serverError(res, 'business.members.update', error)
  }
}

export const deleteMember = async (req: BusinessRequest, res: Response) => {
  try {
    const id = objectId(req.params.id)
    if (!id) return fail(res, 400, 'Invalid member id')
    const removed = await BusinessMember.findOneAndDelete({ _id: id, businessId: req.business!._id })
    return removed ? res.json({ success: true }) : fail(res, 404, 'Member not found')
  } catch (error) {
    return serverError(res, 'business.members.delete', error)
  }
}

// ── plans, meal plans, foods ─────────────────────────────────────────────────────
const planView = (p: InstanceType<typeof BusinessPlan>) => ({ id: p.id, name: p.name, goal: p.goal, level: p.level, weeks: p.weeks, daysPerWeek: p.daysPerWeek, notes: p.notes })
const mealPlanView = (p: InstanceType<typeof BusinessMealPlan>) => ({ id: p.id, name: p.name, calories: p.calories, protein: p.protein, carbs: p.carbs, fat: p.fat, mealsPerDay: p.mealsPerDay, notes: p.notes })
const foodView = (f: InstanceType<typeof BusinessFood>) => ({ id: f.id, name: f.name, serving: f.serving, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat })

export const listPlans = async (req: BusinessRequest, res: Response) => {
  try {
    const plans = await BusinessPlan.find({ businessId: req.business!._id }).sort({ createdAt: -1 })
    return res.json({ success: true, data: plans.map(planView) })
  } catch (error) { return serverError(res, 'business.plans.list', error) }
}

export const createPlan = async (req: BusinessRequest, res: Response) => {
  try {
    const businessId = req.business!._id
    const name = text(req.body?.name, 120)
    const level = text(req.body?.level, 20)
    const weeks = num(req.body?.weeks, 1, 52)
    const daysPerWeek = num(req.body?.daysPerWeek, 1, 7)
    if (name.length < 2) return fail(res, 400, 'Give the plan a name')
    if (level !== 'Beginner' && level !== 'Intermediate' && level !== 'Advanced') return fail(res, 400, 'Choose a level')
    if (weeks === null || daysPerWeek === null) return fail(res, 400, 'Use 1–52 weeks and 1–7 days per week')
    if ((await BusinessPlan.countDocuments({ businessId })) >= LIMITS.plans) return fail(res, 400, 'Plan limit reached')
    const plan = await BusinessPlan.create({ businessId, name, level, weeks, daysPerWeek, goal: text(req.body?.goal, 60), notes: text(req.body?.notes, 500) })
    return res.status(201).json({ success: true, data: planView(plan) })
  } catch (error) { return serverError(res, 'business.plans.create', error) }
}

export const deletePlan = async (req: BusinessRequest, res: Response) => {
  try {
    const businessId = req.business!._id
    const id = objectId(req.params.id)
    if (!id) return fail(res, 400, 'Invalid plan id')
    const removed = await BusinessPlan.findOneAndDelete({ _id: id, businessId })
    if (!removed) return fail(res, 404, 'Plan not found')
    await BusinessMember.updateMany({ businessId, planId: id }, { $set: { planId: null } })
    return res.json({ success: true })
  } catch (error) { return serverError(res, 'business.plans.delete', error) }
}

export const listMealPlans = async (req: BusinessRequest, res: Response) => {
  try {
    const plans = await BusinessMealPlan.find({ businessId: req.business!._id }).sort({ createdAt: -1 })
    return res.json({ success: true, data: plans.map(mealPlanView) })
  } catch (error) { return serverError(res, 'business.mealplans.list', error) }
}

export const createMealPlan = async (req: BusinessRequest, res: Response) => {
  try {
    const businessId = req.business!._id
    const name = text(req.body?.name, 120)
    const calories = num(req.body?.calories, 800, 6000)
    const protein = num(req.body?.protein, 0, 1000)
    const carbs = num(req.body?.carbs, 0, 1500)
    const fat = num(req.body?.fat, 0, 600)
    const mealsPerDay = num(req.body?.mealsPerDay, 1, 8)
    if (name.length < 2) return fail(res, 400, 'Give the meal plan a name')
    if (calories === null || protein === null || carbs === null || fat === null || mealsPerDay === null) {
      return fail(res, 400, 'Check the calorie and macro values')
    }
    if ((await BusinessMealPlan.countDocuments({ businessId })) >= LIMITS.mealPlans) return fail(res, 400, 'Meal plan limit reached')
    const plan = await BusinessMealPlan.create({ businessId, name, calories, protein, carbs, fat, mealsPerDay, notes: text(req.body?.notes, 500) })
    return res.status(201).json({ success: true, data: mealPlanView(plan) })
  } catch (error) { return serverError(res, 'business.mealplans.create', error) }
}

export const deleteMealPlan = async (req: BusinessRequest, res: Response) => {
  try {
    const businessId = req.business!._id
    const id = objectId(req.params.id)
    if (!id) return fail(res, 400, 'Invalid meal plan id')
    const removed = await BusinessMealPlan.findOneAndDelete({ _id: id, businessId })
    if (!removed) return fail(res, 404, 'Meal plan not found')
    await BusinessMember.updateMany({ businessId, mealPlanId: id }, { $set: { mealPlanId: null } })
    return res.json({ success: true })
  } catch (error) { return serverError(res, 'business.mealplans.delete', error) }
}

export const listFoods = async (req: BusinessRequest, res: Response) => {
  try {
    const foods = await BusinessFood.find({ businessId: req.business!._id }).sort({ createdAt: -1 })
    return res.json({ success: true, data: foods.map(foodView) })
  } catch (error) { return serverError(res, 'business.foods.list', error) }
}

export const createFood = async (req: BusinessRequest, res: Response) => {
  try {
    const businessId = req.business!._id
    const name = text(req.body?.name, 120)
    const calories = num(req.body?.calories, 0, 5000)
    const protein = num(req.body?.protein, 0, 500)
    const carbs = num(req.body?.carbs, 0, 500)
    const fat = num(req.body?.fat, 0, 500)
    if (name.length < 2) return fail(res, 400, 'Give the food a name')
    if (calories === null || protein === null || carbs === null || fat === null) return fail(res, 400, 'Check the nutrition values')
    if ((await BusinessFood.countDocuments({ businessId })) >= LIMITS.foods) return fail(res, 400, 'Food library limit reached')
    const food = await BusinessFood.create({ businessId, name, calories, protein, carbs, fat, serving: text(req.body?.serving, 40) || '100 g' })
    return res.status(201).json({ success: true, data: foodView(food) })
  } catch (error) { return serverError(res, 'business.foods.create', error) }
}

export const deleteFood = async (req: BusinessRequest, res: Response) => {
  try {
    const id = objectId(req.params.id)
    if (!id) return fail(res, 400, 'Invalid food id')
    const removed = await BusinessFood.findOneAndDelete({ _id: id, businessId: req.business!._id })
    return removed ? res.json({ success: true }) : fail(res, 404, 'Food not found')
  } catch (error) { return serverError(res, 'business.foods.delete', error) }
}

// ── team (owner only) ─────────────────────────────────────────────────────────────
export const listStaff = async (req: BusinessRequest, res: Response) => {
  try {
    const staff = await BusinessStaff.find({ businessId: req.business!._id }).sort({ createdAt: 1 })
    return res.json({ success: true, data: staff.map((s) => ({ id: s.id, name: s.name, email: s.email, role: s.role })) })
  } catch (error) { return serverError(res, 'business.staff.list', error) }
}

export const createStaff = async (req: BusinessRequest, res: Response) => {
  try {
    const businessId = req.business!._id
    const name = text(req.body?.name, 80)
    const staffEmail = email(req.body?.email)
    const role = STAFF_ROLES.find((r) => r === text(req.body?.role, 20))
    if (name.length < 2) return fail(res, 400, 'Please enter a name')
    if (!isEmail(staffEmail)) return fail(res, 400, 'Please enter a valid email address')
    if (!role) return fail(res, 400, 'Choose a role')
    if (staffEmail === req.business!.ownerEmail) return fail(res, 400, 'That is the account owner')
    // One person works for one business, so access always resolves unambiguously.
    if (await BusinessStaff.exists({ email: { $eq: staffEmail } })) return fail(res, 409, 'That person is already on a team')
    if ((await BusinessStaff.countDocuments({ businessId })) >= LIMITS.staff) return fail(res, 400, 'Team limit reached')
    const staff = await BusinessStaff.create({ businessId, name, email: staffEmail, role })
    return res.status(201).json({ success: true, data: { id: staff.id, name, email: staffEmail, role } })
  } catch (error) {
    if (isDup(error)) return fail(res, 409, 'That person is already on a team')
    return serverError(res, 'business.staff.create', error)
  }
}

export const deleteStaff = async (req: BusinessRequest, res: Response) => {
  try {
    const id = objectId(req.params.id)
    if (!id) return fail(res, 400, 'Invalid id')
    const removed = await BusinessStaff.findOneAndDelete({ _id: id, businessId: req.business!._id })
    return removed ? res.json({ success: true }) : fail(res, 404, 'Team member not found')
  } catch (error) { return serverError(res, 'business.staff.delete', error) }
}

// ── review (admins listed in ADMIN_EMAILS) ──────────────────────────────────────────
export const adminList = async (req: AuthRequest, res: Response) => {
  if (!isDBConnected()) return unavailable(res)
  try {
    const status = (['pending', 'approved', 'rejected'] as const).find((st) => st === req.query.status) ?? 'pending'
    const rows = await Business.find({ status }).sort({ createdAt: 1 }).limit(200)
    return res.json({
      success: true,
      data: rows.map((b) => ({ id: b.id, name: b.name, type: b.type, city: b.city, size: b.size, message: b.message, ownerEmail: b.ownerEmail, contactEmail: b.contactEmail, status: b.status, createdAt: b.createdAt })),
    })
  } catch (error) { return serverError(res, 'business.admin.list', error) }
}

// Moves an application between states, but only from the states allowed for that action,
// so a decision can't be applied twice or to the wrong kind of record.
const review = (from: 'pending' | 'approved', to: 'approved' | 'rejected', notice: 'approved' | 'rejected' | 'revoked') =>
  async (req: AuthRequest, res: Response) => {
    if (!isDBConnected()) return unavailable(res)
    try {
      const id = objectId(req.params.id)
      if (!id) return fail(res, 400, 'Invalid id')
      const update: Record<string, unknown> = { status: to, reviewedAt: new Date(), reviewedBy: req.user!.email }
      if (to === 'rejected') update.rejectionReason = text(req.body?.reason, 500)
      const updated = await Business.findOneAndUpdate({ _id: id, status: from }, { $set: update }, { new: true })
      if (!updated) return fail(res, 404, `No ${from} application with that id`)
      notifyApplicant(updated.ownerEmail, updated.name, notice, updated.rejectionReason)
      return res.json({ success: true })
    } catch (error) { return serverError(res, 'business.admin.review', error) }
  }

export const adminApprove = review('pending', 'approved', 'approved')
export const adminReject = review('pending', 'rejected', 'rejected')
export const adminRevoke = review('approved', 'rejected', 'revoked')

// Lets the website show a "Review applications" link, with a count, to reviewers only.
export const adminStatus = async (req: AuthRequest, res: Response) => {
  if (!isAdminUser(req.user)) return res.json({ success: true, data: { isAdmin: false } })
  if (!isDBConnected()) return unavailable(res)
  try {
    return res.json({ success: true, data: { isAdmin: true, pending: await Business.countDocuments({ status: 'pending' }) } })
  } catch (error) { return serverError(res, 'business.admin.status', error) }
}
