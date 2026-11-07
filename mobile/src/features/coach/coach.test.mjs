import assert from 'node:assert/strict';
import { briefReady, briefSummary, DEFAULT_BRIEF, suggestWeekdays, aiErrorMessage, GOALS, BODY_STYLES, labelOf } from './coachLogic.ts';
import { TEMPLATES, routineToTemplate, templateToRoutineInput, routinesFor, weekdaysLabel, estimateMinutes, CATEGORY_LABELS } from '../train/trainLogic.ts';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('the coach needs a goal and a body style first', () => {
  assert.equal(briefReady(DEFAULT_BRIEF), false); assert.equal(briefReady({ ...DEFAULT_BRIEF, goal: 'build_muscle' }), false);
  assert.equal(briefReady({ ...DEFAULT_BRIEF, goal: 'build_muscle', bodyStyle: 'v_taper' }), true);
  assert.equal(briefSummary({ ...DEFAULT_BRIEF, goal: 'build_muscle', bodyStyle: 'v_taper' }), 'Build muscle · V-taper · 4 days a week');
  assert.equal(labelOf(GOALS, 'lose_fat'), 'Lose fat'); assert.equal(labelOf(BODY_STYLES, 'zzz'), '');
});
t('training days are spread so rest days fall between them', () => {
  assert.deepEqual(suggestWeekdays(3), [1, 3, 5]); assert.equal(suggestWeekdays(6).length, 6); assert.deepEqual(suggestWeekdays(99).length, 6); assert.equal(suggestWeekdays(0).length, 1);
  for (let k = 2; k <= 6; k++) assert.equal(new Set(suggestWeekdays(k)).size, k);
});
t('AI errors are honest: down, over allowance, or offline', () => {
  assert.match(aiErrorMessage(503, 'ai_unavailable'), /Nothing was used/); assert.match(aiErrorMessage(429, 'quota_exceeded', 'Used 3 of 3'), /Used 3 of 3/); assert.match(aiErrorMessage(undefined, undefined), /connection/);
});
t('the library is much bigger, every workout is usable, and ids are unique', () => {
  assert.ok(TEMPLATES.length >= 16, `only ${TEMPLATES.length}`);
  assert.equal(new Set(TEMPLATES.map((x) => x.id)).size, TEMPLATES.length);
  for (const x of TEMPLATES) {
    assert.ok(x.exercises.length >= 4, x.id); assert.ok(x.category && CATEGORY_LABELS[x.category], x.id);
    for (const e of x.exercises) assert.ok(e.sets >= 1 && e.reps >= 1 && e.rest >= 0 && e.name, `${x.id}/${e.name}`);
    const m = estimateMinutes(x); assert.ok(m >= 10 && m <= 90, `${x.id} ${m}`);
  }
  for (const c of ['strength', 'bodyweight', 'conditioning', 'mobility']) assert.ok(TEMPLATES.some((x) => x.category === c), c);
});
t('a saved workout runs in the player: timed holds keep "(seconds)", weights start unknown', () => {
  const tpl = routineToTemplate({ _id: 'r1', name: 'Pull', focus: 'Back', weekdays: [1], source: 'coach', exercises: [{ name: 'Pull-up', sets: 4, reps: 8, unit: 'reps', restSec: 90 }, { name: 'Plank', sets: 3, reps: 45, unit: 'sec', restSec: 30 }] });
  assert.equal(tpl.id, 'r1'); assert.deepEqual(tpl.exercises[0], { name: 'Pull-up', sets: 4, reps: 8, rest: 90, startWeight: 0 }); assert.equal(tpl.exercises[1].name, 'Plank (seconds)');
});
t('a built-in workout saves back into My workouts without losing its holds', () => {
  const core = TEMPLATES.find((x) => x.id === 'core'); const input = templateToRoutineInput(core);
  assert.equal(input.source, 'template'); const plank = input.exercises.find((e) => e.name === 'Plank');
  assert.deepEqual([plank.unit, plank.reps], ['sec', 45]); assert.ok(input.exercises.every((e) => !e.name.includes('(seconds)')));
  assert.equal(routineToTemplate({ _id: 'x', ...input, weekdays: [] }).exercises.find((e) => e.name.startsWith('Plank')).name, 'Plank (seconds)');   // round trip
});
t('today’s plan is the workouts scheduled for this weekday', () => {
  const r = (id, weekdays) => ({ _id: id, name: id, focus: '', exercises: [], weekdays, source: 'manual' });
  assert.deepEqual(routinesFor([r('a', [1, 4]), r('b', [2]), r('c', [])], 1).map((x) => x._id), ['a']); assert.deepEqual(routinesFor([r('a', [1])], 0), []);
  assert.equal(weekdaysLabel([]), 'Not scheduled'); assert.equal(weekdaysLabel([5, 1, 3]), 'Mon · Wed · Fri'); assert.equal(weekdaysLabel([0, 1, 2, 3, 4, 5, 6]), 'Every day'); assert.equal(weekdaysLabel([0, 6]), 'Sat · Sun');
});
console.log(`${n} checks passed`);
