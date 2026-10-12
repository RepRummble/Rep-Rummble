export const PRICING = {
  currency: '$',
  proMonthly: 9.99,
  premiumMonthly: 14.99,
  trialDays: 14,
  // Share of program revenue paid out to partner gyms. Confirm before launch.
  gymPayoutPercent: 80,
} as const;

// What a Pro member (including partner-gym members, who get Pro included) pays to move up to Premium.
export const PREMIUM_UPGRADE = Math.round((PRICING.premiumMonthly - PRICING.proMonthly) * 100) / 100;

export const fmtPrice = (n: number) => `${PRICING.currency}${n % 1 === 0 ? n : n.toFixed(2)}`;

export type PlanValue = boolean | string;
export type PlanFeature = { label: string; free: PlanValue; pro: PlanValue; premium: PlanValue };

export const PLAN_FEATURES: PlanFeature[] = [
  { label: 'Workout & meal logging', free: 'Limited', pro: 'Unlimited', premium: 'Unlimited' },
  { label: 'Habit streaks & weekly insights', free: true, pro: true, premium: true },
  { label: 'Community challenges', free: '1 per month', pro: 'Unlimited', premium: 'Unlimited' },
  { label: 'Personalized AI training plan', free: false, pro: true, premium: true },
  { label: 'AI meal photo analysis', free: false, pro: true, premium: true },
  { label: 'Wearable sync (Apple, Garmin, Oura…)', free: false, pro: true, premium: true },
  { label: 'Daily recovery & readiness score', free: false, pro: true, premium: true },
  { label: 'Advanced analytics & reports', free: false, pro: true, premium: true },
  { label: 'Programs from partner gyms', free: 'Buy individually', pro: 'Member pricing', premium: 'Member pricing' },
  { label: '1-on-1 coach check-ins', free: false, pro: false, premium: '2× per month' },
  { label: 'Custom nutrition plan from a coach', free: false, pro: false, premium: true },
  { label: 'Progress report export (PDF)', free: false, pro: false, premium: true },
  { label: 'Priority support', free: false, pro: false, premium: true },
  { label: 'Early access to new features', free: false, pro: false, premium: true },
];

export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    tagline: 'Try it out with the basics.',
    cta: 'Start free',
    highlights: ['Limited workout & meal logging', 'Habit streaks & weekly insights', '1 community challenge a month'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: PRICING.proMonthly,
    tagline: 'Full access to every core feature.',
    cta: `Try Pro free for ${PRICING.trialDays} days`,
    badge: 'Included at partner gyms',
    highlights: ['Unlimited logging', 'Personalized AI training plan', 'AI meal photo analysis', 'Wearable sync & recovery score', 'Advanced analytics', 'Member pricing on gym programs'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: PRICING.premiumMonthly,
    tagline: 'Pro plus real coaching from a human.',
    cta: 'Get Premium',
    highlights: ['Everything in Pro', '1-on-1 coach check-ins (2× a month)', 'Custom nutrition plan from a coach', 'PDF progress reports', 'Priority support & early access'],
  },
] as const;
