export type PlanId = 'free' | 'pro' | 'premium'

export const PLAN_RANK: Record<PlanId, number> = { free: 0, pro: 1, premium: 2 }

// Keep in step with web/src/config/pricing.ts. The prices that actually get charged are the ones
// set on the Stripe Prices below, so change them there too.
export const PLANS: { id: PlanId; name: string; priceCents: number }[] = [
  { id: 'free', name: 'Free', priceCents: 0 },
  { id: 'pro', name: 'Pro', priceCents: 999 },
  { id: 'premium', name: 'Premium', priceCents: 1499 },
]

/** Pro starts with a free trial the first time someone takes it. */
export const TRIAL_DAYS = 14

export const isPlanId = (v: unknown): v is PlanId => v === 'free' || v === 'pro' || v === 'premium'

const env = () => ({
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  prices: { pro: process.env.STRIPE_PRICE_PRO || '', premium: process.env.STRIPE_PRICE_PREMIUM || '' },
})

/** Stripe price id for a paid plan, or null when it is not set up. */
export const priceIdFor = (plan: PlanId): string | null => (plan === 'free' ? null : env().prices[plan] || null)

export const planForPrice = (priceId: string | undefined | null): PlanId | null => {
  if (!priceId) return null
  const { prices } = env()
  return priceId === prices.pro ? 'pro' : priceId === prices.premium ? 'premium' : null
}

/** Real charging only turns on once every Stripe setting is present. */
export const isBillingConfigured = () => {
  const e = env()
  return !!(e.secretKey && e.publishableKey && e.prices.pro && e.prices.premium)
}

export const stripeSettings = env
