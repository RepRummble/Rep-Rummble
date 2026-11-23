// What the Premium coaching screens say and check. Pure functions. The server enforces every rule; this only words them.

export type CheckInStatus = 'requested' | 'scheduled' | 'done' | 'cancelled' | 'declined';
export interface CheckIn {
  _id: string; topic: string; preferredTimes: string; status: CheckInStatus; createdAt: string; scheduledFor: string | null; meetingLink: string | null;
  coachName: string | null; summary: string | null; actionItems: string[]; declineReason: string | null;
}
export interface CheckInList { premium: boolean; items: CheckIn[]; limit: number; used: number; remaining: number; resetsOn: string; canRequest: boolean }

export interface NutritionPlan { calories: number; protein: number; carbs: number; fat: number; water: number; meals: { name: string; items: string }[]; notes: string }
export interface NutritionRequest { _id: string; goal: string; status: 'requested' | 'delivered' | 'declined'; createdAt: string; plan: NutritionPlan | null; coachName: string | null; deliveredAt: string | null; declineReason: string | null }
export interface NutritionState { premium: boolean; latest: NutritionRequest | null; current: NutritionRequest | null; canRequest: boolean; resetsOn: string }

export const STATUS_LABEL: Record<CheckInStatus, { label: string; tone: 'good' | 'warn' | 'muted' | 'bad' }> = {
  requested: { label: 'Waiting for a coach', tone: 'warn' }, scheduled: { label: 'Booked', tone: 'good' }, done: { label: 'Done', tone: 'good' },
  cancelled: { label: 'Cancelled', tone: 'muted' }, declined: { label: 'Not taken', tone: 'bad' },
};

export const isOpen = (s: CheckInStatus) => s === 'requested' || s === 'scheduled';

/** "1 of 2 left this month. They come back on 1 December." */
export function allowanceLine(l: Pick<CheckInList, 'remaining' | 'limit' | 'resetsOn'>): string {
  const when = new Date(`${l.resetsOn}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return l.remaining > 0 ? `${l.remaining} of ${l.limit} left this month. They come back on ${when}.` : `You have used all ${l.limit} this month. They come back on ${when}.`;
}

/** Why the request button is off, in a sentence (or null when it is on). */
export function whyCannotRequest(l: Pick<CheckInList, 'premium' | 'remaining' | 'items' | 'canRequest'>): string | null {
  if (l.canRequest) return null;
  if (!l.premium) return 'Coach check-ins come with Premium.';
  if (l.items.some((c) => isOpen(c.status))) return 'You already have a check-in waiting. Cancel it to ask for another.';
  if (l.remaining <= 0) return 'You have used this month’s check-ins.';
  return null;
}

/** The meeting link is only opened when it is a secure web address. */
export const safeLink = (u: string | null | undefined): string | null => (typeof u === 'string' && /^https:\/\/[^\s]+\.[^\s]+$/.test(u) ? u : null);

export const topicProblem = (t: string): string | null => (t.trim().length < 10 ? 'Tell your coach a little more, at least a sentence.' : t.length > 600 ? 'That is too long. Keep it under 600 characters.' : null);
export const goalProblem = (g: string): string | null => (g.trim().length < 3 ? 'Tell your coach your goal, for example "lose 5 kg".' : null);

/** The daily targets this plan sets in the app: calories, protein and water. */
export const planTargets = (p: NutritionPlan) => ({ calories: p.calories, protein: p.protein, water: p.water });

/** Calories the macros add up to, shown beside the target so a member can see it is consistent. */
export const macroKcal = (p: Pick<NutritionPlan, 'protein' | 'carbs' | 'fat'>) => p.protein * 4 + p.carbs * 4 + p.fat * 9;

export const upgradeText = (err: { response?: { status?: number; data?: { code?: string; message?: string } } }): string | null =>
  err?.response?.status === 402 || err?.response?.data?.code === 'upgrade_required' ? (err.response?.data?.message ?? 'This is part of the Premium plan.') : null;
