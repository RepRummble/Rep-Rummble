export const PRICING = {
  premiumMonthly: 9.99,
  currency: '$',
  trialDays: 14,
  // Share of program revenue paid out to partner gyms. Confirm before launch.
  gymPayoutPercent: 80,
} as const;

export type PlanFeature = { label: string; free: boolean | string; premium: boolean | string };

export const PLAN_FEATURES: PlanFeature[] = [
  { label: 'Workout & meal logging', free: true, premium: true },
  { label: 'Habit streaks & weekly insights', free: true, premium: true },
  { label: 'Community challenges', free: '1 per month', premium: 'Unlimited' },
  { label: 'Personalized AI training plan', free: false, premium: true },
  { label: 'AI meal photo analysis', free: false, premium: true },
  { label: 'Wearable sync (Apple, Garmin, Oura…)', free: false, premium: true },
  { label: 'Daily recovery & readiness score', free: false, premium: true },
  { label: 'Advanced analytics & reports', free: false, premium: true },
  { label: 'Programs from partner gyms', free: 'Buy individually', premium: 'Member pricing' },
];
