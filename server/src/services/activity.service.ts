import { Workout } from '../models/Workout.model'
import { Meal } from '../models/Meal.model'
import { WearableData } from '../models/WearableData.model'

export type Period = 'monthly' | 'yearly' | 'historical'
export const PERIODS: Period[] = ['monthly', 'yearly', 'historical']

const DAY = 86_400_000
const FORMATS: Record<Period, string> = { monthly: '%Y-%m-%d', yearly: '%Y-%m', historical: '%Y' }
const round1 = (v: number | undefined | null) => Math.round((v ?? 0) * 10) / 10
const isoDay = (d: Date) => d.toISOString().slice(0, 10)

/** Every period label in the window, so quiet days and months still show up as zero rows. */
function labelsFor(period: Period, now: Date): string[] {
  const out: string[] = []
  if (period === 'monthly') {
    for (let i = 29; i >= 0; i--) out.push(isoDay(new Date(now.getTime() - i * DAY)))
  } else if (period === 'yearly') {
    for (let i = 11; i >= 0; i--) out.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7))
  }
  return out
}

export function windowStart(period: Period, now: Date): Date | null {
  if (period === 'monthly') {
    const d = new Date(now.getTime() - 29 * DAY)
    d.setUTCHours(0, 0, 0, 0)
    return d
  }
  if (period === 'yearly') return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
  return null
}

export interface ReportRow {
  period: string
  workouts: number
  minutes: number
  burned: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

/** One row per day (30 days), month (12 months) or year (all time), from the person's own workouts and meals. */
export async function buildReportRows(userId: string, period: Period, now = new Date()): Promise<ReportRow[]> {
  const start = windowStart(period, now)
  const range = start ? { timestamp: { $gte: start } } : {}
  const format = FORMATS[period]

  const [workouts, meals] = await Promise.all([
    Workout.aggregate([
      { $match: { userId, completed: { $ne: false }, ...range } },
      { $group: {
        _id: { $dateToString: { format, date: '$timestamp' } },
        workouts: { $sum: 1 }, minutes: { $sum: '$duration' }, burned: { $sum: { $ifNull: ['$calories', 0] } },
      } },
    ]),
    Meal.aggregate([
      { $match: { userId, ...range } },
      { $group: {
        _id: { $dateToString: { format, date: '$timestamp' } },
        calories: { $sum: '$calories' }, protein: { $sum: '$protein' }, carbs: { $sum: '$carbs' }, fat: { $sum: '$fat' },
      } },
    ]),
  ])

  const byKey = new Map<string, Partial<ReportRow>>()
  for (const w of workouts) byKey.set(w._id, { workouts: w.workouts, minutes: w.minutes, burned: w.burned })
  for (const m of meals) byKey.set(m._id, { ...byKey.get(m._id), calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat })

  const keys = labelsFor(period, now)
  const labels = keys.length ? keys : [...byKey.keys()].sort()
  return labels.map((label) => {
    const r = byKey.get(label) ?? {}
    return {
      period: label, workouts: round1(r.workouts), minutes: round1(r.minutes), burned: round1(r.burned),
      calories: round1(r.calories), protein: round1(r.protein), carbs: round1(r.carbs), fat: round1(r.fat),
    }
  })
}

export interface RecentWorkout { exercise: string; minutes: number; burned: number; at: string }
export interface RecentMeal { name: string; calories: number; protein: number; carbs: number; fat: number; mealType?: string; at: string }

export async function recentWorkouts(userId: string, limit: number, since?: Date | null): Promise<RecentWorkout[]> {
  const rows = await Workout.find({ userId, completed: { $ne: false }, ...(since ? { timestamp: { $gte: since } } : {}) })
    .sort({ timestamp: -1 }).limit(limit).select('exercise duration calories timestamp')
  return rows.map((w) => ({ exercise: w.exercise, minutes: w.duration, burned: w.calories ?? 0, at: w.timestamp.toISOString() }))
}

export async function recentMeals(userId: string, limit: number, since?: Date | null): Promise<RecentMeal[]> {
  const rows = await Meal.find({ userId, ...(since ? { timestamp: { $gte: since } } : {}) })
    .sort({ timestamp: -1 }).limit(limit).select('foodName calories protein carbs fat mealType timestamp')
  return rows.map((m) => ({ name: m.foodName, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat, mealType: m.mealType, at: m.timestamp.toISOString() }))
}

const sum = (rows: ReportRow[], key: keyof Omit<ReportRow, 'period'>) => round1(rows.reduce((n, r) => n + r[key], 0))

/** Everything the Reports page and the PDF show for one period. */
export async function getHistory(userId: string, period: Period, now = new Date()) {
  const start = windowStart(period, now)
  const [rows, workouts, meals] = await Promise.all([
    buildReportRows(userId, period, now),
    recentWorkouts(userId, 25, start),
    recentMeals(userId, 25, start),
  ])
  return {
    period,
    generatedAt: now.toISOString(),
    from: start ? isoDay(start) : (rows[0]?.period ?? null),
    to: isoDay(now),
    rows,
    totals: {
      workouts: sum(rows, 'workouts'), minutes: sum(rows, 'minutes'), burned: sum(rows, 'burned'),
      calories: sum(rows, 'calories'), protein: sum(rows, 'protein'), carbs: sum(rows, 'carbs'), fat: sum(rows, 'fat'),
    },
    recentWorkouts: workouts,
    recentMeals: meals,
  }
}

export interface WearableDay {
  date: string; steps: number; sleepHours: number; calories: number
  heartRate: number | null; restingHR: number | null; hrv: number | null; weight: number | null; bodyFat: number | null
  syncedAt: string
}

export async function wearableDays(userId: string, days: number): Promise<WearableDay[]> {
  const from = isoDay(new Date(Date.now() - (days - 1) * DAY))
  const rows = await WearableData.find({ userId, date: { $gte: from } }).sort({ date: -1 })
  return rows.map((w) => ({
    date: w.date, steps: w.steps ?? 0, sleepHours: round1(w.sleepHours), calories: w.calories ?? 0,
    heartRate: w.heartRate ?? null, restingHR: w.restingHR ?? null, hrv: w.hrv ?? null, weight: w.weight ?? null, bodyFat: w.bodyFat ?? null,
    syncedAt: (w.syncedAt ?? new Date(`${w.date}T00:00:00Z`)).toISOString(),
  }))
}

/** Consecutive days with a workout, ending today (or yesterday, so an unfinished day does not break it). */
export function streaks(dates: Set<string>, now = new Date()) {
  let current = 0
  let cursor = new Date(now)
  if (!dates.has(isoDay(cursor))) cursor = new Date(cursor.getTime() - DAY)
  while (dates.has(isoDay(cursor))) {
    current++
    cursor = new Date(cursor.getTime() - DAY)
  }
  let longest = 0
  let run = 0
  let prev: number | null = null
  for (const d of [...dates].sort()) {
    const t = Date.parse(`${d}T00:00:00Z`)
    run = prev !== null && t - prev === DAY ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = t
  }
  return { current, longest }
}

/** The numbers behind the member dashboard. */
export async function getOverview(userId: string, now = new Date()) {
  const [daily, wTotals, mTotals, workoutDays, workouts, meals, wearables] = await Promise.all([
    buildReportRows(userId, 'monthly', now),
    Workout.aggregate([
      { $match: { userId, completed: { $ne: false } } },
      { $group: { _id: null, count: { $sum: 1 }, minutes: { $sum: '$duration' }, burned: { $sum: { $ifNull: ['$calories', 0] } } } },
    ]),
    Meal.aggregate([{ $match: { userId } }, { $group: { _id: null, count: { $sum: 1 }, calories: { $sum: '$calories' } } }]),
    Workout.aggregate([
      { $match: { userId, completed: { $ne: false }, timestamp: { $gte: new Date(now.getTime() - 400 * DAY) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } } } },
    ]),
    recentWorkouts(userId, 10),
    recentMeals(userId, 10),
    wearableDays(userId, 14),
  ])

  const week = daily.slice(-7)
  const today = daily[daily.length - 1]
  const macroKcal = { p: sum(week, 'protein') * 4, c: sum(week, 'carbs') * 4, f: sum(week, 'fat') * 9 }
  const macroTotal = macroKcal.p + macroKcal.c + macroKcal.f
  const weekWorkouts = sum(week, 'workouts')
  const loggedMealDays = week.filter((d) => d.calories > 0).length

  return {
    totals: {
      workouts: wTotals[0]?.count ?? 0, minutes: round1(wTotals[0]?.minutes), burned: round1(wTotals[0]?.burned),
      meals: mTotals[0]?.count ?? 0, calories: round1(mTotals[0]?.calories),
    },
    week: {
      workouts: weekWorkouts, minutes: sum(week, 'minutes'), burned: sum(week, 'burned'),
      activeDays: week.filter((d) => d.workouts > 0).length,
      avgCalories: loggedMealDays ? Math.round(sum(week, 'calories') / loggedMealDays) : 0,
      consistency: Math.min(100, Math.round((week.filter((d) => d.workouts > 0).length / 5) * 100)),
    },
    streak: streaks(new Set(workoutDays.map((d) => d._id as string)), now),
    today: { calories: today.calories, protein: today.protein, carbs: today.carbs, fat: today.fat },
    macroSplit: macroTotal > 0 ? {
      protein: Math.round((macroKcal.p / macroTotal) * 100),
      carbs: Math.round((macroKcal.c / macroTotal) * 100),
      fat: Math.round((macroKcal.f / macroTotal) * 100),
    } : null,
    daily,
    recentWorkouts: workouts,
    recentMeals: meals,
    wearables: { latest: wearables[0] ?? null, days: wearables },
  }
}
