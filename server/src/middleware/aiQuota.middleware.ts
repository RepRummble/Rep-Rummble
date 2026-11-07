import { NextFunction, Response } from 'express'
import { AiUsage } from '../models/AiUsage.model'
import { AuthRequest } from './auth.middleware'
import { getBillingView } from '../services/billing.service'

export type AiKind = 'scan' | 'quicklog' | 'search'

/** Daily allowance per plan. Free is small; paid is generous but still capped, so one account cannot run up the AI bill. */
export const AI_DAILY_LIMITS: Record<'free' | 'paid', Record<AiKind, number>> = {
  free: { scan: 3, quicklog: 10, search: 40 },
  paid: { scan: 100, quicklog: 200, search: 400 },
}

const LABEL: Record<AiKind, string> = { scan: 'photo scans', quicklog: 'quick logs', search: 'food searches' }

export const utcDay = (d: Date = new Date()) => d.toISOString().slice(0, 10)

/**
 * Counts one AI call against the person's daily allowance, before the expensive call is made.
 * The count is taken atomically, so a burst of parallel requests cannot slip past the limit.
 * If the request then fails for any reason (a bad photo, or a failure on our side), the use is given back: only a finished AI answer counts.
 */
export const aiQuota = (kind: AiKind) => async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.user?.id
  if (!userId) { res.status(401).json({ success: false, message: 'Not authenticated' }); return }
  try {
    let paid = false
    try {
      const view = await getBillingView(userId)
      paid = view.effectivePlan !== 'free'
    } catch { /* if the plan cannot be read, treat the person as Free: the safe side for cost */ }
    const limit = AI_DAILY_LIMITS[paid ? 'paid' : 'free'][kind]
    const day = utcDay()
    const doc = await AiUsage.findOneAndUpdate(
      { userId, day },
      { $inc: { [`counts.${kind}`]: 1 }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: 'after' }
    )
    const used = (doc?.counts?.[kind] as number | undefined) ?? 1
    if (used > limit) {
      await AiUsage.updateOne({ userId, day }, { $inc: { [`counts.${kind}`]: -1 } })
      res.status(429).json({
        success: false,
        code: 'quota_exceeded',
        limit,
        message: paid
          ? `You have reached today's limit of ${limit} ${LABEL[kind]}. It resets at midnight UTC.`
          : `You have used today's ${limit} free ${LABEL[kind]}. Upgrade on reprummble.com for more, or come back tomorrow.`,
      })
      return
    }
    res.on('finish', () => {
      if (res.statusCode >= 400) AiUsage.updateOne({ userId, day }, { $inc: { [`counts.${kind}`]: -1 } }).catch(() => {})
    })
    next()
  } catch (error) {
    console.error('aiQuota failed:', error instanceof Error ? error.message : error)
    res.status(503).json({ success: false, message: 'Could not check your allowance. Please try again.' })
  }
}
