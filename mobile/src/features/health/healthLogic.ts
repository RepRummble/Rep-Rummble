// Rules behind the Health screen. Everything is worked out from the readings Apple Health really holds; a reading that is
// missing is shown as missing, never filled in.

export interface Observation { id: string; icon: string; tone: 'good' | 'warn' | 'info'; title: string; body: string }

export interface ObsInput { steps: number; sleepHours: number | null; hrv: number | null; hrvBaseline: number | null; spo2: number | null; restingHR: number | null }

export const STEP_GOAL = 10_000;

/** 7.8 -> "7 h 48 min". */
export function hoursLabel(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60), mm = total % 60;
  return hh === 0 ? `${mm} min` : mm === 0 ? `${hh} h` : `${hh} h ${mm} min`;
}

/** Apple Health reports oxygen saturation as a fraction (0.97); some sources as a percent (97). */
export const spo2Percent = (v: number) => Math.round(v <= 1 ? v * 100 : v);

export function observations(i: ObsInput): Observation[] {
  const out: Observation[] = [];
  if (i.sleepHours !== null && i.sleepHours > 0) {
    if (i.sleepHours < 6) out.push({ id: 'sleep-short', icon: 'moon-outline', tone: 'warn', title: `A short night: ${hoursLabel(i.sleepHours)}`, body: 'Under 7 hours of sleep slows recovery. An earlier night will help your next workout.' });
    else if (i.sleepHours >= 7) out.push({ id: 'sleep-good', icon: 'moon-outline', tone: 'good', title: `${hoursLabel(i.sleepHours)} of sleep`, body: 'You are in the 7 to 9 hour range that supports recovery.' });
  }
  if (i.hrv && i.hrvBaseline && i.hrvBaseline > 0) {
    const diff = Math.round(((i.hrv - i.hrvBaseline) / i.hrvBaseline) * 100);
    if (diff <= -15) out.push({ id: 'hrv-low', icon: 'pulse-outline', tone: 'warn', title: `HRV is ${Math.abs(diff)}% below your average`, body: 'A lower HRV can mean stress or tiredness. Consider a lighter session today.' });
    else if (diff >= 10) out.push({ id: 'hrv-high', icon: 'pulse-outline', tone: 'good', title: `HRV is ${diff}% above your average`, body: 'Your body looks well recovered.' });
  }
  if (i.spo2 !== null && i.spo2 > 0 && spo2Percent(i.spo2) < 92) out.push({ id: 'spo2-low', icon: 'water-outline', tone: 'warn', title: `Blood oxygen reads ${spo2Percent(i.spo2)}%`, body: 'This is lower than usual. If you feel unwell, speak to a doctor. Watch readings can be inaccurate.' });
  if (i.steps >= STEP_GOAL) out.push({ id: 'steps', icon: 'footsteps-outline', tone: 'good', title: 'Step goal reached', body: `${i.steps.toLocaleString('en-US')} steps today.` });
  return out;
}

export interface SleepBar { key: 'deep' | 'rem' | 'core' | 'awake'; label: string; hours: number; pct: number }

/** The stages of last night as shares of the night, only for stages that were really recorded. */
export function sleepBars(s: { totalHours: number; deep: number; rem: number; core: number; awake: number } | null): SleepBar[] {
  if (!s) return [];
  const parts: [SleepBar['key'], string, number][] = [['deep', 'Deep', s.deep], ['rem', 'REM', s.rem], ['core', 'Light', s.core], ['awake', 'Awake', s.awake]];
  const sum = parts.reduce((a, [, , h]) => a + (h > 0 ? h : 0), 0);
  if (sum <= 0) return [];
  return parts.filter(([, , h]) => h > 0).map(([key, label, hours]) => ({ key, label, hours, pct: (hours / sum) * 100 }));
}
