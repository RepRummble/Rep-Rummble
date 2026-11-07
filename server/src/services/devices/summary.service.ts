import { DeviceConnection } from '../../models/DeviceConnection.model'
import { DeviceReading } from '../../models/DeviceReading.model'

export const METRICS = ['steps', 'activeCalories', 'sleepHours', 'restingHR', 'hrv', 'recovery', 'strain', 'sleepScore'] as const
export type Metric = (typeof METRICS)[number]

/**
 * When two devices report the same number for a day, which one we show. Numbers are never added together
 * (two watches would double count), and the screen says where each one came from.
 * A wrist or phone counts steps best; a ring or strap measures sleep and recovery best.
 */
export const PRIORITY: Record<Metric, string[]> = {
  steps: ['apple_watch', 'galaxy_watch', 'fitbit', 'oura'],
  activeCalories: ['apple_watch', 'galaxy_watch', 'fitbit', 'oura'],
  sleepHours: ['oura', 'whoop', 'fitbit', 'apple_watch', 'galaxy_watch'],
  restingHR: ['oura', 'whoop', 'fitbit', 'apple_watch', 'galaxy_watch'],
  hrv: ['oura', 'whoop', 'fitbit', 'apple_watch', 'galaxy_watch'],
  recovery: ['whoop', 'oura'],
  strain: ['whoop'],
  sleepScore: ['oura', 'whoop'],
}

export interface Picked { value: number; source: string }
export type SummaryDay = { date: string } & Partial<Record<Metric, Picked>>

/** Pure: picks one source per metric per day. */
export function mergeDays(rows: { provider: string; date: string; [k: string]: any }[]): SummaryDay[] {
  const byDate = new Map<string, SummaryDay>()
  for (const metric of METRICS) {
    for (const row of rows) {
      const v = row[metric]
      if (typeof v !== 'number') continue
      const day = byDate.get(row.date) ?? { date: row.date }
      const current = day[metric]
      const rank = PRIORITY[metric].indexOf(row.provider)
      if (rank < 0) continue
      if (!current || rank < PRIORITY[metric].indexOf(current.source)) day[metric] = { value: v, source: row.provider }
      byDate.set(row.date, day)
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export async function summaryFor(userId: string, days: number) {
  const from = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10)
  const [rows, conns] = await Promise.all([
    DeviceReading.find({ userId, date: { $gte: from } }).lean(),
    DeviceConnection.find({ userId }).lean(),
  ])
  const connected = new Set(conns.map((c) => c.provider))
  // Readings from a device the person has since removed are never shown.
  return mergeDays(rows.filter((r) => connected.has(r.provider)) as any)
}
