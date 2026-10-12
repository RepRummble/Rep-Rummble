import { ReferralCredit } from '../models/Referral.model'
import { REFERRAL_MAX_DISCOUNT_PERCENT } from '../config/referral'

/** Total unused discount a person can apply (capped). */
export async function getAvailableDiscountPercent(userId: string): Promise<number> {
  const credits = await ReferralCredit.find({ userId: { $eq: userId }, usedAt: { $exists: false } }).select('percent')
  return Math.min(REFERRAL_MAX_DISCOUNT_PERCENT, credits.reduce((sum, c) => sum + c.percent, 0))
}

/** Marks every unused credit as spent, once the discount has been applied to a payment. */
export async function markDiscountUsed(userId: string): Promise<void> {
  await ReferralCredit.updateMany({ userId: { $eq: userId }, usedAt: { $exists: false } }, { $set: { usedAt: new Date() } })
}
