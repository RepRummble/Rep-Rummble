import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { SAMSUNG_HEALTH, galaxyLabel, galaxySource, localDayKey } from '../features/devices/devicesLogic';

// Samsung Galaxy Watch data reaches an Android phone through Samsung Health, which shares it with Android's Health Connect.
// Reprummble reads it from there, so it only ever reports what the watch really recorded.

export type HcAvailability = { ok: true } | { ok: false; reason: 'not-android' | 'expo-go' | 'module-missing' | 'not-installed' | 'update-needed' };
export interface HcDay { date: string; steps?: number; activeCalories?: number; sleepHours?: number; restingHR?: number; hrv?: number }

type HC = typeof import('react-native-health-connect');
let hc: HC | null = null;
function load(): HC | null {
  if (hc) return hc;
  try { hc = require('react-native-health-connect') as HC; return hc; } catch { return null; } // not in this build (or Expo Go)
}

export async function getHcAvailability(): Promise<HcAvailability> {
  if (Platform.OS !== 'android') return { ok: false, reason: 'not-android' };
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return { ok: false, reason: 'expo-go' };
  const mod = load();
  if (!mod) return { ok: false, reason: 'module-missing' };
  try {
    const s = await mod.getSdkStatus();
    if (s === mod.SdkAvailabilityStatus.SDK_AVAILABLE) return { ok: true };
    return { ok: false, reason: s === mod.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED ? 'update-needed' : 'not-installed' };
  } catch { return { ok: false, reason: 'module-missing' }; }
}

const READ = ['Steps', 'ActiveCaloriesBurned', 'SleepSession', 'RestingHeartRate', 'HeartRateVariabilityRmssd'] as const;

/** Opens Android's permission sheet. Resolves true when at least steps can be read. */
export async function requestHcPermissions(): Promise<boolean> {
  const mod = load();
  if (!mod) return false;
  if (!(await mod.initialize())) return false;
  const granted = await mod.requestPermission(READ.map((recordType) => ({ accessType: 'read' as const, recordType })));
  return granted.some((p) => (p as { recordType?: string }).recordType === 'Steps');
}

const dayRange = (daysAgo: number) => {
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - daysAgo);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return { operator: 'between' as const, startTime: start.toISOString(), endTime: (daysAgo === 0 ? new Date() : end).toISOString() };
};

/**
 * Looks for data written by Samsung Health in the last week and says whether it came from a Galaxy Watch.
 * 'watch' = a Samsung watch is identified; 'samsung_health' = Samsung Health data exists but the record does not say which device.
 */
export async function detectGalaxy(): Promise<{ kind: 'watch' | 'samsung_health'; label: string } | null> {
  const mod = load();
  if (!mod) return null;
  const startTime = dayRange(6).startTime, endTime = new Date().toISOString();
  let found: { kind: 'watch' | 'samsung_health'; model?: string } | null = null;
  for (const recordType of ['Steps', 'SleepSession'] as const) {
    const res = await mod.readRecords(recordType, { timeRangeFilter: { operator: 'between', startTime, endTime }, dataOriginFilter: [SAMSUNG_HEALTH], pageSize: 200 });
    for (const r of res.records) {
      const kind = galaxySource(r.metadata?.dataOrigin, r.metadata?.device);
      if (kind === 'watch') return { kind, label: galaxyLabel(r.metadata?.device?.model) };
      if (kind && !found) found = { kind };
    }
  }
  return found ? { kind: found.kind, label: 'Samsung Health' } : null;
}

/** The last week, one row per local day, using only Samsung Health's data. */
export async function getGalaxyDays(days = 7): Promise<HcDay[]> {
  const mod = load();
  if (!mod) return [];
  const origin = [SAMSUNG_HEALTH];
  const rows: HcDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const range = dayRange(i);
    const date = localDayKey(new Date(range.startTime));
    const row: HcDay = { date };
    const safe = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => { try { return await fn(); } catch { return undefined; } };

    const steps = await safe(() => mod.aggregateRecord({ recordType: 'Steps', timeRangeFilter: range, dataOriginFilter: origin }));
    if (steps && steps.COUNT_TOTAL > 0) row.steps = Math.round(steps.COUNT_TOTAL);
    const cal = await safe(() => mod.aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: range, dataOriginFilter: origin }));
    if (cal && cal.ACTIVE_CALORIES_TOTAL?.inKilocalories > 0) row.activeCalories = Math.round(cal.ACTIVE_CALORIES_TOTAL.inKilocalories);
    const rhr = await safe(() => mod.aggregateRecord({ recordType: 'RestingHeartRate', timeRangeFilter: range, dataOriginFilter: origin }));
    if (rhr && rhr.BPM_AVG > 0) row.restingHR = Math.round(rhr.BPM_AVG);
    const hrv = await safe(() => mod.readRecords('HeartRateVariabilityRmssd', { timeRangeFilter: range, dataOriginFilter: origin, pageSize: 500 }));
    if (hrv && hrv.records.length) row.hrv = Math.round(hrv.records.reduce((a, r) => a + r.heartRateVariabilityMillis, 0) / hrv.records.length);
    rows.push(row);
  }

  // Sleep belongs to the morning it ends on. Count the time actually asleep (not awake or out of bed) when stages exist.
  const sleep = await (async () => { try { return await mod.readRecords('SleepSession', { timeRangeFilter: { operator: 'between', startTime: dayRange(days).startTime, endTime: new Date().toISOString() }, dataOriginFilter: origin, pageSize: 100 }); } catch { return undefined; } })();
  const ASLEEP = new Set([2, 4, 5, 6]); // sleeping, light, deep, REM
  const hours = new Map<string, number>();
  for (const s of sleep?.records ?? []) {
    const ms = (a: string, b: string) => Date.parse(b) - Date.parse(a);
    const asleep = s.stages?.length ? s.stages.filter((g) => ASLEEP.has(g.stage)).reduce((sum, g) => sum + ms(g.startTime, g.endTime), 0) : ms(s.startTime, s.endTime);
    const k = localDayKey(new Date(s.endTime));
    hours.set(k, (hours.get(k) ?? 0) + asleep / 3_600_000);
  }
  for (const r of rows) { const h = hours.get(r.date); if (h && h > 0) r.sleepHours = Math.round(h * 10) / 10; }
  return rows.filter((r) => Object.keys(r).length > 1);
}

export function openHcSettings() { try { load()?.openHealthConnectSettings(); } catch { /* nothing to open */ } }
