import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import api from '../config/api';
import { DEV_BYPASS_AUTH } from '../config/devConfig';

export type HealthAvailability =
  | { ok: true }
  | { ok: false; reason: 'expo-go' | 'not-ios' | 'unsupported-device' | 'module-missing' };

export interface HealthToday {
  steps: number;
  activeCalories: number;
  distanceKm: number;
  exerciseMinutes: number;
  heartRate: number | null;
  minHR: number | null;
  maxHR: number | null;
  restingHR: number | null;
  hrv: number | null;
  hrvBaseline: number | null;
  spo2: number | null;
  breathingRate: number | null;
  vo2max: number | null;
  weight: number | null;
  bodyFat: number | null;
  sleep: {
    totalHours: number;
    deep: number;
    rem: number;
    core: number;
    awake: number;
    start: Date | null;
    end: Date | null;
  } | null;
  sources: string[];
}

export interface HealthDay {
  day: string;
  steps: number;
  cal: number;
  sleep: number;
  hr: number;
}

const READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKQuantityTypeIdentifierAppleExerciseTime',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierOxygenSaturation',
  'HKQuantityTypeIdentifierRespiratoryRate',
  'HKQuantityTypeIdentifierVO2Max',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierBodyFatPercentage',
  'HKCategoryTypeIdentifierSleepAnalysis',
] as const;

// Sleep stage values from HKCategoryValueSleepAnalysis.
const SLEEP = { inBed: 0, asleepUnspecified: 1, awake: 2, core: 3, deep: 4, rem: 5 };

type HK = typeof import('@kingstinct/react-native-healthkit');
let hk: HK | null = null;

// Loaded lazily so the app still opens in Expo Go, which has no HealthKit native module.
function loadHealthKit(): HK | null {
  if (hk) return hk;
  try {
    hk = require('@kingstinct/react-native-healthkit') as HK;
    return hk;
  } catch {
    return null;
  }
}

export function getAvailability(): HealthAvailability {
  if (Platform.OS !== 'ios') return { ok: false, reason: 'not-ios' };
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return { ok: false, reason: 'expo-go' };
  const mod = loadHealthKit();
  if (!mod) return { ok: false, reason: 'module-missing' };
  try {
    if (!mod.isHealthDataAvailable()) return { ok: false, reason: 'unsupported-device' };
  } catch {
    return { ok: false, reason: 'module-missing' };
  }
  return { ok: true };
}

export async function requestHealthPermissions(): Promise<boolean> {
  const mod = loadHealthKit();
  if (!mod) return false;
  // Apple never reveals whether read access was granted; this resolves once the sheet is dismissed.
  return mod.requestAuthorization({ toRead: READ_TYPES });
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysAgo = (n: number) => { const d = startOfDay(new Date()); d.setDate(d.getDate() - n); return d; };
const round = (n: number, dp = 0) => Math.round(n * 10 ** dp) / 10 ** dp;

async function sumToday(mod: HK, id: Parameters<HK['queryStatisticsForQuantity']>[0], unit: string) {
  const res = await mod.queryStatisticsForQuantity(id, ['cumulativeSum'], {
    unit: unit as never,
    filter: { date: { startDate: startOfDay(new Date()), endDate: new Date() } },
  });
  return { value: res.sumQuantity?.quantity ?? 0, sources: res.sources.map((s) => s.name) };
}

async function latest(mod: HK, id: Parameters<HK['getMostRecentQuantitySample']>[0], unit?: string) {
  const sample = await mod.getMostRecentQuantitySample(id, unit as never);
  return sample ? sample.quantity : null;
}

async function lastNightSleep(mod: HK): Promise<HealthToday['sleep']> {
  const windowStart = new Date(startOfDay(new Date()).getTime() - 6 * 3600 * 1000); // 6pm yesterday
  const samples = await mod.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
    limit: 0,
    ascending: true,
    filter: { date: { startDate: windowStart, endDate: new Date() } },
  });
  if (!samples.length) return null;
  const hours = (s: { startDate: Date; endDate: Date }) =>
    (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 3600000;
  let deep = 0, rem = 0, core = 0, awake = 0, unspecified = 0;
  let start: Date | null = null, end: Date | null = null;
  for (const s of samples) {
    const v = Number(s.value);
    if (v === SLEEP.inBed) continue;
    const h = hours(s);
    if (v === SLEEP.deep) deep += h;
    else if (v === SLEEP.rem) rem += h;
    else if (v === SLEEP.core) core += h;
    else if (v === SLEEP.awake) awake += h;
    else unspecified += h;
    if (v !== SLEEP.awake) {
      const sd = new Date(s.startDate), ed = new Date(s.endDate);
      if (!start || sd < start) start = sd;
      if (!end || ed > end) end = ed;
    }
  }
  const total = deep + rem + core + unspecified;
  if (total === 0) return null;
  // Devices that don't report stages log plain "asleep"; count it as core sleep.
  return { totalHours: round(total, 1), deep: round(deep, 1), rem: round(rem, 1), core: round(core + unspecified, 1), awake: round(awake, 1), start, end };
}

export async function getTodayHealth(): Promise<HealthToday | null> {
  const mod = loadHealthKit();
  if (!mod) return null;
  const today = { startDate: startOfDay(new Date()), endDate: new Date() };

  const [steps, energy, distance, exercise, hrStats, restingHR, hrv, hrvBase, spo2, resp, vo2, weight, bodyFat, sleep] =
    await Promise.all([
      sumToday(mod, 'HKQuantityTypeIdentifierStepCount', 'count'),
      sumToday(mod, 'HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal'),
      sumToday(mod, 'HKQuantityTypeIdentifierDistanceWalkingRunning', 'km'),
      sumToday(mod, 'HKQuantityTypeIdentifierAppleExerciseTime', 'min'),
      mod.queryStatisticsForQuantity('HKQuantityTypeIdentifierHeartRate', ['discreteMin', 'discreteMax', 'mostRecent'], {
        unit: 'count/min',
        filter: { date: today },
      }),
      latest(mod, 'HKQuantityTypeIdentifierRestingHeartRate', 'count/min'),
      latest(mod, 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN', 'ms'),
      mod.queryStatisticsForQuantity('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', ['discreteAverage'], {
        unit: 'ms',
        filter: { date: { startDate: daysAgo(30), endDate: new Date() } },
      }),
      latest(mod, 'HKQuantityTypeIdentifierOxygenSaturation', '%'),
      latest(mod, 'HKQuantityTypeIdentifierRespiratoryRate', 'count/min'),
      latest(mod, 'HKQuantityTypeIdentifierVO2Max'),
      latest(mod, 'HKQuantityTypeIdentifierBodyMass', 'kg'),
      latest(mod, 'HKQuantityTypeIdentifierBodyFatPercentage', '%'),
      lastNightSleep(mod),
    ]);

  // HealthKit's "%" unit is a 0–1 fraction.
  const pct = (v: number | null) => (v === null ? null : round(v <= 1 ? v * 100 : v, 1));

  return {
    steps: Math.round(steps.value),
    activeCalories: Math.round(energy.value),
    distanceKm: round(distance.value, 1),
    exerciseMinutes: Math.round(exercise.value),
    heartRate: hrStats.mostRecentQuantity ? Math.round(hrStats.mostRecentQuantity.quantity) : null,
    minHR: hrStats.minimumQuantity ? Math.round(hrStats.minimumQuantity.quantity) : null,
    maxHR: hrStats.maximumQuantity ? Math.round(hrStats.maximumQuantity.quantity) : null,
    restingHR: restingHR === null ? null : Math.round(restingHR),
    hrv: hrv === null ? null : Math.round(hrv),
    hrvBaseline: hrvBase.averageQuantity ? Math.round(hrvBase.averageQuantity.quantity) : null,
    spo2: pct(spo2),
    breathingRate: resp === null ? null : round(resp, 1),
    vo2max: vo2 === null ? null : round(vo2, 1),
    weight: weight === null ? null : round(weight, 1),
    bodyFat: pct(bodyFat),
    sleep,
    sources: Array.from(new Set([...steps.sources, ...energy.sources, ...hrStats.sources.map((s) => s.name)])),
  };
}

export async function getLast7Days(): Promise<HealthDay[]> {
  const mod = loadHealthKit();
  if (!mod) return [];
  const anchor = daysAgo(6);
  const range = { startDate: anchor, endDate: new Date() };
  const [steps, cal, hr, sleep] = await Promise.all([
    mod.queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], anchor, { day: 1 }, { unit: 'count', filter: { date: range } }),
    mod.queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], anchor, { day: 1 }, { unit: 'kcal', filter: { date: range } }),
    mod.queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierRestingHeartRate', ['discreteAverage'], anchor, { day: 1 }, { unit: 'count/min', filter: { date: range } }),
    mod.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: 0,
      filter: { date: { startDate: new Date(anchor.getTime() - 6 * 3600 * 1000), endDate: new Date() } },
    }),
  ]);

  const key = (d: Date) => startOfDay(d).toDateString();
  const sleepByDay = new Map<string, number>();
  for (const s of sleep) {
    const v = Number(s.value);
    if (v === SLEEP.inBed || v === SLEEP.awake) continue;
    // Attribute sleep to the morning it ends on.
    const k = key(new Date(s.endDate));
    sleepByDay.set(k, (sleepByDay.get(k) ?? 0) + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 3600000);
  }
  const byDay = (list: readonly { startDate?: Date; sumQuantity?: { quantity: number }; averageQuantity?: { quantity: number } }[]) => {
    const m = new Map<string, number>();
    for (const r of list) if (r.startDate) m.set(key(new Date(r.startDate)), r.sumQuantity?.quantity ?? r.averageQuantity?.quantity ?? 0);
    return m;
  };
  const stepsM = byDay(steps), calM = byDay(cal), hrM = byDay(hr);

  return Array.from({ length: 7 }, (_, i) => {
    const d = daysAgo(6 - i);
    const k = key(d);
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      steps: Math.round(stepsM.get(k) ?? 0),
      cal: Math.round(calM.get(k) ?? 0),
      sleep: round(sleepByDay.get(k) ?? 0, 1),
      hr: Math.round(hrM.get(k) ?? 0),
    };
  });
}

// Returns null when skipped: with the dev login bypass there is no real account to save to.
export async function syncToServer(today: HealthToday): Promise<boolean | null> {
  if (DEV_BYPASS_AUTH) return null;
  try {
    await api.post('/wearables/sync', {
      steps: today.steps,
      calories: today.activeCalories,
      heartRate: today.heartRate,
      sleepHours: today.sleep?.totalHours ?? 0,
      hrv: today.hrv,
      restingHR: today.restingHR,
      weight: today.weight,
      bodyFat: today.bodyFat,
    });
    return true;
  } catch {
    return false;
  }
}
