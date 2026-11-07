// Rules for 30, 60 and 90 day challenges. Pure functions: a challenge is a window of calendar days, and progress is
// the number of those days on which the person logged a workout. Nothing here is typed in by hand: the days come from
// the workouts they really saved.

export const CHALLENGE_LENGTHS = [30, 60, 90] as const
/** How many days a week they promise to train. */
export const CHALLENGE_PACES = [3, 5, 7] as const

export const addDays = (key: string, n: number): string => new Date(Date.parse(`${key}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
export const daysBetween = (from: string, to: string): number => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)

/** Training days needed to finish: 30 days at 5 a week is 22 days. */
export const targetFor = (days: number, perWeek: number): number => Math.ceil((days * perWeek) / 7)

export const endKeyFor = (startKey: string, days: number): string => addDays(startKey, days - 1)

export type ChallengeState = 'active' | 'finished'
/** Which day of the challenge today is (1-based). Zero before it starts, and above `days` once it is over. */
export const dayNumber = (startKey: string, today: string): number => daysBetween(startKey, today) + 1

export interface MemberProgress {
  done: number
  target: number
  pct: number
  /** Consecutive training days ending today (or yesterday, so an unfinished day does not break it). */
  streak: number
  todayDone: boolean
  /** One character per challenge day: d done, m missed, t today (not done yet), f still to come. */
  grid: string
  /** Whether they are keeping up with the pace they promised so far. */
  onTrack: boolean
  completed: boolean
}

export function progressFor(doneKeys: Set<string>, startKey: string, days: number, perWeek: number, today: string): MemberProgress {
  const target = targetFor(days, perWeek)
  const endKey = endKeyFor(startKey, days)
  let done = 0
  let grid = ''
  for (let i = 0; i < days; i++) {
    const k = addDays(startKey, i)
    if (doneKeys.has(k)) { done++; grid += 'd' }
    else if (k < today) grid += 'm'
    else if (k === today) grid += 't'
    else grid += 'f'
  }
  const upTo = today > endKey ? endKey : today
  let streak = 0
  let cursor = doneKeys.has(upTo) ? upTo : addDays(upTo, -1)
  while (cursor >= startKey && doneKeys.has(cursor)) { streak++; cursor = addDays(cursor, -1) }

  const elapsed = Math.min(days, Math.max(0, dayNumber(startKey, today)))
  // Pace so far, rounded down so the first days never read as "behind".
  const expected = Math.floor((elapsed * perWeek) / 7)
  return {
    done, target, pct: Math.min(100, Math.round((done / target) * 100)), streak,
    todayDone: doneKeys.has(today), grid, onTrack: done >= expected, completed: done >= target,
  }
}

export const stateOf = (startKey: string, days: number, today: string): ChallengeState => (today > endKeyFor(startKey, days) ? 'finished' : 'active')

export const isLength = (v: unknown): v is (typeof CHALLENGE_LENGTHS)[number] => (CHALLENGE_LENGTHS as readonly unknown[]).includes(v)
export const isPace = (v: unknown): v is (typeof CHALLENGE_PACES)[number] => (CHALLENGE_PACES as readonly unknown[]).includes(v)

export const MAX_MEMBERS = 10
export const MAX_ACTIVE_PER_PERSON = 5
