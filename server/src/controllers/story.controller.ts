import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { Story } from '../models/Story.model'
import { User } from '../models/User.model'
import { cleanText, friendIdsOf, blockedWith, isId, areFriends } from '../services/social.service'
import { clampTz, computeStreak } from '../services/progress.service'
import { mealSnapshot, workoutSnapshot } from '../services/share.service'

const DAY = 24 * 3600_000
const MAX_ACTIVE = 10

// @route POST /api/stories   { kind, text?, theme?, workoutId?, mealId?, tz? }
export const createStory = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id, sid = req.user!.supabaseId
  const kind = req.body?.kind ?? 'text'
  if (!['text', 'workout', 'meal', 'streak'].includes(kind)) return res.status(400).json({ success: false, message: 'Choose a type of status.' })
  const text = cleanText(req.body?.text, 200)
  const theme = Math.min(5, Math.max(0, Math.round(Number(req.body?.theme) || 0)))
  try {
    if ((await Story.countDocuments({ author: me, expiresAt: { $gt: new Date() } })) >= MAX_ACTIVE) return res.status(429).json({ success: false, message: 'You have 10 statuses up already. They disappear after 24 hours, or delete one.' })
    let snapshot: Record<string, unknown> | undefined
    if (kind === 'text' && !text) return res.status(400).json({ success: false, message: 'Write something first.' })
    if (kind === 'workout') {
      if (!isId(req.body?.workoutId) || !sid) return res.status(400).json({ success: false, message: 'Pick a workout to share.' })
      snapshot = (await workoutSnapshot(req.body.workoutId, sid)) as any
      if (!snapshot) return res.status(404).json({ success: false, message: 'That workout was not found in your log.' })
    }
    if (kind === 'meal') {
      if (!isId(req.body?.mealId) || !sid) return res.status(400).json({ success: false, message: 'Pick a meal to share.' })
      snapshot = (await mealSnapshot(req.body.mealId, sid)) as any
      if (!snapshot) return res.status(404).json({ success: false, message: 'That meal was not found in your log.' })
    }
    if (kind === 'streak') {
      const streak = sid ? await computeStreak(sid, clampTz(req.body?.tz)) : 0
      if (streak < 1) return res.status(400).json({ success: false, message: 'You have no streak yet. Log a workout to start one.' })
      snapshot = { streak }
    }
    const story = await Story.create({ author: me, kind, text, theme, snapshot, expiresAt: new Date(Date.now() + DAY) })
    return res.status(201).json({ success: true, data: story })
  } catch (error) {
    console.error('createStory failed:', error)
    return res.status(500).json({ success: false, message: 'Could not post your status.' })
  }
}

// @route GET /api/stories   Your statuses and your friends', grouped by person. Unseen people first.
export const getStories = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id
  try {
    const [friends, blocked] = await Promise.all([friendIdsOf(me), blockedWith(me)])
    const authors = [me, ...friends.filter((f) => !blocked.has(f))]
    const stories = await Story.find({ author: { $in: authors }, expiresAt: { $gt: new Date() }, hidden: { $ne: true } }).sort({ createdAt: 1 }).lean()
    const names = new Map((await User.find({ _id: { $in: authors } }).select('displayName').lean()).map((u) => [String(u._id), u.displayName || 'Member']))
    const groups = new Map<string, any>()
    for (const s of stories) {
      const a = String(s.author)
      const g = groups.get(a) ?? { author: { _id: a, displayName: names.get(a) ?? 'Member' }, isMe: a === me, stories: [] as any[] }
      const viewed = a === me || (s.viewers ?? []).some((v) => String(v) === me)
      g.stories.push({ _id: String(s._id), kind: s.kind, text: s.text, theme: s.theme, snapshot: s.snapshot ?? null, createdAt: s.createdAt, expiresAt: s.expiresAt, viewed, viewCount: a === me ? (s.viewers ?? []).length : undefined })
      groups.set(a, g)
    }
    const list = [...groups.values()].map((g) => ({ ...g, seen: g.stories.every((x: any) => x.viewed) }))
    list.sort((a, b) => (a.isMe ? -1 : b.isMe ? 1 : Number(a.seen) - Number(b.seen)))
    return res.json({ success: true, data: list })
  } catch (error) {
    console.error('getStories failed:', error)
    return res.status(500).json({ success: false, message: 'Could not load statuses.' })
  }
}

// @route POST /api/stories/:id/view
export const viewStory = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id
  if (!isId(req.params.id)) return res.status(400).json({ success: false })
  const s = await Story.findById(req.params.id).select('author expiresAt hidden')
  if (!s || s.expiresAt < new Date() || s.hidden) return res.status(404).json({ success: false, message: 'That status is gone.' })
  const author = String(s.author)
  if (author !== me) {
    if (!(await areFriends(me, author)) || (await blockedWith(me)).has(author)) return res.status(403).json({ success: false, message: 'You cannot see this.' })
    await Story.updateOne({ _id: s._id }, { $addToSet: { viewers: me } })
  }
  return res.json({ success: true })
}

// @route GET /api/stories/:id/viewers  (the author only)
export const storyViewers = async (req: AuthRequest, res: Response) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false })
  const s = await Story.findOne({ _id: req.params.id, author: req.user!.id }).select('viewers')
  if (!s) return res.status(404).json({ success: false, message: 'Not found.' })
  const users = await User.find({ _id: { $in: s.viewers } }).select('displayName').lean()
  return res.json({ success: true, data: users.map((u) => ({ _id: String(u._id), displayName: u.displayName || 'Member' })) })
}

// @route DELETE /api/stories/:id
export const deleteStory = async (req: AuthRequest, res: Response) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false })
  const r = await Story.deleteOne({ _id: req.params.id, author: req.user!.id })
  return r.deletedCount ? res.json({ success: true }) : res.status(404).json({ success: false, message: 'Not found.' })
}
