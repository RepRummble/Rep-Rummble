import { Response } from 'express'
import mongoose from 'mongoose'
import { AuthRequest } from '../middleware/auth.middleware'
import { DirectMessage } from '../models/DirectMessage.model'
import { User } from '../models/User.model'
import { areFriends, blockedWith, cleanText, isId } from '../services/social.service'

const oid = (s: string) => new mongoose.Types.ObjectId(s)

/** Two people may message only if they are friends and neither has blocked the other. */
async function canMessage(me: string, other: string): Promise<string | null> {
  if (!isId(other) || other === me) return 'Choose a friend to message.'
  if ((await blockedWith(me)).has(other)) return 'You cannot message this person.'
  if (!(await areFriends(me, other))) return 'You can only message your friends.'
  return null
}

// @route GET /api/messages   Your conversations, newest first, with what is unread.
export const inbox = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id
  try {
    const mine = oid(me)
    const rows = await DirectMessage.aggregate([
      { $match: { $or: [{ from: mine }, { to: mine }] } },
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: { $cond: [{ $eq: ['$from', mine] }, '$to', '$from'] },
        last: { $first: '$$ROOT' },
        unread: { $sum: { $cond: [{ $and: [{ $eq: ['$to', mine] }, { $not: ['$readAt'] }] }, 1, 0] } },
      } },
      { $sort: { 'last.createdAt': -1 } },
      { $limit: 60 },
    ])
    const blocked = await blockedWith(me)
    const kept = rows.filter((r) => !blocked.has(String(r._id)))
    const names = new Map((await User.find({ _id: { $in: kept.map((r) => r._id) } }).select('displayName').lean()).map((u) => [String(u._id), u.displayName || 'Member']))
    return res.json({ success: true, data: kept.map((r) => ({ userId: String(r._id), displayName: names.get(String(r._id)) ?? 'Member', lastText: r.last.text, lastAt: r.last.createdAt, lastFromMe: String(r.last.from) === me, unread: r.unread })) })
  } catch (error) {
    console.error('inbox failed:', error)
    return res.status(500).json({ success: false, message: 'Could not load your messages.' })
  }
}

// @route GET /api/messages/unread   Messages waiting for you, for the badge.
export const unreadCount = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id
  const blocked = [...(await blockedWith(me))].map(oid)
  const count = await DirectMessage.countDocuments({ to: me, readAt: { $exists: false }, ...(blocked.length ? { from: { $nin: blocked } } : {}) })
  return res.json({ success: true, data: { unread: count } })
}

// @route GET /api/messages/:userId?before=<iso>&limit=30   The conversation, oldest first.
export const thread = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id, other = String(req.params.userId)
  const problem = await canMessage(me, other)
  if (problem) return res.status(403).json({ success: false, message: problem })
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 30))
  const before = req.query.before ? new Date(String(req.query.before)) : null
  const rows = await DirectMessage.find({
    $or: [{ from: me, to: other }, { from: other, to: me }],
    ...(before && !Number.isNaN(before.getTime()) ? { createdAt: { $lt: before } } : {}),
  }).sort({ createdAt: -1 }).limit(limit).lean()
  const person = await User.findById(other).select('displayName').lean()
  return res.json({ success: true, data: { with: { _id: other, displayName: person?.displayName || 'Member' }, messages: rows.reverse().map((m) => ({ _id: String(m._id), mine: String(m.from) === me, text: m.text, createdAt: m.createdAt, readAt: m.readAt ?? null })), hasMore: rows.length === limit } })
}

// @route POST /api/messages/:userId   { text }
export const send = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id, other = String(req.params.userId)
  const problem = await canMessage(me, other)
  if (problem) return res.status(403).json({ success: false, message: problem })
  const text = cleanText(req.body?.text, 1000)
  if (!text) return res.status(400).json({ success: false, message: 'Write a message first.' })
  const m = await DirectMessage.create({ from: oid(me), to: oid(other), text })
  return res.status(201).json({ success: true, data: { _id: String(m._id), mine: true, text: m.text, createdAt: m.createdAt, readAt: null } })
}

// @route POST /api/messages/:userId/read
export const markRead = async (req: AuthRequest, res: Response) => {
  const other = String(req.params.userId)
  if (!isId(other)) return res.status(400).json({ success: false })
  await DirectMessage.updateMany({ from: other, to: req.user!.id, readAt: { $exists: false } }, { $set: { readAt: new Date() } })
  return res.json({ success: true })
}
