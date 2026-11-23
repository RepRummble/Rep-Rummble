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
  { label: 'Workout & meal logging', free: 'Unlimited', pro: 'Unlimited', premium: 'Unlimited' },
  { label: 'AI meal photo scans', free: '3 a day', pro: 'Up to 100 a day', premium: 'Up to 100 a day' },
  { label: 'AI meal quick-log & food search', free: '10 and 40 a day', pro: '200 and 400 a day', premium: '200 and 400 a day' },
  { label: 'AI coach workout plans', free: '3 a day', pro: 'Up to 30 a day', premium: 'Up to 30 a day' },
  { label: 'Offline coach, editable plans & ~1,000-exercise library', free: true, pro: true, premium: true },
  { label: 'Habit streaks, social feed & weekly insights', free: true, pro: true, premium: true },
  { label: 'Challenges with friends (30, 60 and 90 days)', free: true, pro: true, premium: true },
  { label: 'Wearables: Apple Watch, Galaxy Watch, Fitbit, WHOOP, Oura', free: true, pro: true, premium: true },
  { label: 'Recovery, sleep & strain scores', free: true, pro: true, premium: true },
  { label: 'Reports history & CSV export', free: false, pro: true, premium: true },
  { label: 'Programs from partner gyms', free: 'Buy individually', pro: 'Member pricing', premium: 'Member pricing' },
  { label: '1-on-1 coach check-ins', free: false, pro: false, premium: '2× per month' },
  { label: 'Custom nutrition plan from a coach', free: false, pro: false, premium: '1 a month' },
  { label: 'Progress report export (PDF)', free: false, pro: false, premium: true },
  { label: 'Priority support', free: false, pro: false, premium: true },
];

export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    tagline: 'Everything you need to train, with daily AI limits.',
    cta: 'Start free',
    highlights: ['Unlimited workout & meal logging', '3 AI meal scans and 3 AI coach plans a day', 'Offline coach, friends & challenges', 'Wearables and recovery, sleep & strain scores'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: PRICING.proMonthly,
    tagline: 'Much higher daily AI limits, plus reports and CSV export.',
    cta: `Try Pro free for ${PRICING.trialDays} days`,
    badge: 'Included at partner gyms',
    highlights: ['Up to 100 AI meal scans a day', 'Up to 30 AI coach plans a day', 'Reports history & CSV export', 'Member pricing on gym programs'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: PRICING.premiumMonthly,
    tagline: 'Pro plus real coaching from a human.',
    cta: 'Get Premium',
    highlights: ['Everything in Pro', '1-on-1 coach check-ins (2× a month)', 'Custom nutrition plan from a coach', 'PDF progress reports', 'Priority support'],
  },
] as const;
