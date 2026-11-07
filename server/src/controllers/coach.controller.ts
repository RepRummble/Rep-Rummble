import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { Routine } from '../models/Routine.model'
import { AiUnavailableError, suggestWorkoutsWithGemini } from '../services/gemini.service'
import { cleanExercises, parseProfile } from '../services/coach.service'
import { cleanText, isId } from '../services/social.service'

const MAX_ROUTINES = 20
const MAX_EXERCISES = 30

const shape = (r: any) => ({ _id: String(r._id), name: r.name, focus: r.focus ?? '', exercises: r.exercises, weekdays: r.weekdays, source: r.source, updatedAt: r.updatedAt })
const weekdays = (v: unknown): number[] => (Array.isArray(v) ? [...new Set(v.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort() : [])

// @route POST /api/coach/suggest   { goal, bodyStyle, level, equipment, daysPerWeek, minutes, focus[], notes }
// A weekly plan from the AI. If the AI cannot answer, we say so: there is no made-up fallback plan.
export const suggest = async (req: AuthRequest, res: Response) => {
  const parsed = parseProfile(req.body)
  if (!parsed.ok) return res.status(400).json({ success: false, message: parsed.message })
  try {
    res.json({ success: true, data: { profile: parsed.profile, plan: await suggestWorkoutsWithGemini(parsed.profile) } })
  } catch (error) {
    if (error instanceof AiUnavailableError) return res.status(503).json({ success: false, code: 'ai_unavailable', message: error.message })
    console.error('Coach suggest failed:', error)
    res.status(500).json({ success: false, message: 'Could not build a plan. Please try again.' })
  }
}

// @route GET /api/coach/routines
export const listRoutines = async (req: AuthRequest, res: Response) => {
  const rows = await Routine.find({ userId: req.user!.id }).sort({ createdAt: -1 }).lean()
  res.json({ success: true, data: rows.map(shape) })
}

// @route POST /api/coach/routines   { name, focus?, exercises[], weekdays?, source? }
export const createRoutine = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id
  const name = cleanText(req.body?.name, 60)
  const exercises = cleanExercises(req.body?.exercises, MAX_EXERCISES)
  if (!name) return res.status(400).json({ success: false, message: 'Give the workout a name.' })
  if (!exercises.length) return res.status(400).json({ success: false, message: 'Add at least one exercise.' })
  if (await Routine.countDocuments({ userId }) >= MAX_ROUTINES) return res.status(400).json({ success: false, message: `You can save up to ${MAX_ROUTINES} workouts. Delete one to add another.` })
  const source = ['coach', 'template', 'manual'].includes(req.body?.source) ? req.body.source : 'manual'
  const r = await Routine.create({ userId, name, focus: cleanText(req.body?.focus, 80) || undefined, exercises, weekdays: weekdays(req.body?.weekdays), source })
  res.status(201).json({ success: true, data: shape(r) })
}

async function mine(req: AuthRequest) {
  const id = String(req.params.id)
  return isId(id) ? Routine.findOne({ _id: id, userId: req.user!.id }) : null
}

// @route PUT /api/coach/routines/:id   { name?, weekdays?, exercises? }   Replaces what is sent.
export const updateRoutine = async (req: AuthRequest, res: Response) => {
  const r = await mine(req)
  if (!r) return res.status(404).json({ success: false, message: 'Workout not found.' })
  if (req.body?.name !== undefined) { const n = cleanText(req.body.name, 60); if (!n) return res.status(400).json({ success: false, message: 'Give the workout a name.' }); r.name = n }
  if (req.body?.weekdays !== undefined) r.weekdays = weekdays(req.body.weekdays)
  if (req.body?.exercises !== undefined) {
    const ex = cleanExercises(req.body.exercises, MAX_EXERCISES)
    if (!ex.length) return res.status(400).json({ success: false, message: 'A workout needs at least one exercise. Delete it instead.' })
    r.exercises = ex
  }
  await r.save()
  res.json({ success: true, data: shape(r) })
}

// @route POST /api/coach/routines/:id/exercises   { exercises[] }   Adds to the end, skipping ones already there.
export const addExercises = async (req: AuthRequest, res: Response) => {
  const r = await mine(req)
  if (!r) return res.status(404).json({ success: false, message: 'Workout not found.' })
  const have = new Set(r.exercises.map((e) => e.name.toLowerCase()))
  const fresh = cleanExercises(req.body?.exercises, MAX_EXERCISES).filter((e) => !have.has(e.name.toLowerCase()))
  if (r.exercises.length + fresh.length > MAX_EXERCISES) return res.status(400).json({ success: false, message: `A workout can have up to ${MAX_EXERCISES} exercises.` })
  r.exercises.push(...fresh)
  await r.save()
  res.json({ success: true, data: shape(r), added: fresh.length })
}

// @route DELETE /api/coach/routines/:id
export const deleteRoutine = async (req: AuthRequest, res: Response) => {
  const r = await mine(req)
  if (!r) return res.status(404).json({ success: false, message: 'Workout not found.' })
  await Routine.deleteOne({ _id: r._id })
  res.json({ success: true })
}
