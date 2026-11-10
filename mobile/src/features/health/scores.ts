// Reprummble's own Recovery, Sleep and Strain scores, worked out from the readings in the person's health app.
// Every number here comes from a written formula, and each score lists the readings that moved it, so nothing is a black box.
// Pure functions: no phone, no network.

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round = (n: number) => Math.round(n);

export type Level = 'green' | 'yellow' | 'red';
export const levelOf = (score: number): Level => (score >= 67 ? 'green' : score >= 34 ? 'yellow' : 'red');
export const LEVEL_WORD: Record<Level, string> = { green: 'Primed', yellow: 'Steady', red: 'Recover' };

export interface Part { key: string; label: string; points: number; weight: number; detail: string }

// ── Baselines ───────────────────────────────────────────────────────────────────
export interface Baseline { mean: number; sd: number; n: number }

/** The person's own normal: the average and spread of their recent days (today excluded). Missing days are skipped. */
export function baselineOf(values: (number | null | undefined)[], minSd: number): Baseline {
  const v = values.filter((x): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0);
  if (v.length === 0) return { mean: 0, sd: 0, n: 0 };
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const variance = v.length > 1 ? v.reduce((a, b) => a + (b - mean) ** 2, 0) / (v.length - 1) : 0;
  // A very steady person would make every small change look huge, so the spread never drops below a floor.
  return { mean, sd: Math.max(Math.sqrt(variance), minSd), n: v.length };
}

export const MIN_BASELINE_DAYS = 5;

// ── Recovery ────────────────────────────────────────────────────────────────────
export interface RecoveryInput {
  hrv: number | null; hrvBaseline: Baseline;
  restingHR: number | null; rhrBaseline: Baseline;
  sleepHours: number | null; sleepNeed: number;
}

export type RecoveryResult =
  | { ready: true; score: number; level: Level; word: string; parts: Part[]; summary: string }
  | { ready: false; reason: 'calibrating' | 'no-data'; nights: number; needed: number; message: string };

/** 50 at your normal, up 25 points for each spread above it (down for below), capped at 0 and 100. */
const fromZ = (z: number) => clamp(50 + 25 * z, 0, 100);
const WEIGHTS = { hrv: 0.5, rhr: 0.25, sleep: 0.25 };

/** Points for hours slept against hours needed. Falling short costs more than proportionally: 6 of 8 hours is about 56, 5 of 8 is about 39. */
export const durationPoints = (hours: number, need: number) => 100 * clamp(hours / need, 0, 1) ** 2;

const pctDiff = (value: number, mean: number) => Math.round(((value - mean) / mean) * 100);
const sign = (n: number) => (n > 0 ? `${n}% above` : n < 0 ? `${-n}% below` : 'right at');

/**
 * Recovery, 1 to 99: how ready your body is today.
 * HRV (50%): higher than your normal is better. Resting heart rate (25%): lower than your normal is better.
 * Sleep (25%): hours against what you need. It needs at least 5 days of your own history to know what "normal" is.
 */
export function recoveryScore(i: RecoveryInput): RecoveryResult {
  const parts: Part[] = [];
  const hrvOk = i.hrv !== null && i.hrv > 0 && i.hrvBaseline.n >= MIN_BASELINE_DAYS;
  const rhrOk = i.restingHR !== null && i.restingHR > 0 && i.rhrBaseline.n >= MIN_BASELINE_DAYS;

  if (hrvOk) {
    const z = (i.hrv! - i.hrvBaseline.mean) / i.hrvBaseline.sd; const d = pctDiff(i.hrv!, i.hrvBaseline.mean);
    parts.push({ key: 'hrv', label: 'HRV', points: fromZ(z), weight: WEIGHTS.hrv, detail: `${round(i.hrv!)} ms, ${sign(d)} your ${round(i.hrvBaseline.mean)} ms average` });
  }
  if (rhrOk) {
    const z = (i.rhrBaseline.mean - i.restingHR!) / i.rhrBaseline.sd; const d = pctDiff(i.restingHR!, i.rhrBaseline.mean);
    parts.push({ key: 'rhr', label: 'Resting heart rate', points: fromZ(z), weight: WEIGHTS.rhr, detail: `${round(i.restingHR!)} bpm, ${sign(d)} your ${round(i.rhrBaseline.mean)} bpm average` });
  }
  if (!hrvOk && !rhrOk) {
    const nights = Math.max(i.hrvBaseline.n, i.rhrBaseline.n);
    return nights < MIN_BASELINE_DAYS && (i.hrv !== null || i.restingHR !== null)
      ? { ready: false, reason: 'calibrating', nights, needed: MIN_BASELINE_DAYS, message: `Learning your normal: ${nights} of ${MIN_BASELINE_DAYS} days so far. Wear your watch to sleep.` }
      : { ready: false, reason: 'no-data', nights, needed: MIN_BASELINE_DAYS, message: 'No heart rate variability or resting heart rate yet. Wear your watch overnight.' };
  }
  if (i.sleepHours !== null && i.sleepHours > 0 && i.sleepNeed > 0) {
    parts.push({ key: 'sleep', label: 'Sleep', points: durationPoints(i.sleepHours, i.sleepNeed), weight: WEIGHTS.sleep, detail: `${i.sleepHours.toFixed(1)} h of the ${i.sleepNeed} h you need` });
  }

  // Missing readings are left out and the rest share the weight, so a missing reading never counts as a zero.
  const totalW = parts.reduce((a, p) => a + p.weight, 0);
  const score = clamp(round(parts.reduce((a, p) => a + p.points * p.weight, 0) / totalW), 1, 99);
  const level = levelOf(score);
  const weakest = [...parts].sort((a, b) => a.points - b.points)[0];
  const strongest = [...parts].sort((a, b) => b.points - a.points)[0];
  const summary = level === 'green' ? `Your body is ready. ${strongest.label} is your strongest reading.` : level === 'yellow' ? `A normal day. ${weakest.label} is holding you back a little.` : `Take it easy today. ${weakest.label} is the main reason.`;
  return { ready: true, score, level, word: LEVEL_WORD[level], parts, summary };
}

// ── Sleep ───────────────────────────────────────────────────────────────────────
export interface SleepInput { asleepHours: number; need: number; deepHours?: number; remHours?: number; awakeHours?: number }
export interface SleepResult { score: number; level: Level; parts: Part[]; limited: boolean }

/**
 * Sleep, 0 to 100. Duration (60%): hours against need. Restorative sleep (25%): deep plus REM as a share of sleep, 40% is full marks.
 * Continuity (15%): time asleep out of time in bed, 95% is full marks. Without sleep stages it uses duration alone and says so.
 */
export function sleepScore(i: SleepInput): SleepResult | null {
  if (!(i.asleepHours > 0) || !(i.need > 0)) return null;
  const parts: Part[] = [];
  const dur = durationPoints(i.asleepHours, i.need);
  const hasStages = i.deepHours !== undefined && i.remHours !== undefined;
  const hasAwake = i.awakeHours !== undefined;
  parts.push({ key: 'duration', label: 'Duration', points: dur, weight: 0.6, detail: `${i.asleepHours.toFixed(1)} h of ${i.need} h` });
  if (hasStages) {
    const share = ((i.deepHours! + i.remHours!) / i.asleepHours);
    parts.push({ key: 'restorative', label: 'Deep and REM', points: 100 * clamp(share / 0.4, 0, 1), weight: 0.25, detail: `${Math.round(share * 100)}% of your sleep (aim for about 40%)` });
  }
  if (hasAwake) {
    const eff = i.asleepHours / (i.asleepHours + i.awakeHours!);
    parts.push({ key: 'continuity', label: 'Unbroken sleep', points: 100 * clamp((eff - 0.7) / 0.25, 0, 1), weight: 0.15, detail: `${Math.round(eff * 100)}% of your time in bed asleep` });
  }
  const totalW = parts.reduce((a, p) => a + p.weight, 0);
  const score = clamp(round(parts.reduce((a, p) => a + p.points * p.weight, 0) / totalW), 0, 100);
  return { score, level: levelOf(score), parts, limited: !hasStages };
}

// ── Strain ──────────────────────────────────────────────────────────────────────
export interface HrSample { t: number; bpm: number }
export interface StrainResult { strain: number; trimp: number; zoneMinutes: number[]; maxHR: number }

/** Highest heart rate we believe: what the person has really reached, kept inside a sane range. */
export const maxHRFrom = (observed: number | null | undefined, age?: number | null): number => {
  if (typeof observed === 'number' && observed > 0) return clamp(observed, 165, 210);
  if (typeof age === 'number' && age > 0) return clamp(208 - 0.7 * age, 165, 210);
  return 190;
};

const ZONE_WEIGHTS = [1, 2, 3, 4, 5];
const MAX_GAP_MIN = 10;

/**
 * Strain, 0 to 21: how hard your heart worked today. Time spent above half of your heart rate reserve counts more the harder it is
 * (zones 1 to 5 count 1 to 5 per minute), and the total is squeezed onto a 0 to 21 scale so each extra hour adds a little less.
 * `endMs` closes the last sample; a gap between samples longer than 10 minutes is not assumed to be exercise.
 */
export function strainFromSamples(samples: HrSample[], restingHR: number, maxHR: number, endMs: number): StrainResult {
  const rest = clamp(restingHR || 60, 35, 100);
  const max = Math.max(maxHR, rest + 40);
  const sorted = [...samples].filter((s) => s.bpm > 0 && Number.isFinite(s.t)).sort((a, b) => a.t - b.t);
  const zoneMinutes = [0, 0, 0, 0, 0];
  let trimp = 0;
  sorted.forEach((s, i) => {
    const nextT = i + 1 < sorted.length ? sorted[i + 1].t : endMs;
    const minutes = clamp((nextT - s.t) / 60000, 0, MAX_GAP_MIN);
    const reserve = (s.bpm - rest) / (max - rest);
    if (reserve < 0.5) return;
    const zone = reserve >= 0.9 ? 4 : reserve >= 0.8 ? 3 : reserve >= 0.7 ? 2 : reserve >= 0.6 ? 1 : 0;
    zoneMinutes[zone] += minutes; trimp += minutes * ZONE_WEIGHTS[zone];
  });
  const strain = 21 * (1 - Math.exp(-trimp / 260));
  return { strain: Math.round(strain * 10) / 10, trimp: Math.round(trimp), zoneMinutes: zoneMinutes.map((m) => Math.round(m)), maxHR: max };
}

export interface StrainTarget { min: number; max: number; label: string }

/** How hard to go today, from recovery. Without a recovery score there is no target. */
export function strainTarget(recovery: number | null): StrainTarget | null {
  if (recovery === null) return null;
  const level = levelOf(recovery);
  return level === 'green' ? { min: 14, max: 18, label: 'Push' } : level === 'yellow' ? { min: 9, max: 14, label: 'Maintain' } : { min: 4, max: 9, label: 'Recover' };
}

export const strainWord = (s: number) => (s < 4 ? 'Light' : s < 9 ? 'Easy' : s < 14 ? 'Moderate' : s < 18 ? 'High' : 'All out');

/** Sleep to aim for: an adult default, nudged by the person's own average if it is clearly higher. */
export const sleepNeedFor = (avgHours?: number | null): number => (avgHours && avgHours > 8 ? Math.min(9, Math.round(avgHours * 2) / 2) : 8);
