import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { assembleReadiness, deviceReadingsFrom, type ReadingInputs, type Readiness } from '../features/health/readiness';
import { getAvailability, getScoreInputs, requestHealthPermissions } from './healthService';
import { getGalaxyDays, getHcAvailability } from './healthConnectService';
import { devices } from './devicesService';

const CACHE_KEY = 'rr_readiness_v1';
const FRESH_MS = 10 * 60_000;
const EMPTY: ReadingInputs = { days: [], night: null, hrSamples: [], observedMaxHR: null };

/** What the phone can read: Apple Health on iPhone, Health Connect on Android, nothing in Expo Go or on the web. */
async function phoneInputs(): Promise<ReadingInputs> {
  try {
    if (Platform.OS === 'ios' && getAvailability().ok) {
      await requestHealthPermissions();
      return (await getScoreInputs()) ?? EMPTY;
    }
    if (Platform.OS === 'android' && (await getHcAvailability()).ok === true) {
      const rows = await getGalaxyDays(15);
      return { ...EMPTY, days: rows.map((r) => ({ date: r.date, hrv: r.hrv ?? null, restingHR: r.restingHR ?? null, sleepHours: r.sleepHours ?? null })) };
    }
  } catch { /* nothing readable: the scores simply say so */ }
  return EMPTY;
}

/** Today's Recovery, Sleep and Strain: from the phone's health data, plus whatever a connected WHOOP or Oura reports. */
export async function loadReadiness(): Promise<Readiness> {
  const [inputs, summary] = await Promise.all([phoneInputs(), devices.summary(3).catch(() => [])]);
  const r = assembleReadiness(inputs, deviceReadingsFrom(summary as never));
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), day: new Date().toDateString(), r })).catch(() => {});
  return r;
}

/** The last result, if it is from today, so screens show something at once while a fresh one loads. */
export async function cachedReadiness(): Promise<{ r: Readiness; fresh: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (c.day !== new Date().toDateString()) return null;
    return { r: c.r as Readiness, fresh: Date.now() - c.at < FRESH_MS };
  } catch { return null; }
}
