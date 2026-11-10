import assert from 'node:assert/strict';
import { assembleReadiness, deviceReadingsFrom } from './readiness.ts';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const NOW = new Date('2026-11-10T15:00:00Z');
const key = (i) => new Date(Date.UTC(2026, 9, 11 + i)).toISOString().slice(0, 10);
const days = (count, f) => Array.from({ length: count }, (_, i) => ({ date: key(i), hrv: null, restingHR: null, sleepHours: null, ...f(i, count) }));
// a steady month: HRV 60 +/- 6, resting heart rate 55 +/- 2, 7.5 h of sleep; today is whatever `today` says
const month = (today = {}) => days(31, (i, c) => i === c - 1 ? { hrv: 60, restingHR: 55, sleepHours: 8, ...today } : { hrv: 60 + (i % 2 ? 6 : -6), restingHR: 55 + (i % 2 ? 2 : -2), sleepHours: 7.5 });
const inputs = (over = {}) => ({ days: month(), night: { asleep: 8, deep: 1.5, rem: 1.7, awake: 0.3 }, hrSamples: [], observedMaxHR: 188, ...over });
const hr = (bpm, mins) => Array.from({ length: mins }, (_, i) => ({ t: NOW.getTime() - (mins - i) * 60000, bpm }));

t('a steady month and a normal night give a mid-to-good recovery, led by our own score', () => {
  const r = assembleReadiness(inputs(), {}, NOW);
  assert.equal(r.own.ready, true); assert.equal(r.headline.source, 'reprummble'); assert.ok(r.headline.score >= 55 && r.headline.score <= 75, `${r.headline.score}`);
  assert.equal(r.sleepNeed, 8); assert.ok(r.sleep.score > 80 && r.sleep.limited === false);
  assert.deepEqual([r.target.label], [r.headline.level === 'green' ? 'Push' : r.headline.level === 'yellow' ? 'Maintain' : 'Recover']);
});

t('a great night lifts it and a bad one drops it, using the same history', () => {
  const great = assembleReadiness(inputs({ days: month({ hrv: 78, restingHR: 51, sleepHours: 8.5 }), night: { asleep: 8.5, deep: 1.8, rem: 2, awake: 0.2 } }), {}, NOW);
  const bad = assembleReadiness(inputs({ days: month({ hrv: 42, restingHR: 62, sleepHours: 4.5 }), night: { asleep: 4.5, deep: 0.4, rem: 0.6, awake: 1 } }), {}, NOW);
  assert.equal(great.headline.level, 'green'); assert.equal(bad.headline.level, 'red'); assert.ok(great.headline.score - bad.headline.score > 50);
  assert.equal(bad.target.label, 'Recover');
});

t('a new user is told it is learning their normal, and there is no made-up score', () => {
  const fresh = assembleReadiness(inputs({ days: days(31, (i, c) => i >= c - 3 ? { hrv: 55, restingHR: 58, sleepHours: 7 } : {}) }), {}, NOW);
  assert.equal(fresh.own.ready, false); assert.equal(fresh.own.reason, 'calibrating'); assert.equal(fresh.headline, null); assert.equal(fresh.target, null);
  assert.ok(fresh.sleep, 'sleep is still scored without a baseline');
  const nothing = assembleReadiness({ days: days(31, () => ({})), night: null, hrSamples: [], observedMaxHR: null }, {}, NOW);
  assert.equal(nothing.headline, null); assert.equal(nothing.sleep, null); assert.equal(nothing.strain, null);
});

t('a WHOOP or Oura recovery leads when you wear one, and ours is kept alongside it', () => {
  const r = assembleReadiness(inputs(), { recovery: { value: 81.4, source: 'whoop' }, strain: { value: 12.4, source: 'whoop' } }, NOW);
  assert.deepEqual([r.headline.score, r.headline.level, r.headline.source], [81, 'green', 'whoop']); assert.equal(r.target.label, 'Push'); assert.equal(r.own.ready, true); assert.equal(r.device.strain.value, 12.4);
  const only = assembleReadiness(inputs({ days: days(31, () => ({})), night: null }), { recovery: { value: 30, source: 'oura' } }, NOW);
  assert.deepEqual([only.headline.source, only.headline.level], ['oura', 'red']);   // with no watch data of our own, the device still gives a headline
});

t('a night with no stage data is scored on duration alone and says so', () => {
  const r = assembleReadiness(inputs({ night: { asleep: 7, deep: 0, rem: 0, awake: 0 } }), {}, NOW);
  assert.equal(r.sleep.limited, true); assert.equal(r.sleep.parts.length, 1);
});

t('strain comes from today’s heart rate, and is absent when there is too little', () => {
  const none = assembleReadiness(inputs({ hrSamples: hr(150, 3) }), {}, NOW); assert.equal(none.strain, null);
  const hard = assembleReadiness(inputs({ hrSamples: hr(165, 45) }), {}, NOW); assert.ok(hard.strain.strain > 5 && hard.strain.strain < 14, `${hard.strain.strain}`); assert.equal(hard.strain.maxHR, 188);
  const harder = assembleReadiness(inputs({ hrSamples: hr(165, 90) }), {}, NOW); assert.ok(harder.strain.strain > hard.strain.strain);
});

t('sleep need follows your own average when it is clearly above 8 hours', () => {
  const longSleeper = assembleReadiness(inputs({ days: days(31, (i, c) => ({ hrv: 60 + (i % 2 ? 5 : -5), restingHR: 55, sleepHours: i === c - 1 ? 9 : 9 })) }), {}, NOW);
  assert.equal(longSleeper.sleepNeed, 9);
});

t('the newest device readings are picked from the server summary', () => {
  const d = deviceReadingsFrom([{ date: '2026-11-08', recovery: { value: 40, source: 'whoop' } }, { date: '2026-11-10', recovery: { value: 70, source: 'whoop' }, strain: { value: 9.1, source: 'whoop' } }, { date: '2026-11-09' }]);
  assert.equal(d.recovery.value, 70); assert.equal(d.strain.value, 9.1); assert.deepEqual(deviceReadingsFrom([]), {}); assert.deepEqual(deviceReadingsFrom([{ date: '2026-11-10' }]), {});
});
console.log(`${n} checks passed`);
