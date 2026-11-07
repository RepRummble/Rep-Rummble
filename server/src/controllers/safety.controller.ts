import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { isAdminUser } from '../middleware/business.middleware'
import { Block } from '../models/Block.model'
import { Friendship } from '../models/Friendship.model'
import { REPORT_REASONS, REPORT_TARGETS, Report } from '../models/Report.model'
import { SocialPost } from '../models/SocialPost.model'
import { Story } from '../models/Story.model'
import { DirectMessage } from '../models/DirectMessage.model'
import { User } from '../models/User.model'
import { cleanText, isId } from '../services/social.service'
import { sendMail } from '../services/mail.service'

const HIDE_AFTER = 3 // distinct reporters

/** Finds what is being reported: who wrote it, and what it said (copied now, in case it is deleted later). */
async function resolveTarget(type: string, id: string, reporterId: string): Promise<{ user?: string; snippet?: string } | null> {
  if (type === 'user') { const u = await User.findById(id).select('_id'); return u ? { user: String(u._id) } : null }
  if (type === 'post') { const p = await SocialPost.findById(id).select('author content'); return p ? { user: String(p.author), snippet: p.content } : null }
  if (type === 'story') { const s = await Story.findById(id).select('author text'); return s ? { user: String(s.author), snippet: s.text } : null }
  if (type === 'message') {
    const m = await DirectMessage.findOne({ _id: id, to: reporterId }).select('from text') // only messages you received
    return m ? { user: String(m.from), snippet: m.text } : null
  }
  if (type === 'comment') {
    const [postId, commentId] = id.split(':')
    if (!isId(postId) || !isId(commentId)) return null
    const p = await SocialPost.findById(postId).select('comments')
    const c = p?.comments?.find((x: any) => String((x as any)._id) === commentId) as any
    return c ? { user: String(c.author), snippet: c.content } : null
  }
  return null
}

// @route POST /api/safety/report   { targetType, targetId, reason, details? }
export const report = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id
  const { targetType, targetId, reason } = req.body || {}
  if (!(REPORT_TARGETS as readonly string[]).includes(targetType) || typeof targetId !== 'string' || !targetId || targetId.length > 80) return res.status(400).json({ success: false, message: 'Say what you are reporting.' })
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) return res.status(400).json({ success: false, message: 'Choose a reason.' })
  if (targetType !== 'comment' && !isId(targetId)) return res.status(400).json({ success: false, message: 'Say what you are reporting.' })
  try {
    const target = await resolveTarget(targetType, targetId, me)
    if (!target) return res.status(404).json({ success: false, message: 'That is no longer available.' })
    if (target.user === me) return res.status(400).json({ success: false, message: 'You cannot report yourself.' })
    try {
      await Report.create({ reporter: me, targetType, targetId, targetUser: target.user, reason, details: cleanText(req.body.details, 500) || undefined, snippet: target.snippet?.slice(0, 300) })
    } catch (e) {
      if ((e as { code?: number }).code === 11000) return res.json({ success: true, alreadyReported: true })
      throw e
    }
    if (targetType === 'post' || targetType === 'story') {
      const n = (await Report.distinct('reporter', { targetType, targetId })).length
      if (n >= HIDE_AFTER) {
        if (targetType === 'post') await SocialPost.updateOne({ _id: targetId }, { $set: { hidden: true } })
        else await Story.updateOne({ _id: targetId }, { $set: { hidden: true } })
      }
    }
    // Tell the team, best effort: the report is already saved whether or not the email goes out.
    sendMail(process.env.SUPPORT_EMAIL || 'support@reprummble.com', `Community report: ${targetType} (${reason})`, `Reason: ${reason}\nType: ${targetType}\nId: ${targetId}\nSaid: ${target.snippet ?? ''}\nDetails: ${req.body.details ?? ''}`).catch(() => {})
    return res.json({ success: true })
  } catch (error) {
    console.error('report failed:', error)
    return res.status(500).json({ success: false, message: 'Could not send your report. Please try again.' })
  }
}

// @route POST /api/safety/block/:userId
export const block = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id
  const { userId } = req.params
  if (!isId(userId) || userId === me) return res.status(400).json({ success: false, message: 'Choose someone else to block.' })
  if (!(await User.exists({ _id: userId }))) return res.status(404).json({ success: false, message: 'Person not found.' })
  await Block.updateOne({ blocker: me, blocked: userId }, { $setOnInsert: { blocker: me, blocked: userId, createdAt: new Date() } }, { upsert: true })
  // Blocking also ends any friendship or pending request between the two.
  await Friendship.deleteMany({ $or: [{ requester: me, recipient: userId }, { requester: userId, recipient: me }] })
  return res.json({ success: true })
}

// @route DELETE /api/safety/block/:userId
export const unblock = async (req: AuthRequest, res: Response) => {
  if (!isId(req.params.userId)) return res.status(400).json({ success: false, message: 'Not a valid person.' })
  await Block.deleteOne({ blocker: req.user!.id, blocked: req.params.userId })
  return res.json({ success: true })
}

// @route GET /api/safety/blocks
export const listBlocks = async (req: AuthRequest, res: Response) => {
  const rows = await Block.find({ blocker: req.user!.id }).select('blocked').lean()
  const users = await User.find({ _id: { $in: rows.map((r) => r.blocked) } }).select('displayName').lean()
  return res.json({ success: true, data: users.map((u) => ({ _id: String(u._id), displayName: u.displayName || 'Member' })) })
}

// @route GET /api/safety/reports?status=open        (reviewers listed in ADMIN_EMAILS)
export const listReports = async (req: AuthRequest, res: Response) => {
  if (!isAdminUser(req.user)) return res.status(403).json({ success: false, message: 'Reviewers only.' })
  const status = ['open', 'reviewed', 'actioned'].includes(String(req.query.status)) ? String(req.query.status) : 'open'
  const rows = await Report.find({ status } as any).sort({ createdAt: -1 }).limit(100).populate('reporter targetUser', 'displayName').lean()
  return res.json({ success: true, data: rows })
}

// @route PATCH /api/safety/reports/:id   { status }
export const updateReport = async (req: AuthRequest, res: Response) => {
  if (!isAdminUser(req.user)) return res.status(403).json({ success: false, message: 'Reviewers only.' })
  if (!isId(req.params.id) || !['reviewed', 'actioned', 'open'].includes(req.body?.status)) return res.status(400).json({ success: false, message: 'Not a valid update.' })
  await Report.updateOne({ _id: req.params.id }, { $set: { status: req.body.status } })
  return res.json({ success: true })
}
