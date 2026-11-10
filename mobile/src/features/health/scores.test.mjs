import assert from 'node:assert/strict';
import { durationPoints, baselineOf, recoveryScore, sleepScore, strainFromSamples, strainTarget, strainWord, maxHRFrom, levelOf, sleepNeedFor, MIN_BASELINE_DAYS } from './scores.ts';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const days = (mean, sd, count = 30) => Array.from({ length: count }, (_, i) => mean + (i % 2 ? sd : -sd));   // mean exactly, spread about sd
const base = (m, sd, c) => baselineOf(days(m, sd, c), 1);
const input = (o = {}) => ({ hrv: 60, hrvBaseline: base(60, 8), restingHR: 55, rhrBaseline: base(55, 3), sleepHours: 8, sleepNeed: 8, ...o });

t('baseline: average and spread of your own days, skipping gaps, with a floor on the spread', () => {
  const b = baselineOf([50, 60, null, 70, undefined, NaN, 0], 1); assert.equal(b.n, 3); assert.equal(b.mean, 60); assert.equal(Math.round(b.sd), 10);
  assert.equal(baselineOf([], 1).n, 0); assert.equal(baselineOf([60, 60, 60], 4).sd, 4);          // a very steady person keeps a minimum spread
  assert.equal(baselineOf([42], 2).sd, 2);
});

t('recovery: a normal day with enough sleep is mid-to-good, and it is exactly 50 for the HRV/RHR parts at your normal', () => {
  const r = recoveryScore(input({ sleepHours: 8 }));
  assert.equal(r.ready, true); assert.equal(r.parts.find((p) => p.key === 'hrv').points, 50); assert.equal(r.parts.find((p) => p.key === 'rhr').points, 50);
  assert.equal(r.parts.find((p) => p.key === 'sleep').points, 100); assert.equal(r.score, 63);       // 0.5*50 + 0.25*50 + 0.25*100
  assert.equal(r.level, 'yellow'); assert.equal(r.word, 'Steady');
});

t('recovery: higher HRV, lower resting heart rate and more sleep each raise the score (and never lower it)', () => {
  const s = (o) => recoveryScore(input(o)).score;
  assert.ok(s({ hrv: 75 }) > s({ hrv: 60 }) && s({ hrv: 60 }) > s({ hrv: 45 }));
  assert.ok(s({ restingHR: 50 }) > s({ restingHR: 55 }) && s({ restingHR: 55 }) > s({ restingHR: 62 }));
  assert.ok(s({ sleepHours: 8 }) > s({ sleepHours: 6.5 }) && s({ sleepHours: 6.5 }) > s({ sleepHours: 4 }));
  let prev = -1; for (let h = 30; h <= 100; h += 5) { const v = s({ hrv: h }); assert.ok(v >= prev, `HRV ${h}`); prev = v; }
});

t('recovery: the score stays between 1 and 99 and the level follows it', () => {
  const best = recoveryScore(input({ hrv: 200, restingHR: 35, sleepHours: 9 })), worst = recoveryScore(input({ hrv: 5, restingHR: 100, sleepHours: 0.5 }));
  assert.equal(best.score, 99); assert.equal(best.level, 'green'); assert.equal(worst.score, 1); assert.equal(worst.level, 'red');
  assert.deepEqual([levelOf(67), levelOf(66), levelOf(34), levelOf(33)], ['green', 'yellow', 'yellow', 'red']);
});

t('recovery: a missing reading is left out, not counted as zero; with nothing to go on there is no score', () => {
  const noSleep = recoveryScore(input({ sleepHours: null })); assert.equal(noSleep.ready, true); assert.equal(noSleep.parts.length, 2); assert.equal(noSleep.score, 50);
  const hrvOnly = recoveryScore(input({ restingHR: null, sleepHours: null })); assert.equal(hrvOnly.score, 50); assert.equal(hrvOnly.parts.length, 1);
  assert.equal(recoveryScore(input({ hrv: null, restingHR: null })).ready, false);
});

t('recovery: it learns your normal first (5 days), and says so', () => {
  const fresh = recoveryScore(input({ hrvBaseline: base(60, 5, 3), rhrBaseline: base(55, 2, 3) }));
  assert.equal(fresh.ready, false); assert.equal(fresh.reason, 'calibrating'); assert.equal(fresh.nights, 3); assert.match(fresh.message, /3 of 5/);
  assert.equal(recoveryScore(input({ hrvBaseline: base(60, 5, MIN_BASELINE_DAYS) })).ready, true);
  const none = recoveryScore(input({ hrv: null, restingHR: null, hrvBaseline: baselineOf([], 1), rhrBaseline: baselineOf([], 1) })); assert.equal(none.reason, 'no-data');
});

t('recovery: each part explains itself in plain numbers', () => {
  const r = recoveryScore(input({ hrv: 66, restingHR: 52, sleepHours: 6 }));
  const text = r.parts.map((p) => p.detail).join(' | ');
  assert.match(text, /66 ms, 10% above your 60 ms average/); assert.match(text, /52 bpm, 5% below your 55 bpm average/); assert.match(text, /6\.0 h of the 8 h you need/);
  assert.ok(r.summary.length > 10);
});

t('sleep duration curve: falling short costs more than proportionally', () => {
  assert.equal(durationPoints(8, 8), 100); assert.equal(durationPoints(9, 8), 100); assert.equal(Math.round(durationPoints(6, 8)), 56); assert.equal(Math.round(durationPoints(5, 8)), 39); assert.equal(durationPoints(0, 8), 0);
});

t('sleep score: duration, deep and REM, and unbroken sleep, each shown; without stages it says it is limited', () => {
  const full = sleepScore({ asleepHours: 8, need: 8, deepHours: 1.6, remHours: 1.6, awakeHours: 0.2 });
  assert.equal(full.limited, false); assert.equal(full.parts.length, 3); assert.equal(full.score, 100);
  const short = sleepScore({ asleepHours: 5, need: 8, deepHours: 0.8, remHours: 0.8, awakeHours: 0.8 });
  assert.ok(short.score < 55 && short.level !== 'green', `${short.score}`);   // 5 h of 8 h: 0.6*39 + 0.25*80 + 0.15*65 = 53
  const plain = sleepScore({ asleepHours: 8, need: 8 }); assert.equal(plain.limited, true); assert.equal(plain.score, 100); assert.equal(plain.parts.length, 1);
  assert.equal(sleepScore({ asleepHours: 0, need: 8 }), null); assert.ok(sleepScore({ asleepHours: 9, need: 8 }).score <= 100);
  assert.ok(sleepScore({ asleepHours: 7, need: 8 }).score > sleepScore({ asleepHours: 6, need: 8 }).score);
});

t('strain: nothing hard means zero; an hour of hard work is moderate; a hard 2 hours is high; it never goes above 21', () => {
  const T = 1_700_000_000_000, min = 60_000;
  const rest = Array.from({ length: 24 }, (_, i) => ({ t: T + i * 5 * min, bpm: 62 }));
  assert.equal(strainFromSamples(rest, 55, 190, T + 24 * 5 * min).strain, 0); assert.equal(strainFromSamples([], 55, 190, T).strain, 0);
  // 60 minutes at 160 bpm: reserve = (160-55)/(190-55) = 0.78, which is zone 3 (counts 3 a minute), so 180. Strain = 21 * (1 - e^(-180/260)) = 10.5
  const hard = Array.from({ length: 60 }, (_, i) => ({ t: T + i * min, bpm: 160 }));
  const r = strainFromSamples(hard, 55, 190, T + 60 * min); assert.equal(r.trimp, 180); assert.equal(r.strain, 10.5); assert.equal(r.zoneMinutes[2], 60);
  const max = strainFromSamples(Array.from({ length: 600 }, (_, i) => ({ t: T + i * min, bpm: 195 })), 55, 190, T + 600 * min); assert.ok(max.strain <= 21 && max.strain > 20);   // ten hours all-out reaches the top of the scale and stops
  const twoHours = strainFromSamples(Array.from({ length: 120 }, (_, i) => ({ t: T + i * min, bpm: 185 })), 55, 190, T + 120 * min); assert.equal(twoHours.strain, 18.9);   // 600 trimp: 21 * (1 - e^(-600/260))
});

t('strain: more time or higher intensity always means more strain; long gaps are not counted as exercise', () => {
  const T = 1_700_000_000_000, min = 60_000;
  const at = (bpm, mins) => strainFromSamples(Array.from({ length: mins }, (_, i) => ({ t: T + i * min, bpm })), 55, 190, T + mins * min).strain;
  assert.ok(at(150, 60) > at(150, 30) && at(170, 30) > at(150, 30) && at(185, 30) > at(170, 30));
  const gap = strainFromSamples([{ t: T, bpm: 180 }], 55, 190, T + 5 * 3600_000); assert.equal(gap.zoneMinutes.reduce((a, b) => a + b, 0), 10);   // one sample covers at most 10 minutes
  assert.equal(strainFromSamples([{ t: T, bpm: 0 }, { t: NaN, bpm: 150 }], 55, 190, T + min).strain, 0);
});

t('strain target follows recovery, with words for how hard a day was', () => {
  assert.deepEqual(strainTarget(80), { min: 14, max: 18, label: 'Push' }); assert.deepEqual(strainTarget(50), { min: 9, max: 14, label: 'Maintain' }); assert.deepEqual(strainTarget(20), { min: 4, max: 9, label: 'Recover' }); assert.equal(strainTarget(null), null);
  assert.deepEqual([strainWord(2), strainWord(6), strainWord(11), strainWord(16), strainWord(19)], ['Light', 'Easy', 'Moderate', 'High', 'All out']);
});

t('max heart rate and sleep need use sensible limits', () => {
  assert.equal(maxHRFrom(188), 188); assert.equal(maxHRFrom(250), 210); assert.equal(maxHRFrom(120), 165); assert.equal(maxHRFrom(null, 30), 187); assert.equal(maxHRFrom(null), 190);
  assert.equal(sleepNeedFor(), 8); assert.equal(sleepNeedFor(7), 8); assert.equal(sleepNeedFor(8.7), 8.5); assert.equal(sleepNeedFor(8.9), 9); assert.equal(sleepNeedFor(10), 9);
});
console.log(`${n} checks passed`);
