// Puts the readings together into today's Recovery, Sleep and Strain, and decides which recovery number to lead with.
// Pure functions: the phone reads the data elsewhere and hands it in.
import {
  baselineOf, levelOf, maxHRFrom, recoveryScore, sleepNeedFor, sleepScore, strainFromSamples, strainTarget, LEVEL_WORD,
  type Level, type RecoveryResult, type SleepResult, type StrainResult, type StrainTarget,
} from './scores';

export interface ReadingDay { date: string; hrv: number | null; restingHR: number | null; sleepHours: number | null }
export interface ReadingInputs {
  days: ReadingDay[];                                                    // oldest first, today last
  night: { asleep: number; deep: number; rem: number; awake: number } | null;
  hrSamples: { t: number; bpm: number }[];
  observedMaxHR: number | null;
}
export interface DevicePick { value: number; source: string }
export interface DeviceReadings { recovery?: DevicePick; strain?: DevicePick; sleepScore?: DevicePick }

export interface Headline { score: number; level: Level; word: string; source: string }
export interface Readiness {
  own: RecoveryResult; sleep: SleepResult | null; strain: StrainResult | null;
  /** The recovery number to lead with: your WHOOP or Oura's if you wear one, otherwise ours. */
  headline: Headline | null; target: StrainTarget | null; sleepNeed: number; device: DeviceReadings;
}

const latest = (days: ReadingDay[], key: 'hrv' | 'restingHR'): number | null => {
  for (let i = days.length - 1; i >= Math.max(0, days.length - 2); i--) { const v = days[i][key]; if (typeof v === 'number' && v > 0) return v; }
  return null;
};

export function assembleReadiness(i: ReadingInputs, device: DeviceReadings = {}, now: Date = new Date(), age?: number | null): Readiness {
  const history = i.days.slice(0, -1);
  const hrvBase = baselineOf(history.map((d) => d.hrv), 3);
  const rhrBase = baselineOf(history.map((d) => d.restingHR), 2);
  const hrv = latest(i.days, 'hrv'), rhr = latest(i.days, 'restingHR');

  const recent = history.slice(-14).map((d) => d.sleepHours).filter((h): h is number => typeof h === 'number' && h > 0);
  const need = sleepNeedFor(recent.length >= 5 ? recent.reduce((a, b) => a + b, 0) / recent.length : null);
  const asleep = i.night?.asleep ?? i.days.at(-1)?.sleepHours ?? null;

  const own = recoveryScore({ hrv, hrvBaseline: hrvBase, restingHR: rhr, rhrBaseline: rhrBase, sleepHours: asleep, sleepNeed: need });

  // Sleep stages are only trusted when the watch really recorded some (a plain "asleep" night has none).
  const staged = i.night && i.night.deep + i.night.rem > 0;
  const sleep = i.night
    ? sleepScore(staged ? { asleepHours: i.night.asleep, need, deepHours: i.night.deep, remHours: i.night.rem, awakeHours: i.night.awake } : { asleepHours: i.night.asleep, need })
    : asleep ? sleepScore({ asleepHours: asleep, need }) : null;

  const strain = i.hrSamples.length >= 5
    ? strainFromSamples(i.hrSamples, rhr ?? (rhrBase.n ? rhrBase.mean : 60), maxHRFrom(i.observedMaxHR, age), now.getTime())
    : null;

  let headline: Headline | null = null;
  if (device.recovery) { const s = Math.round(device.recovery.value); const level = levelOf(s); headline = { score: s, level, word: LEVEL_WORD[level], source: device.recovery.source }; }
  else if (own.ready) headline = { score: own.score, level: own.level, word: own.word, source: 'reprummble' };

  return { own, sleep, strain, headline, target: strainTarget(headline?.score ?? null), sleepNeed: need, device };
}

/** The numbers the server already holds for the newest day: what a connected WHOOP, Oura or Fitbit reported. */
export function deviceReadingsFrom(days: { date: string; recovery?: DevicePick; strain?: DevicePick; sleepScore?: DevicePick }[]): DeviceReadings {
  const newest = [...days].sort((a, b) => b.date.localeCompare(a.date)).find((d) => d.recovery || d.strain || d.sleepScore);
  return newest ? { recovery: newest.recovery, strain: newest.strain, sleepScore: newest.sleepScore } : {};
}
