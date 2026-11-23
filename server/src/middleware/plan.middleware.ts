import { NextFunction, Response } from 'express'
import { PLAN_RANK, type PlanId } from '../config/billing'
import { getBillingView } from '../services/billing.service'
import { AuthRequest } from './auth.middleware'

/** The plan a person is really on, including Pro included by a partner gym. If it cannot be read, they are treated as Free. */
export async function planOf(userId: string): Promise<PlanId> {
  try { return (await getBillingView(userId)).effectivePlan } catch { return 'free' }
}

export const upgradeBody = (required: PlanId, what: string) => ({
  success: false, code: 'upgrade_required', requiredPlan: required,
  message: `${what} is part of the ${required === 'premium' ? 'Premium' : 'Pro'} plan. You can upgrade any time from your account.`,
})

/** Lets only people on `min` or higher through. Everyone else gets a clear "upgrade" answer (HTTP 402), never a silent failure. */
export const requirePlan = (min: PlanId, what: string) => async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.user?.id
  if (!userId) { res.status(401).json({ success: false, message: 'Not authenticated' }); return }
  if (PLAN_RANK[await planOf(userId)] >= PLAN_RANK[min]) { next(); return }
  res.status(402).json(upgradeBody(min, what))
}
