import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { Friendship } from '../models/Friendship.model'
import { User } from '../models/User.model'
import { blockedWith, cleanText, friendIdsOf, streaksFor } from '../services/social.service'
import { clampTz } from '../services/progress.service'

const escapeRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// @route GET /api/people/search?q=<name>   Find people by display name. Emails are never shown.
export const search = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id
  const q = cleanText(req.query.q, 30)
  if (q.length < 2) return res.json({ success: true, data: [] })
  try {
    const blocked = [...(await blockedWith(me))]
    const people = await User.find({ displayName: { $regex: escapeRegex(q), $options: 'i' }, _id: { $nin: [me, ...blocked] } }).select('displayName').limit(20).lean()
    const ids = people.map((p) => String(p._id))
    const rels = await Friendship.find({ $or: [{ requester: me, recipient: { $in: ids } }, { requester: { $in: ids }, recipient: me }] }).lean()
    const relOf = (id: string) => {
      const r = rels.find((x) => (x.requester === me && x.recipient === id) || (x.requester === id && x.recipient === me))
      if (!r || r.status === 'declined') return 'none'
      if (r.status === 'accepted') return 'friends'
      return r.requester === me ? 'pending_sent' : 'pending_received'
    }
    return res.json({ success: true, data: people.map((p) => ({ _id: String(p._id), displayName: p.displayName, relation: relOf(String(p._id)) })) })
  } catch (error) {
    console.error('people search failed:', error)
    return res.status(500).json({ success: false, message: 'Search failed.' })
  }
}

// @route GET /api/people/streaks?tz=<minutes>   You and your friends, longest workout streak first.
export const streakBoard = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id
  try {
    const [friends, blocked] = await Promise.all([friendIdsOf(me), blockedWith(me)])
    const ids = [me, ...friends.filter((f) => !blocked.has(f))]
    const [streaks, users] = await Promise.all([streaksFor(ids, clampTz(req.query.tz)), User.find({ _id: { $in: ids } }).select('displayName').lean()])
    const rows = users.map((u) => ({ _id: String(u._id), displayName: u.displayName || 'Member', streak: streaks.get(String(u._id)) ?? 0, isMe: String(u._id) === me }))
    rows.sort((a, b) => b.streak - a.streak || a.displayName.localeCompare(b.displayName))
    return res.json({ success: true, data: rows })
  } catch (error) {
    console.error('streak board failed:', error)
    return res.status(500).json({ success: false, message: 'Could not load streaks.' })
  }
}
