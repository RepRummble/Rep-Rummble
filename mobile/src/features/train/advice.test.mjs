import assert from 'node:assert/strict';
import { adviceFor, lighterVersion, totalSets, RECOVERY_TEMPLATE_ID } from './adviceLogic.ts';
import { TEMPLATES } from './trainLogic.ts';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('advice follows recovery, and there is none without a score', () => {
  assert.equal(adviceFor(null), null);
  const g = adviceFor(80), y = adviceFor(50), r = adviceFor(20);
  assert.deepEqual([g.level, g.suggested, g.target.label], ['green', 'as-planned', 'Push']);
  assert.deepEqual([y.level, y.suggested, y.target.label], ['yellow', 'as-planned', 'Maintain']);
  assert.deepEqual([r.level, r.suggested, r.target.label], ['red', 'lighter', 'Recover']);
  assert.match(y.detail, /2 reps before failure/); assert.match(r.detail, /mobility/);
  assert.equal(adviceFor(67).level, 'green'); assert.equal(adviceFor(66).level, 'yellow'); assert.equal(adviceFor(33).level, 'red');
});

t('a lighter workout has about 30% fewer sets, never below 2, and everything else the same', () => {
  for (const tpl of TEMPLATES) {
    const light = lighterVersion(tpl);
    assert.equal(light.exercises.length, tpl.exercises.length); assert.equal(light.name, `${tpl.name} (lighter)`); assert.notEqual(light.id, tpl.id);
    light.exercises.forEach((e, i) => { const o = tpl.exercises[i]; assert.equal(e.name, o.name); assert.equal(e.reps, o.reps); assert.equal(e.rest, o.rest); assert.ok(e.sets <= o.sets && (o.sets <= 1 ? e.sets === o.sets : e.sets >= 2), `${tpl.id}/${o.name}`); });
    assert.ok(totalSets(light) <= totalSets(tpl)); 
  }
  const push = TEMPLATES.find((x) => x.id === 'push'); const lp = lighterVersion(push);
  assert.ok(totalSets(lp) / totalSets(push) <= 0.8 && totalSets(lp) / totalSets(push) >= 0.55, `${totalSets(lp)}/${totalSets(push)}`);
  assert.deepEqual(lp.exercises.map((e) => e.sets), [0, 1, 2, 3, 4].map((x, i) => Math.max(2, Math.round(push.exercises[i].sets * 0.7))));
});

t('the original workout is never changed, and a one-set exercise stays one set', () => {
  const tpl = { id: 'x', name: 'X', focus: '', icon: '', exercises: [{ name: 'A', sets: 1, reps: 5, rest: 60, startWeight: 0 }, { name: 'B', sets: 5, reps: 5, rest: 60, startWeight: 0 }] };
  const copy = JSON.stringify(tpl); const l = lighterVersion(tpl);
  assert.equal(JSON.stringify(tpl), copy); assert.deepEqual(l.exercises.map((e) => e.sets), [1, 4]);
});

t('the gentle session for a low-recovery day exists in the library', () => {
  const m = TEMPLATES.find((x) => x.id === RECOVERY_TEMPLATE_ID); assert.ok(m); assert.equal(m.category, 'mobility');
});
console.log(`${n} checks passed`);
