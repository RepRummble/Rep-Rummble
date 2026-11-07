import type { CloudDevice } from '../../models/DeviceConnection.model'
import { ProviderHttpError, del, getJson, postForm, postJson } from './http'

/** One day of readings from one device. A field is only present when the device really reported it. */
export interface DayMetrics {
  date: string
  steps?: number
  activeCalories?: number
  sleepHours?: number
  restingHR?: number
  hrv?: number
  recovery?: number
  strain?: number
  sleepScore?: number
}

export interface Tokens { accessToken: string; refreshToken?: string; expiresIn?: number; scope?: string }
export interface Creds { clientId: string; clientSecret: string }

export interface CloudProvider {
  id: CloudDevice
  name: string
  envId: string
  envSecret: string
  /** Some providers insist on a short state value. */
  stateLength: number
  authorizeUrl(a: { clientId: string; redirectUri: string; state: string }): string
  exchange(code: string, redirectUri: string, c: Creds): Promise<Tokens>
  refresh(refreshToken: string, c: Creds): Promise<Tokens>
  identity(accessToken: string): Promise<{ externalId?: string; label: string }>
  /** Readings for the calendar days from..to (YYYY-MM-DD, inclusive). */
  days(accessToken: string, from: string, to: string): Promise<DayMetrics[]>
  revoke(t: { accessToken?: string; refreshToken?: string }, c: Creds): Promise<void>
}

// ── helpers ──────────────────────────────────────────────────────────────────
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
/** A finite number from a number or numeric string, within [min, max], else undefined. */
export const clean = (v: unknown, min = 0, max = Infinity): number | undefined => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v
  return isNum(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : undefined
}
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
const DAY = 86_400_000
const isoDay = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (day: string, n: number) => isoDay(new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY))

/** Pulls YYYY-MM-DD out of {date:{year,month,day}}, {year,month,day} or an ISO string. */
export function civilDay(v: any): string | undefined {
  const d = v?.date ?? v
  if (d && isNum(d.year) && isNum(d.month) && isNum(d.day)) return ymd(d.year, d.month, d.day)
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  return undefined
}

/** The person's own calendar day for an instant, given an offset such as "+05:30". */
export function localDay(iso: string, offset?: string): string | undefined {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return undefined
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(offset ?? '')
  const minutes = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0
  return isoDay(new Date(t + minutes * 60_000))
}

function merge(rows: Map<string, DayMetrics>, date: string | undefined, patch: Partial<DayMetrics>) {
  if (!date) return
  const row = rows.get(date) ?? { date }
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) (row as any)[k] = v
  rows.set(date, row)
}
const out = (rows: Map<string, DayMetrics>, from: string, to: string) =>
  [...rows.values()].filter((r) => r.date >= from && r.date <= to).sort((a, b) => a.date.localeCompare(b.date))

// ── WHOOP (developer.whoop.com, API v2) ─────────────────────────────────────
const WHOOP_AUTH = 'https://api.prod.whoop.com/oauth/oauth2/auth'
const WHOOP_TOKEN = 'https://api.prod.whoop.com/oauth/oauth2/token'
const WHOOP_API = 'https://api.prod.whoop.com/developer/v2'

async function whoopPages(path: string, token: string, from: string, to: string): Promise<any[]> {
  const records: any[] = []
  let next: string | undefined
  for (let page = 0; page < 4; page++) {
    const q = new URLSearchParams({ limit: '25', start: `${addDays(from, -1)}T00:00:00.000Z`, end: `${addDays(to, 2)}T00:00:00.000Z` })
    if (next) q.set('nextToken', next)
    const r = await getJson(`${WHOOP_API}${path}?${q}`, token)
    records.push(...(r.records ?? []))
    next = r.next_token
    if (!next) break
  }
  return records
}

const whoop: CloudProvider = {
  id: 'whoop', name: 'WHOOP', envId: 'WHOOP_CLIENT_ID', envSecret: 'WHOOP_CLIENT_SECRET', stateLength: 8,
  authorizeUrl: ({ clientId, redirectUri, state }) => `${WHOOP_AUTH}?${new URLSearchParams({
    response_type: 'code', client_id: clientId, redirect_uri: redirectUri, state,
    scope: 'offline read:recovery read:cycles read:sleep read:profile',
  })}`,
  exchange: async (code, redirectUri, c) => tokensFrom(await postForm(WHOOP_TOKEN, { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: c.clientId, client_secret: c.clientSecret })),
  refresh: async (refreshToken, c) => tokensFrom(await postForm(WHOOP_TOKEN, { grant_type: 'refresh_token', refresh_token: refreshToken, client_id: c.clientId, client_secret: c.clientSecret, scope: 'offline' })),
  identity: async (token) => {
    const p = await getJson(`${WHOOP_API}/user/profile/basic`, token)
    const first = typeof p.first_name === 'string' ? p.first_name.trim().slice(0, 30) : ''
    return { externalId: p.user_id != null ? String(p.user_id) : undefined, label: first ? `WHOOP · ${first}` : 'WHOOP' }
  },
  days: async (token, from, to) => {
    const rows = new Map<string, DayMetrics>()
    const today = isoDay(new Date())
    // A WHOOP "cycle" runs from one sleep to the next. We file it under the day it ends (today, while it is still open),
    // which is the morning the recovery score is given.
    const cycles = await whoopPages('/cycle', token, from, to)
    const dayOfCycle = new Map<string | number, string>()
    for (const c of cycles) {
      const day = c.end ? localDay(c.end, c.timezone_offset) : today
      if (c.id != null && day) dayOfCycle.set(c.id, day)
      merge(rows, day, { strain: c.score?.strain != null ? clean(c.score.strain, 0, 21) : undefined })
    }
    for (const r of await whoopPages('/recovery', token, from, to)) {
      const s = r.score
      if (!s || r.score_state !== 'SCORED') continue
      merge(rows, dayOfCycle.get(r.cycle_id), { recovery: clean(s.recovery_score, 0, 100), restingHR: clean(s.resting_heart_rate, 20, 200), hrv: clean(s.hrv_rmssd_milli, 0, 500) })
    }
    for (const s of await whoopPages('/activity/sleep', token, from, to)) {
      if (s.nap || !s.score) continue
      const st = s.score.stage_summary ?? {}
      const asleepMs = (st.total_light_sleep_time_milli ?? 0) + (st.total_slow_wave_sleep_time_milli ?? 0) + (st.total_rem_sleep_time_milli ?? 0)
      merge(rows, localDay(s.end, s.timezone_offset), { sleepHours: asleepMs > 0 ? clean(asleepMs / 3_600_000, 0, 24) : undefined, sleepScore: clean(s.score.sleep_performance_percentage, 0, 100) })
    }
    return out(rows, from, to)
  },
  revoke: async ({ accessToken }) => { if (accessToken) await del(`${WHOOP_API}/user/access`, accessToken) },
}

// ── Oura (cloud.ouraring.com, API v2) ───────────────────────────────────────
const OURA_AUTH = 'https://cloud.ouraring.com/oauth/authorize'
const OURA_TOKEN = 'https://api.ouraring.com/oauth/token'
const OURA_API = 'https://api.ouraring.com/v2/usercollection'

async function ouraList(path: string, token: string, from: string, to: string): Promise<any[]> {
  const items: any[] = []
  let next: string | undefined
  for (let page = 0; page < 4; page++) {
    const q = new URLSearchParams({ start_date: addDays(from, -1), end_date: addDays(to, 1) })
    if (next) q.set('next_token', next)
    const r = await getJson(`${OURA_API}/${path}?${q}`, token)
    items.push(...(r.data ?? []))
    next = r.next_token
    if (!next) break
  }
  return items
}

const oura: CloudProvider = {
  id: 'oura', name: 'Oura Ring', envId: 'OURA_CLIENT_ID', envSecret: 'OURA_CLIENT_SECRET', stateLength: 32,
  authorizeUrl: ({ clientId, redirectUri, state }) => `${OURA_AUTH}?${new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, state, scope: 'daily' })}`,
  exchange: async (code, redirectUri, c) => tokensFrom(await postForm(OURA_TOKEN, { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: c.clientId, client_secret: c.clientSecret })),
  refresh: async (refreshToken, c) => tokensFrom(await postForm(OURA_TOKEN, { grant_type: 'refresh_token', refresh_token: refreshToken, client_id: c.clientId, client_secret: c.clientSecret })),
  identity: async () => ({ label: 'Oura Ring' }),
  days: async (token, from, to) => {
    const rows = new Map<string, DayMetrics>()
    const [activity, readiness, sleepScore, sleep] = await Promise.all([
      ouraList('daily_activity', token, from, to), ouraList('daily_readiness', token, from, to),
      ouraList('daily_sleep', token, from, to), ouraList('sleep', token, from, to),
    ])
    for (const a of activity) merge(rows, a.day, { steps: clean(a.steps, 0, 500_000), activeCalories: clean(a.active_calories, 0, 50_000) })
    for (const r of readiness) merge(rows, r.day, { recovery: clean(r.score, 0, 100) })
    for (const s of sleepScore) merge(rows, s.day, { sleepScore: clean(s.score, 0, 100) })
    // The main night of each day (not naps).
    for (const s of sleep) {
      if (s.type && s.type !== 'long_sleep') continue
      merge(rows, s.day, {
        sleepHours: isNum(s.total_sleep_duration) ? clean(s.total_sleep_duration / 3600, 0, 24) : undefined,
        hrv: clean(s.average_hrv, 0, 500), restingHR: clean(s.lowest_heart_rate, 20, 200),
      })
    }
    return out(rows, from, to)
  },
  revoke: async ({ accessToken }) => {
    if (!accessToken) return
    const url = `https://api.ouraring.com/oauth/revoke?access_token=${encodeURIComponent(accessToken)}`
    try { await getJson(url, accessToken) } catch (e) { if (e instanceof ProviderHttpError && (e.status === 404 || e.status === 405)) await postForm(url, {}); else throw e }
  },
}

// ── Fitbit, through the Google Health API ───────────────────────────────────
// Google switched off the old Fitbit Web API on 2 November 2026. Fitbit and Pixel Watch data now comes from Google Health.
const GH_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const GH_TOKEN = 'https://oauth2.googleapis.com/token'
const GH_API = 'https://health.googleapis.com/v4/users/me'
const GH_SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
].join(' ')

const dateParts = (day: string) => { const [year, month, d] = day.split('-').map(Number); return { date: { year, month, day: d }, time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 } } }
/** A metric Google might not have for this person: if it cannot be read, that one metric is skipped, never invented. */
const optional = async <T>(p: Promise<T>): Promise<T | undefined> => {
  try { return await p } catch (e) { if (e instanceof ProviderHttpError && e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 403) return undefined; throw e }
}

const fitbit: CloudProvider = {
  id: 'fitbit', name: 'Fitbit', envId: 'GOOGLE_HEALTH_CLIENT_ID', envSecret: 'GOOGLE_HEALTH_CLIENT_SECRET', stateLength: 32,
  authorizeUrl: ({ clientId, redirectUri, state }) => `${GH_AUTH}?${new URLSearchParams({
    response_type: 'code', client_id: clientId, redirect_uri: redirectUri, state, scope: GH_SCOPES, access_type: 'offline', prompt: 'consent',
  })}`,
  exchange: async (code, redirectUri, c) => tokensFrom(await postForm(GH_TOKEN, { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: c.clientId, client_secret: c.clientSecret })),
  refresh: async (refreshToken, c) => tokensFrom(await postForm(GH_TOKEN, { grant_type: 'refresh_token', refresh_token: refreshToken, client_id: c.clientId, client_secret: c.clientSecret })),
  identity: async (token) => {
    const me = await getJson(`${GH_API}/identity`, token) // 400 ACCOUNT_NOT_LINKED when Google Health is not set up yet
    return { externalId: me.healthUserId ? String(me.healthUserId) : undefined, label: 'Fitbit' }
  },
  days: async (token, from, to) => {
    const rows = new Map<string, DayMetrics>()
    const range = { start: dateParts(from), end: dateParts(addDays(to, 1)) }

    const steps = await postJson(`${GH_API}/dataTypes/steps/dataPoints:dailyRollUp`, token, { range, windowSizeDays: 1 })
    for (const p of steps.rollupDataPoints ?? []) merge(rows, civilDay(p.civilStartTime), { steps: clean(p.steps?.countSum, 0, 500_000) })

    // Sleep sessions: the longest one ending on a day is that day's night, so naps are not added on top.
    const sleep = await optional(getJson(`${GH_API}/dataTypes/sleep/dataPoints:reconcile?${new URLSearchParams({
      dataSourceFamily: 'users/me/dataSourceFamilies/google-wearables', filter: `sleep.interval.civil_end_time >= "${addDays(from, 0)}"`,
    })}`, token))
    const longest = new Map<string, number>()
    for (const p of sleep?.dataPoints ?? []) {
      const day = civilDay(p.sleep?.interval?.civilEndTime) ?? (p.sleep?.interval?.endTime ? String(p.sleep.interval.endTime).slice(0, 10) : undefined)
      const mins = clean(p.sleep?.summary?.minutesAsleep, 0, 1440)
      if (day && mins !== undefined && mins > (longest.get(day) ?? 0)) longest.set(day, mins)
    }
    for (const [day, mins] of longest) merge(rows, day, { sleepHours: clean(mins / 60, 0, 24) })

    const rhr = await optional(getJson(`${GH_API}/dataTypes/daily-resting-heart-rate/dataPoints?${new URLSearchParams({ filter: `daily_resting_heart_rate.date >= "${from}"` })}`, token))
    for (const p of rhr?.dataPoints ?? []) merge(rows, civilDay(p.dailyRestingHeartRate?.date), { restingHR: clean(p.dailyRestingHeartRate?.beatsPerMinute, 20, 200) })

    const hrv = await optional(getJson(`${GH_API}/dataTypes/daily-heart-rate-variability/dataPoints?${new URLSearchParams({ filter: `daily_heart_rate_variability.date >= "${from}"` })}`, token))
    for (const p of hrv?.dataPoints ?? []) merge(rows, civilDay(p.dailyHeartRateVariability?.date), { hrv: clean(p.dailyHeartRateVariability?.averageHeartRateVariabilityMilliseconds, 0, 500) })

    return out(rows, from, to)
  },
  revoke: async ({ accessToken, refreshToken }, c) => {
    const token = refreshToken ?? accessToken
    if (token) await postForm(`https://oauth2.googleapis.com/revoke`, { token, client_id: c.clientId, client_secret: c.clientSecret })
  },
}

function tokensFrom(r: any): Tokens {
  if (!r || typeof r.access_token !== 'string' || !r.access_token) throw new ProviderHttpError(502, 'No access token in the provider response')
  return { accessToken: r.access_token, refreshToken: typeof r.refresh_token === 'string' && r.refresh_token ? r.refresh_token : undefined, expiresIn: isNum(r.expires_in) ? r.expires_in : undefined, scope: typeof r.scope === 'string' ? r.scope : undefined }
}

export const CLOUD_PROVIDERS: Record<CloudDevice, CloudProvider> = { whoop, oura, fitbit }
export const DISPLAY_NAMES: Record<string, string> = { apple_watch: 'Apple Watch', galaxy_watch: 'Samsung Galaxy Watch', fitbit: 'Fitbit', whoop: 'WHOOP', oura: 'Oura Ring' }

export function credsFor(p: CloudProvider): Creds | null {
  const clientId = process.env[p.envId], clientSecret = process.env[p.envSecret]
  return clientId && clientSecret ? { clientId, clientSecret } : null
}
