// Rules for the Premium coaching extras: check-ins and custom nutrition plans. Pure functions, no database.
import { clampTz, localDay } from './progress.service'

export const MAX_CHECKINS_PER_MONTH = 2
export const OPEN_CHECKIN_STATUSES = ['requested', 'scheduled'] as const

/** "2026-11": the person's own calendar month, which is when their allowance resets. */
export const monthKeyOf = (now: Date, tz: unknown): string => localDay(now, clampTz(tz)).slice(0, 7)

/** The first day of the next month, so the app can say when the allowance comes back. */
export function nextMonthStart(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
}

/** Plain text from a form field: tags and control characters removed, whitespace tidied, length capped. */
export const cleanField = (v: unknown, max: number): string =>
  String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f<>]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max)

/** Only https links are accepted for a meeting, so a staff typo cannot send a member somewhere unsafe. */
export function safeHttpsUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null
  try { const u = new URL(v.trim()); return u.protocol === 'https:' && u.hostname.includes('.') && v.length <= 300 ? u.toString() : null } catch { return null }
}

export interface NutritionPlanInput { calories: number; protein: number; carbs: number; fat: number; water: number; meals: { name: string; items: string }[]; notes: string }

const int = (v: unknown, min: number, max: number): number | null => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null }

/** The plan a coach writes, checked. Returns an error message for anything out of range or missing. */
export function parseNutritionPlan(raw: any): { ok: true; plan: NutritionPlanInput } | { ok: false; message: string } {
  const calories = int(raw?.calories, 1000, 6000), protein = int(raw?.protein, 20, 400), carbs = int(raw?.carbs, 0, 800), fat = int(raw?.fat, 0, 300), water = int(raw?.water, 1, 20)
  if (calories === null) return { ok: false, message: 'Calories must be between 1000 and 6000.' }
  if (protein === null) return { ok: false, message: 'Protein must be between 20 and 400 g.' }
  if (carbs === null) return { ok: false, message: 'Carbs must be between 0 and 800 g.' }
  if (fat === null) return { ok: false, message: 'Fat must be between 0 and 300 g.' }
  if (water === null) return { ok: false, message: 'Water must be between 1 and 20 glasses.' }
  // Calories from the grams should be in the same region as the calories target, or the numbers contradict each other.
  const fromMacros = protein * 4 + carbs * 4 + fat * 9
  if (Math.abs(fromMacros - calories) / calories > 0.2) return { ok: false, message: `Protein, carbs and fat add up to about ${fromMacros} kcal, which is not within 20% of ${calories} kcal. Adjust one of them.` }
  const meals = (Array.isArray(raw?.meals) ? raw.meals : []).slice(0, 8).map((m: any) => ({ name: cleanField(m?.name, 40), items: cleanField(m?.items, 400) })).filter((m: { name: string; items: string }) => m.name && m.items)
  if (meals.length < 2) return { ok: false, message: 'Add at least two meals, each with a name and what to eat.' }
  return { ok: true, plan: { calories, protein, carbs, fat, water, meals, notes: cleanField(raw?.notes, 1000) } }
}

/** One cell of a CSV, quoted, with anything a spreadsheet could run as a formula made harmless. */
export function csvCell(v: unknown): string {
  let s = String(v ?? '').replace(/[\r\n]+/g, ' ')
  if (/^[=+\-@\t]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

/** Priority order for the support queue: Premium first, then the urgency (not the word's alphabetical order). */
export const PRIORITY_RANK: Record<string, number> = { low: 0, medium: 1, high: 2, urgent: 3 }
export function sortSupportQueue<T extends { premium?: boolean; priority?: string; createdAt: Date }>(list: T[]): T[] {
  return [...list].sort((a, b) =>
    Number(!!b.premium) - Number(!!a.premium) || (PRIORITY_RANK[b.priority ?? 'medium'] ?? 1) - (PRIORITY_RANK[a.priority ?? 'medium'] ?? 1) || a.createdAt.getTime() - b.createdAt.getTime())
}
