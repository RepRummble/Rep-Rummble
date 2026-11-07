// What the AI coach asks, in plain words. The keys are what the server accepts.

export interface Choice { key: string; label: string; hint?: string; icon?: string }

export const GOALS: Choice[] = [
  { key: 'build_muscle', label: 'Build muscle', hint: 'Get bigger', icon: 'barbell-outline' },
  { key: 'lose_fat', label: 'Lose fat', hint: 'Keep your muscle', icon: 'flame-outline' },
  { key: 'get_toned', label: 'Get lean and toned', hint: 'Defined, not bulky', icon: 'body-outline' },
  { key: 'get_stronger', label: 'Get stronger', hint: 'Lift more', icon: 'trending-up-outline' },
  { key: 'endurance', label: 'Endurance', hint: 'Fitter and faster', icon: 'speedometer-outline' },
  { key: 'general_fitness', label: 'General fitness', hint: 'Feel good', icon: 'heart-outline' },
];

export const BODY_STYLES: Choice[] = [
  { key: 'bodybuilder', label: 'Bodybuilder', hint: 'Full, muscular, big' },
  { key: 'v_taper', label: 'V-taper', hint: 'Wide back and shoulders, small waist' },
  { key: 'athletic', label: 'Athletic', hint: 'Muscular but fast' },
  { key: 'lean_toned', label: 'Lean and toned', hint: 'Slim and defined' },
  { key: 'glutes_legs', label: 'Strong glutes and legs', hint: 'Lower body focus' },
  { key: 'powerlifter', label: 'Powerlifter', hint: 'Heavy squat, bench, deadlift' },
  { key: 'calisthenics', label: 'Calisthenics', hint: 'Bodyweight strength' },
  { key: 'functional', label: 'Functional', hint: 'Strong, mobile, capable' },
];

export const LEVELS: Choice[] = [{ key: 'beginner', label: 'Beginner' }, { key: 'intermediate', label: 'Intermediate' }, { key: 'advanced', label: 'Advanced' }];

export const EQUIPMENT: Choice[] = [
  { key: 'full_gym', label: 'Full gym', icon: 'business-outline' },
  { key: 'dumbbells', label: 'Dumbbells', icon: 'barbell-outline' },
  { key: 'home_bodyweight', label: 'No equipment', icon: 'home-outline' },
  { key: 'kettlebell_bands', label: 'Kettlebell and bands', icon: 'fitness-outline' },
];

export const FOCUS: Choice[] = ['chest', 'back', 'shoulders', 'arms', 'abs', 'glutes', 'legs'].map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1) }));

export const DAYS_PER_WEEK = [2, 3, 4, 5, 6];
export const SESSION_MINUTES = [30, 45, 60, 75];

export interface Brief { goal?: string; bodyStyle?: string; level: string; equipment: string; daysPerWeek: number; minutes: number; focus: string[]; notes: string; /** Things that hurt: knee, shoulder, back, wrist, impact. */ avoid: string[] }
export const DEFAULT_BRIEF: Brief = { level: 'beginner', equipment: 'full_gym', daysPerWeek: 4, minutes: 45, focus: [], notes: '', avoid: [] };

export const AVOID: Choice[] = [{ key: 'knee', label: 'Knees' }, { key: 'shoulder', label: 'Shoulders' }, { key: 'back', label: 'Lower back' }, { key: 'wrist', label: 'Wrists' }, { key: 'impact', label: 'High impact' }];

/** What the server's AI sees: the same answers, with anything that hurts written into the note (the server keeps 200 characters). */
export function aiBrief(b: Brief): Omit<Brief, 'avoid'> {
  const { avoid, ...rest } = b;
  const hurts = avoid.length ? `Avoid exercises that stress: ${avoid.join(', ')}.` : '';
  return { ...rest, notes: [hurts, b.notes].filter(Boolean).join(' ').slice(0, 200) };
}

/** The coach can start once it knows the goal and the body they want. */
export const briefReady = (b: Brief) => !!b.goal && !!b.bodyStyle;

export const labelOf = (list: Choice[], key?: string) => list.find((c) => c.key === key)?.label ?? '';

/** "Build muscle · V-taper · 4 days a week" */
export const briefSummary = (b: Brief) => [labelOf(GOALS, b.goal), labelOf(BODY_STYLES, b.bodyStyle), `${b.daysPerWeek} days a week`].filter(Boolean).join(' · ');

/** Spreads n training days over the week so rest days fall between them: 3 days is Mon, Wed, Fri. */
export function suggestWeekdays(n: number): number[] {
  const plans: Record<number, number[]> = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] };
  return plans[Math.min(6, Math.max(1, n))];
}

/** Which weekday each day of a plan is suggested for. */
export const scheduleFor = (days: number): number[] => suggestWeekdays(days);

export function aiErrorMessage(status: number | undefined, code: string | undefined, fallback?: string): string {
  if (code === 'quota_exceeded') return fallback ?? 'You have used today’s free workout plans. Come back tomorrow, or upgrade for more.';
  if (code === 'ai_unavailable' || status === 503) return 'The coach is not available right now. Please try again in a moment. Nothing was used from your allowance.';
  if (status === 400) return fallback ?? 'Please check your answers and try again.';
  return 'Could not reach the coach. Check your connection and try again.';
}
