// Rules behind the Profile screen. Pure functions, so they are easy to test.

export interface Targets { calories: number; protein: number; water: number }
export const DEFAULT_TARGETS: Targets = { calories: 2200, protein: 150, water: 8 };

const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

/** Whatever was saved (or typed) becomes a safe set of daily targets. */
export function sanitizeTargets(raw: unknown): Targets {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    calories: clamp(r.calories, 1000, 6000, DEFAULT_TARGETS.calories),
    protein: clamp(r.protein, 20, 400, DEFAULT_TARGETS.protein),
    water: clamp(r.water, 1, 20, DEFAULT_TARGETS.water),
  };
}

// The same choices as the website, so a goal picked in one place shows in the other.
export const GOAL_CHOICES = ['Weight loss', 'Muscle gain', 'Improve endurance', 'Maintain weight', 'General fitness', 'Injury recovery'];
export const ACTIVITY_CHOICES = ['Sedentary (desk job, little movement)', 'Lightly active (1-3 days/week)', 'Moderately active (3-5 days/week)', 'Very active (6-7 days/week)', 'Athlete (2x per day)'];
export const DIET_CHOICES = ['High protein', 'Low sugar', 'No dairy', 'No gluten', 'Vegan', 'Vegetarian', 'Keto', 'Halal', 'Kosher'];
export const NOTIFICATION_CHOICES = [
  { key: 'workout_reminders', label: 'Workout reminders', desc: 'A daily nudge to complete your session' },
  { key: 'weekly_reports', label: 'Weekly progress report', desc: 'A summary every Sunday' },
  { key: 'challenge_updates', label: 'Challenge updates', desc: 'When challenges start or end' },
  { key: 'recovery_alerts', label: 'Recovery alerts', desc: 'When your readiness is low' },
  { key: 'marketing', label: 'Tips & product news', desc: 'Occasional feature announcements' },
] as const;

/** Saved notification choices, filled in for any that were never set (off by default). */
export function notificationState(saved: unknown): Record<string, boolean> {
  const s = (saved && typeof saved === 'object' ? saved : {}) as Record<string, unknown>;
  return Object.fromEntries(NOTIFICATION_CHOICES.map((n) => [n.key, s[n.key] === true]));
}

// ── Exporting your data ────────────────────────────────────────────────────────
export interface HistoryRow { period: string; workouts: number; minutes: number; burned: number; calories: number; protein: number; carbs: number; fat: number }

/** One CSV cell: quoted, and text that a spreadsheet could run as a formula is defused. */
export function csvCell(v: string | number): string {
  const text = String(v);
  const safe = /^[=+\-@]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function historyToCsv(rows: HistoryRow[]): string {
  const header = ['Date', 'Workouts', 'Minutes trained', 'Calories burned', 'Calories eaten', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
  const lines = rows.map((r) => [r.period, r.workouts, r.minutes, r.burned, r.calories, r.protein, r.carbs, r.fat].map(csvCell).join(','));
  return [header.map(csvCell).join(','), ...lines].join('\n');
}

/** Letters, numbers and spaces only: a person's name goes into the greeting, the leaderboard and emails. */
export function cleanName(input: string): string {
  return input.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
}

export function canDelete(typed: string) { return typed.trim().toUpperCase() === 'DELETE'; }
