import crypto from 'crypto'
import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { isDBConnected } from '../config/database'
import { getUserById } from '../services/supabase.service'
import { Referral, ReferralCredit, ReferralProfile } from '../models/Referral.model'
import {
  REFERRAL_CLAIM_WINDOW_DAYS,
  REFERRAL_DISCOUNT_PERCENT,
  REFERRAL_MAX_DISCOUNT_PERCENT,
} from '../config/referral'

// No 0/O/1/I so codes are easy to read aloud.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const makeCode = () => Array.from({ length: 8 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('')

const siteUrl = () => (process.env.WEB_URL || process.env.CLIENT_URL || 'https://www.reprummble.com').replace(/\/$/, '')

/** Total unused discount a user can apply at their next checkout (capped). */
export async function getAvailableDiscountPercent(userId: string): Promise<number> {
  const credits = await ReferralCredit.find({ userId, usedAt: { $exists: false } }).select('percent')
  return Math.min(REFERRAL_MAX_DISCOUNT_PERCENT, credits.reduce((sum, c) => sum + c.percent, 0))
}

async function getOrCreateProfile(userId: string) {
  const existing = await ReferralProfile.findOne({ userId })
  if (existing) return existing
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await ReferralProfile.create({ userId, code: makeCode() })
    } catch (err) {
      // Code collision or a parallel request created the profile: retry / reuse.
      const again = await ReferralProfile.findOne({ userId })
      if (again) return again
      if (attempt === 4) throw err
    }
  }
  throw new Error('Could not create referral code')
}

// @route GET /api/referrals/me
export const getMyReferral = async (req: AuthRequest, res: Response) => {
  if (!isDBConnected()) return res.status(503).json({ success: false, message: 'Service temporarily unavailable' })
  try {
    const userId = req.user!.id
    const profile = await getOrCreateProfile(userId)
    const [referrals, availablePercent] = await Promise.all([
      Referral.find({ referrerId: userId }).sort({ createdAt: -1 }).limit(50),
      getAvailableDiscountPercent(userId),
    ])
    return res.json({
      success: true,
      data: {
        code: profile.code,
        link: `${siteUrl()}/invite/${profile.code}`,
        invited: referrals.length,
        rewarded: referrals.filter((r) => r.referrerRewarded).length,
        rewardPercent: REFERRAL_DISCOUNT_PERCENT,
        maxPercent: REFERRAL_MAX_DISCOUNT_PERCENT,
        availablePercent,
        history: referrals.map((r) => ({ at: r.createdAt, rewarded: r.referrerRewarded })),
      },
    })
  } catch (error) {
    console.error('getMyReferral error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// @route POST /api/referrals/claim   body: { code }
// Called once by a brand-new account that arrived through an invite link.
export const claimReferral = async (req: AuthRequest, res: Response) => {
  if (!isDBConnected()) return res.status(503).json({ success: false, message: 'Service temporarily unavailable' })
  try {
    const userId = req.user!.id
    const code = String(req.body?.code ?? '').trim().toUpperCase()
    if (!/^[A-Z0-9]{6,12}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Invalid referral code' })
    }

    const profile = await ReferralProfile.findOne({ code })
    if (!profile) return res.status(404).json({ success: false, message: 'Invalid referral code' })
    if (profile.userId === userId) {
      return res.status(400).json({ success: false, message: 'You cannot use your own referral code' })
    }
    if (await Referral.exists({ referredId: userId })) {
      return res.status(409).json({ success: false, message: 'A referral code was already applied to this account' })
    }

    // Only new accounts qualify, otherwise existing users could farm rewards.
    if (!req.user!.isBypass) {
      const account = await getUserById(userId)
      if (!account.success || !account.user?.created_at) {
        return res.status(503).json({ success: false, message: 'Could not verify your account. Please try again.' })
      }
      const ageDays = (Date.now() - new Date(account.user.created_at).getTime()) / 86_400_000
      if (ageDays > REFERRAL_CLAIM_WINDOW_DAYS) {
        return res.status(400).json({ success: false, message: 'Referral codes can only be used on new accounts' })
      }
    }

    const referrerAvailable = await getAvailableDiscountPercent(profile.userId)
    const referrerRewarded = referrerAvailable < REFERRAL_MAX_DISCOUNT_PERCENT

    try {
      await Referral.create({ referrerId: profile.userId, referredId: userId, code, referrerRewarded })
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        return res.status(409).json({ success: false, message: 'A referral code was already applied to this account' })
      }
      throw err
    }

    await ReferralCredit.create({ userId, percent: REFERRAL_DISCOUNT_PERCENT, reason: 'referred' })
    if (referrerRewarded) {
      await ReferralCredit.create({ userId: profile.userId, percent: REFERRAL_DISCOUNT_PERCENT, reason: 'referral' })
    }

    return res.status(201).json({
      success: true,
      data: { discountPercent: await getAvailableDiscountPercent(userId) },
    })
  } catch (error) {
    console.error('claimReferral error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}
