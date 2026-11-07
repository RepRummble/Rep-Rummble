import { Meal } from '../models/Meal.model'
import { Workout } from '../models/Workout.model'
import { MissionClaim } from '../models/MissionClaim.model'
import { User } from '../models/User.model'

// XP, levels, streaks and daily missions. The server decides all of them from what was really logged, so a client cannot
// give itself XP. (Meals and workouts are still entered by the person, as in any tracker; what cannot be done is
// skipping the log, or collecting the same mission twice.)

export const XP_PER_LEVEL = 500
export const levelFromXp = (xp: number) => Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1

export interface Targets { calories: number; protein: number; water: number }
export const DEFAULT_TARGETS: Targets = { calories: 2200, protein: 150, water: 8 }

const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback
}
export const sanitizeTargets = (raw: Record<string, unknown> | undefined): Targets => ({
  calories: clamp(raw?.calories, 1000, 6000, DEFAULT_TARGETS.calories),
  protein: clamp(raw?.protein, 20, 400, DEFAULT_TARGETS.protein),
  water: clamp(raw?.water, 1, 20, DEFAULT_TARGETS.water),
})

// ── Days in the person's own timezone ───────────────────────────────────────────
/** `tz` is the browser/phone value: minutes to ADD to local time to get UTC (what JavaScript's getTimezoneOffset returns). */
export const clampTz = (tz: unknown) => clamp(tz, -840, 840, 0)

export function localDay(now: Date, tz: number): string {
  return new Date(now.getTime() - tz * 60_000).toISOString().slice(0, 10)
}

export function dayWindow(day: string, tz: number): { start: Date; end: Date } {
  const [y, m, d] = day.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, d) + tz * 60_000)
  return { start, end: new Date(start.getTime() + 24 * 3600_000) }
}

export const isDayString = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))

// ── Missions ────────────────────────────────────────────────────────────────────
export interface DayTotals { mealsLogged: number; calories: number; protein: number; workouts: number }

export interface MissionState { id: string; title: string; hint: string; icon: string; xp: number; progress: number; target: number; unit: string; done: boolean; claimed: boolean }

export function evaluateMissions(t: DayTotals, targets: Targets, glasses: number, claimed: string[]): MissionState[] {
  const water = clamp(glasses, 0, 30, 0)
  const calOk = t.calories >= targets.calories * 0.85 && t.calories <= targets.calories * 1.15
  const m = (id: string, title: string, hint: string, icon: string, xp: number, progress: number, target: number, unit: string, done: boolean): MissionState =>
    ({ id, title, hint, icon, xp, progress, target, unit, done, claimed: done && claimed.includes(id) })
  return [
    m('log-meal', 'Fuel up', 'Log a meal', 'restaurant-outline', 20, Math.min(t.mealsLogged, 1), 1, '', t.mealsLogged >= 1),
    m('protein', 'Protein power', `Reach ${targets.protein} g of protein`, 'fitness-outline', 30, Math.min(Math.round(t.protein), targets.protein), targets.protein, 'g', t.protein >= targets.protein),
    m('calories', 'On target', `Land within 15% of ${targets.calories} kcal`, 'flame-outline', 25, Math.min(Math.round(t.calories), targets.calories), targets.calories, 'kcal', calOk),
    m('train', 'Launch a workout', 'Log a training session', 'barbell-outline', 40, Math.min(t.workouts, 1), 1, '', t.workouts >= 1),
    m('hydrate', 'Stay hydrated', `Drink ${targets.water} glasses of water`, 'water-outline', 15, Math.min(water, targets.water), targets.water, '', water >= targets.water),
  ]
}

export async function dayTotals(supabaseId: string, start: Date, end: Date): Promise<DayTotals> {
  const [meals, workouts] = await Promise.all([
    Meal.aggregate([
      { $match: { userId: supabaseId, timestamp: { $gte: start, $lt: end } } },
      { $group: { _id: null, n: { $sum: 1 }, calories: { $sum: { $ifNull: ['$calories', 0] } }, protein: { $sum: { $ifNull: ['$protein', 0] } } } },
    ]),
    Workout.countDocuments({ userId: supabaseId, timestamp: { $gte: start, $lt: end } }),
  ])
  return { mealsLogged: meals[0]?.n ?? 0, calories: meals[0]?.calories ?? 0, protein: meals[0]?.protein ?? 0, workouts }
}

// ── Streak ──────────────────────────────────────────────────────────────────────
/** Consecutive days with a workout, ending today (or yesterday: today is still open, so the streak is alive until it ends). */
export function streakFromDays(days: Set<string>, today: string): number {
  const prev = (d: string) => new Date(Date.parse(d) - 24 * 3600_000).toISOString().slice(0, 10)
  let cursor = days.has(today) ? today : prev(today)
  let n = 0
  while (days.has(cursor)) { n++; cursor = prev(cursor) }
  return n
}

export async function computeStreak(supabaseId: string, tz: number, now: Date = new Date()): Promise<number> {
  const since = new Date(now.getTime() - 400 * 24 * 3600_000)
  const rows = await Workout.find({ userId: supabaseId, timestamp: { $gte: since } }).select('timestamp').lean()
  const days = new Set(rows.map((r) => localDay(new Date(r.timestamp), tz)))
  return streakFromDays(days, localDay(now, tz))
}

// ── XP ──────────────────────────────────────────────────────────────────────────
export async function awardXp(legacyUserId: string, amount: number) {
  const doc = await User.findByIdAndUpdate(legacyUserId, { $inc: { xp: amount } }, { returnDocument: 'after' })
  if (doc) {
    const level = levelFromXp(doc.xp)
    if (doc.level !== level) { await User.updateOne({ _id: legacyUserId }, { $set: { level } }); doc.level = level }
  }
  return doc
}

export interface Snapshot { day: string; xp: number; level: number; xpInLevel: number; xpToNext: number; streak: number; missions: MissionState[]; claimableXp: number; awarded?: number }

export async function snapshot(args: { supabaseId: string; legacyId: string; day: string; tz: number; targets: Targets; glasses: number; awarded?: number }): Promise<Snapshot> {
  const { supabaseId, legacyId, day, tz, targets, glasses } = args
  const { start, end } = dayWindow(day, tz)
  const [totals, claims, user, streak] = await Promise.all([
    dayTotals(supabaseId, start, end),
    MissionClaim.find({ userId: supabaseId, day }).select('missionId').lean(),
    User.findById(legacyId).select('xp level'),
    computeStreak(supabaseId, tz),
  ])
  const missions = evaluateMissions(totals, targets, glasses, claims.map((c) => c.missionId))
  const xp = user?.xp ?? 0
  return {
    day, xp, level: levelFromXp(xp), xpInLevel: xp % XP_PER_LEVEL, xpToNext: XP_PER_LEVEL - (xp % XP_PER_LEVEL), streak, missions,
    claimableXp: missions.filter((m) => m.done && !m.claimed).reduce((s, m) => s + m.xp, 0),
    ...(args.awarded !== undefined ? { awarded: args.awarded } : {}),
  }
}

/** Pays out the requested missions that are really complete and not yet collected. Safe to call twice or in parallel. */
export async function claim(args: { supabaseId: string; legacyId: string; day: string; tz: number; targets: Targets; glasses: number; ids: string[] }): Promise<Snapshot> {
  const before = await snapshot(args)
  let awarded = 0
  for (const m of before.missions) {
    if (!args.ids.includes(m.id) || !m.done || m.claimed) continue
    try {
      await MissionClaim.create({ userId: args.supabaseId, day: args.day, missionId: m.id, xp: m.xp })
      awarded += m.xp
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e // 11000 = already collected, possibly by a parallel request
    }
  }
  if (awarded > 0) await awardXp(args.legacyId, awarded)
  return snapshot({ ...args, awarded })
}
