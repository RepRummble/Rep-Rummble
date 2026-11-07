// Small rules for the Social screens: names, times, themes and how shared cards read. Pure functions, no React.

export const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

const PALETTE: [string, string][] = [['#ff9a4d', '#c4182f'], ['#4da3ff', '#1f3aa0'], ['#a07cff', '#4b2aa8'], ['#35e0a1', '#0b6b4f'], ['#ff6a8a', '#8f1d4a'], ['#ffd36a', '#b36a00']];
/** The same person always gets the same colours. */
export function avatarColors(name: string): [string, string] {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** "just now", "5 min ago", "3 h ago", "yesterday", or the date. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const sec = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 1000));
  if (sec < 45) return 'just now';
  if (sec < 3600) return `${Math.max(1, Math.round(sec / 60))} min ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)} h ago`;
  if (sec < 172800) return 'yesterday';
  if (sec < 7 * 86400) return `${Math.round(sec / 86400)} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Time left on a status, as "5 h left". */
export function timeLeft(iso: string, now: Date = new Date()): string {
  const min = Math.round((Date.parse(iso) - now.getTime()) / 60000);
  if (min <= 0) return 'expired';
  return min < 60 ? `${min} min left` : `${Math.round(min / 60)} h left`;
}

export const STORY_THEMES: [string, string][] = [['#d62839', '#ff7a1a'], ['#1f3aa0', '#4da3ff'], ['#4b2aa8', '#a07cff'], ['#0b6b4f', '#35e0a1'], ['#8f1d4a', '#ff6a8a'], ['#2a3550', '#0b1226']];

export interface WorkoutSnap { exercise: string; duration: number; volume?: number; setCount?: number; calories?: number; topSet?: { exercise: string; weight: number; reps: number } }
export interface MealSnap { foodName: string; calories: number; protein: number; carbs: number; fat: number; mealType?: string }

export interface CardFacts { title: string; subtitle?: string; stats: { value: string; label: string }[] }

export function workoutFacts(s: WorkoutSnap): CardFacts {
  const stats = [{ value: `${s.duration}`, label: 'min' }];
  if (s.setCount) stats.push({ value: `${s.setCount}`, label: 'sets' });
  if (s.volume) stats.push({ value: `${(s.volume / 1000).toFixed(1)}`, label: 'tonnes' });
  if (s.calories) stats.push({ value: `${s.calories}`, label: 'kcal' });
  return { title: s.exercise, subtitle: s.topSet ? `Top set: ${s.topSet.exercise} ${s.topSet.weight} kg × ${s.topSet.reps}` : undefined, stats };
}

export function mealFacts(s: MealSnap): CardFacts {
  return { title: s.foodName, subtitle: s.mealType ? s.mealType[0].toUpperCase() + s.mealType.slice(1) : undefined, stats: [
    { value: `${Math.round(s.calories)}`, label: 'kcal' }, { value: `${Math.round(s.protein)}`, label: 'g protein' }, { value: `${Math.round(s.carbs)}`, label: 'g carbs' }, { value: `${Math.round(s.fat)}`, label: 'g fat' },
  ] };
}

export const streakLabel = (n: number) => `${n} day${n === 1 ? '' : 's'} in a row`;

export const REPORT_REASONS: { key: string; label: string }[] = [
  { key: 'spam', label: 'Spam or scam' },
  { key: 'harassment', label: 'Harassment or bullying' },
  { key: 'inappropriate', label: 'Inappropriate or offensive' },
  { key: 'self_harm', label: 'Self-harm or danger' },
  { key: 'impersonation', label: 'Pretending to be someone' },
  { key: 'other', label: 'Something else' },
];
