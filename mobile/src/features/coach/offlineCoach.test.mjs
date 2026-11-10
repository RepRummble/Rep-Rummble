import assert from 'node:assert/strict';
import { LIBRARY, allowedGear, normalizeMuscle, ALL_MUSCLES, byName, CATEGORY_LABEL, GEAR_LABEL, MUSCLE_LABEL } from './exerciseLibrary.ts';
import { generatePlan, ctxOf, isAllowed } from './planGenerator.ts';
import { alternativesFor, searchLibrary, exerciseFromLib, swapExercise, step, moveAt, removeAt, insertAt, replaceAt, libEntryFor, muscleOf, sameExercises } from './planEdit.ts';
import { GOALS, BODY_STYLES, LEVELS, EQUIPMENT, DEFAULT_BRIEF, aiBrief } from './coachLogic.ts';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const keys = (l) => l.map((c) => c.key);
const brief = (o = {}) => ({ ...DEFAULT_BRIEF, goal: 'build_muscle', bodyStyle: 'v_taper', level: 'intermediate', equipment: 'full_gym', daysPerWeek: 4, minutes: 60, ...o });
const sets = (plan, muscles) => plan.days.flatMap((d) => d.exercises).filter((e) => muscles.includes(e.muscle)).reduce((s, e) => s + e.sets, 0);
const ALL_AVOID = ['knee', 'shoulder', 'back', 'wrist', 'impact'];

t('library: 700+ exercises, unique, valid, tagged, short enough for the server, and every muscle has choices', () => {
  assert.ok(LIBRARY.length >= 700, `only ${LIBRARY.length}`);
  assert.equal(new Set(LIBRARY.map((e) => e.id)).size, LIBRARY.length); assert.equal(new Set(LIBRARY.map((e) => e.name.toLowerCase())).size, LIBRARY.length);
  const patterns = ['hpush', 'vpush', 'hpull', 'vpull', 'squat', 'hinge', 'lunge', 'iso', 'core', 'carry', 'cardio'];
  for (const e of LIBRARY) {
    assert.ok(e.name.length <= 60 && e.tip && e.tip.length <= 160, e.name); assert.ok([1, 2, 3].includes(e.level), e.name);
    assert.ok(ALL_MUSCLES.includes(e.muscle) && MUSCLE_LABEL[e.muscle], `${e.name} muscle ${e.muscle}`); assert.ok(GEAR_LABEL[e.gear], `${e.name} gear ${e.gear}`);
    assert.ok(patterns.includes(e.pattern), `${e.name} pattern ${e.pattern}`); assert.ok(CATEGORY_LABEL[e.category], `${e.name} category`); assert.ok(['compound', 'isolation'].includes(e.kind));
    assert.ok(e.stress.every((s) => ['knee', 'shoulder', 'back', 'wrist', 'impact'].includes(s)), e.name);
  }
  assert.ok(LIBRARY.filter((e) => e.curated).length >= 140); assert.ok(LIBRARY.filter((e) => e.category === 'strength').length >= 500);
  for (const m of ALL_MUSCLES) assert.ok(LIBRARY.filter((e) => e.muscle === m).length >= 5, m);
  for (const eq of keys(EQUIPMENT)) for (const m of ['chest', 'back', 'shoulders', 'triceps', 'quads', 'hamstrings', 'glutes', 'abs']) {
    const ok = LIBRARY.filter((e) => e.muscle === m && e.curated && allowedGear(eq).includes(e.gear) && e.level === 1);
    assert.ok(ok.length >= 1, `${eq} has no beginner ${m} exercise`);
  }
  // the database added real variety for the common equipment, not just stretches
  for (const g of ['barbell', 'dumbbell', 'cable', 'machine', 'kettlebell', 'bodyweight']) assert.ok(LIBRARY.filter((e) => e.gear === g && e.category === 'strength').length >= 30, g);
});

t('automatic plans use only strength and conditioning work, never a stretch, plyometric, Olympic or strongman lift', () => {
  for (const b of [brief(), brief({ equipment: 'home_bodyweight', avoid: ['wrist', 'impact'] }), brief({ bodyStyle: 'calisthenics', level: 'advanced' }), brief({ goal: 'lose_fat', equipment: 'kettlebell_bands' })]) {
    for (const e of generatePlan(b).days.flatMap((d) => d.exercises)) assert.ok(['strength', 'cardio'].includes(byName.get(e.name.toLowerCase()).category), e.name);
  }
});

t('EVERY combination of goal, style, level, equipment, days and time builds a valid plan (with and without injuries)', () => {
  let plans = 0, relaxed = 0, exercisesTotal = 0;
  for (const goal of keys(GOALS)) for (const bodyStyle of keys(BODY_STYLES)) for (const level of keys(LEVELS)) for (const equipment of keys(EQUIPMENT))
    for (const daysPerWeek of [2, 3, 4, 5, 6]) for (const minutes of [30, 60, 90]) for (const avoid of [[], ALL_AVOID]) {
      const b = brief({ goal, bodyStyle, level, equipment, daysPerWeek, minutes, avoid });
      const plan = generatePlan(b); plans++;
      const ctx = ctxOf(b); const where = `${goal}/${bodyStyle}/${level}/${equipment}/${daysPerWeek}d/${minutes}m/${avoid.length ? 'avoid' : 'free'}`;
      assert.equal(plan.days.length, daysPerWeek, where); assert.equal(plan.source, 'offline');
      assert.ok(plan.summary.length > 40 && plan.tips.length === 3, where);
      for (const day of plan.days) {
        assert.ok(day.name && day.name.length <= 40 && day.focus.length <= 80, where);
        assert.ok(day.exercises.length >= 3 && day.exercises.length <= 10, `${where} ${day.name} has ${day.exercises.length}`);
        assert.equal(new Set(day.exercises.map((e) => e.name)).size, day.exercises.length, `${where} repeats an exercise in ${day.name}`);
        for (const e of day.exercises) {
          exercisesTotal++;
          const lib = byName.get(e.name.toLowerCase()); assert.ok(lib, `${where}: ${e.name} is not in the library`);
          assert.ok(ctx.gear.includes(lib.gear), `${where}: ${e.name} needs ${lib.gear}`);
          assert.ok(!lib.stress.some((s) => avoid.includes(s)), `${where}: ${e.name} stresses ${lib.stress}`);
          if (!['strength', 'cardio'].includes(lib.category)) assert.fail(`${where}: ${e.name} is a ${lib.category}`);
          if (lib.level > ctx.cap) { relaxed++; assert.equal(lib.level, ctx.cap + 1, where); }
          // The limits the server enforces when a plan is saved.
          assert.ok(e.sets >= 1 && e.sets <= 8 && Number.isInteger(e.sets), where); assert.ok(e.restSec >= 0 && e.restSec <= 300, where);
          if (e.unit === 'sec') { assert.ok(e.reps >= 10 && e.reps <= 300, where); assert.equal(lib.timed, true); } else { assert.ok(e.reps >= 1 && e.reps <= 50 && Number.isInteger(e.reps), `${where} ${e.reps}`); }
          assert.ok(e.tip && e.tip.length <= 160 && e.muscle && e.muscle.length <= 30, where);
        }
      }
      // legs are never skipped when the plan has room for them
      if (daysPerWeek >= 3 && !['calisthenics'].includes(bodyStyle)) assert.ok(sets(plan, ['quads', 'hamstrings', 'glutes']) > 0, `${where} has no leg work`);
    }
  console.log(`   ${plans} plans, ${exercisesTotal} exercises checked; ${((relaxed / exercisesTotal) * 100).toFixed(1)}% needed a harder exercise than the person's level`);
  assert.ok(relaxed / exercisesTotal < 0.12, 'too many exercises above the person’s level');
});

t('equipment is respected: home plans use no equipment, calisthenics only a bar, dumbbell plans only dumbbells', () => {
  const gearsOf = (b) => new Set(generatePlan(b).days.flatMap((d) => d.exercises).map((e) => byName.get(e.name.toLowerCase()).gear));
  assert.deepEqual([...gearsOf(brief({ equipment: 'home_bodyweight', bodyStyle: 'athletic' }))], ['bodyweight']);
  for (const g of gearsOf(brief({ bodyStyle: 'calisthenics' }))) assert.ok(['bodyweight', 'bar'].includes(g), g);
  for (const g of gearsOf(brief({ equipment: 'dumbbells' }))) assert.ok(['dumbbell', 'bodyweight'].includes(g), g);
  for (const g of gearsOf(brief({ equipment: 'kettlebell_bands' }))) assert.ok(['kettlebell', 'band', 'bodyweight'].includes(g), g);
});

t('injuries are respected: nothing that stresses a tick is ever suggested', () => {
  for (const hurt of ALL_AVOID) {
    const plan = generatePlan(brief({ avoid: [hurt], goal: 'lose_fat', bodyStyle: 'athletic' }));
    for (const e of plan.days.flatMap((d) => d.exercises)) assert.ok(!byName.get(e.name.toLowerCase()).stress.includes(hurt), `${e.name} stresses ${hurt}`);
    assert.ok(plan.notes.some((x) => x.startsWith('Left out exercises')));
  }
  const noImpact = generatePlan(brief({ avoid: ['impact'], goal: 'lose_fat', equipment: 'home_bodyweight' }));
  assert.ok(!noImpact.days.flatMap((d) => d.exercises).some((e) => ['Burpee', 'Jumping Jacks', 'High Knees'].includes(e.name)));
});

t('the same answers always give the same plan, and the shuffle gives different exercises', () => {
  const b = brief();
  assert.deepEqual(generatePlan(b), generatePlan(b)); assert.deepEqual(generatePlan(b, 3), generatePlan(b, 3));
  const names = (p) => p.days.flatMap((d) => d.exercises.map((e) => e.name)).join('|');
  assert.notEqual(names(generatePlan(b, 0)), names(generatePlan(b, 1)));
  assert.equal(generatePlan(b, 1).days.length, generatePlan(b, 0).days.length);          // same structure
});

t('a week is balanced: pulling matches pushing, and legs are trained', () => {
  for (const days of [3, 4, 5, 6]) {
    const p = generatePlan(brief({ daysPerWeek: days, bodyStyle: 'athletic' }));
    const push = sets(p, ['chest']), pull = sets(p, ['back']);
    assert.ok(pull >= push * 0.7, `${days} days: ${pull} pull sets vs ${push} push sets`);
    assert.ok(sets(p, ['quads', 'hamstrings', 'glutes']) >= 8, `${days} days: leg sets`);
  }
});

t('body style changes the plan: V-taper favours back and shoulders, glutes-and-legs favours the lower body, powerlifters lead with heavy barbell lifts', () => {
  const vt = generatePlan(brief({ bodyStyle: 'v_taper', daysPerWeek: 5 }));
  assert.ok(sets(vt, ['back', 'shoulders']) > sets(vt, ['chest']) * 1.5, 'v-taper');
  const gl = generatePlan(brief({ bodyStyle: 'glutes_legs', daysPerWeek: 4 }));
  const lower = sets(gl, ['glutes', 'quads', 'hamstrings', 'calves']), all = gl.days.flatMap((d) => d.exercises).reduce((s, e) => s + e.sets, 0);
  assert.ok(lower / all >= 0.55, `glutes+legs share ${(lower / all).toFixed(2)}`);
  assert.ok(gl.days[0].name.includes('Glutes'));
  const pl = generatePlan(brief({ bodyStyle: 'powerlifter', goal: 'get_stronger', daysPerWeek: 4 }));
  const lead = pl.days[1].exercises[0]; assert.equal(byName.get(lead.name.toLowerCase()).gear, 'barbell'); assert.equal(lead.sets, 5); assert.ok(lead.reps <= 5);
  const bb = generatePlan(brief({ bodyStyle: 'bodybuilder', minutes: 45 })), ath = generatePlan(brief({ bodyStyle: 'athletic', minutes: 45, goal: 'build_muscle' }));
  assert.ok(bb.days[0].exercises.length >= ath.days[0].exercises.length, 'bodybuilders get more exercises');
});

t('the goal sets the numbers: strength is heavy and low-rep, fat loss ends with conditioning, endurance is high-rep', () => {
  const st = generatePlan(brief({ goal: 'get_stronger', bodyStyle: 'athletic' })); const first = st.days[0].exercises[0];
  assert.deepEqual([first.sets, first.reps, first.restSec], [5, 5, 150]);
  const fat = generatePlan(brief({ goal: 'lose_fat' }));
  for (const d of fat.days) assert.equal(d.exercises.at(-1).muscle, 'cardio', d.name);
  const end = generatePlan(brief({ goal: 'endurance', bodyStyle: 'functional' }));
  assert.ok(end.days[0].exercises.filter((e) => e.unit === 'reps' && e.muscle !== 'cardio').every((e) => e.reps >= 12));
  const mus = generatePlan(brief({ goal: 'build_muscle', bodyStyle: 'athletic', level: 'intermediate' }));
  const c = mus.days[0].exercises.find((e) => byName.get(e.name.toLowerCase()).kind === 'compound'); assert.ok(c.reps >= 6 && c.reps <= 10, `${c.name} ${c.reps}`);
});

t('level and time matter: beginners get fewer sets, advanced more; shorter sessions have fewer exercises', () => {
  const maxSets = (p) => Math.max(...p.days.flatMap((d) => d.exercises.map((e) => e.sets)));
  assert.ok(maxSets(generatePlan(brief({ level: 'beginner' }))) <= 3); assert.ok(maxSets(generatePlan(brief({ level: 'advanced', goal: 'build_muscle' }))) >= 5);
  const count = (m) => generatePlan(brief({ minutes: m })).days[0].exercises.length;
  assert.ok(count(30) < count(60) && count(60) < count(90), `${count(30)} ${count(60)} ${count(90)}`);
});

t('extra focus adds work for that muscle', () => {
  const base = generatePlan(brief({ bodyStyle: 'athletic', focus: [] })), arms = generatePlan(brief({ bodyStyle: 'athletic', focus: ['arms'] }));
  assert.ok(sets(arms, ['biceps', 'triceps']) > sets(base, ['biceps', 'triceps']), 'arms');
  const glutes = generatePlan(brief({ bodyStyle: 'athletic', focus: ['glutes'] })); assert.ok(sets(glutes, ['glutes']) > sets(base, ['glutes']), 'glutes');
});

t('editing: stepping sets, reps and rest stays inside the limits', () => {
  const e = { name: 'Squat', sets: 8, reps: 50, unit: 'reps', restSec: 300 };
  assert.equal(step(e, 'sets', 1).sets, 8); assert.equal(step(e, 'reps', 1).reps, 50); assert.equal(step(e, 'restSec', 1).restSec, 300);
  const low = { name: 'Squat', sets: 1, reps: 1, unit: 'reps', restSec: 0 };
  assert.deepEqual([step(low, 'sets', -1).sets, step(low, 'reps', -1).reps, step(low, 'restSec', -1).restSec], [1, 1, 0]);
  const hold = { name: 'Plank', sets: 3, reps: 30, unit: 'sec', restSec: 30 };
  assert.equal(step(hold, 'reps', 1).reps, 35); assert.equal(step({ ...hold, reps: 10 }, 'reps', -1).reps, 10); assert.equal(step(hold, 'restSec', 1).restSec, 45);
  assert.equal(step(e, 'sets', -1).sets, 7);
});

t('editing: swaps offer similar exercises the person can do, never the same one or ones already in the workout', () => {
  const b = brief({ equipment: 'dumbbells', avoid: ['knee'] }); const ctx = ctxOf(b);
  const bench = { name: 'Dumbbell Bench Press', muscle: 'chest', sets: 4, reps: 8, unit: 'reps', restSec: 90 };
  const alts = alternativesFor(bench, ctx, ['Push-up']);
  assert.ok(alts.length >= 3); assert.ok(alts.every((a) => a.muscle === 'chest' && ctx.gear.includes(a.gear) && a.name !== bench.name && a.name !== 'Push-up'));
  assert.equal(alts[0].pattern, 'hpush');                                             // same movement first
  const kneeSwap = alternativesFor({ name: 'Back Squat', muscle: 'quads', sets: 3, reps: 8, unit: 'reps', restSec: 90 }, ctx);
  assert.ok(kneeSwap.every((a) => !a.stress.includes('knee')));
  assert.deepEqual(alternativesFor({ name: 'Mystery move', muscle: 'spleen', sets: 3, reps: 8, unit: 'reps', restSec: 60 }, ctx), []);
  assert.equal(alternativesFor({ name: 'Mystery move', muscle: 'lats', sets: 3, reps: 8, unit: 'reps', restSec: 60 }, ctx)[0].muscle, 'back');   // an AI exercise is matched by muscle
  assert.equal(muscleOf({ name: 'Plank (seconds)' }), 'abs'); assert.equal(libEntryFor({ name: 'Plank (seconds)' }).name, 'Plank'); assert.equal(normalizeMuscle('Quadriceps'), 'quads');
});

t('editing: a swap keeps the sets and rest you chose; adding from the library fits your goal', () => {
  const ctx = ctxOf(brief({ goal: 'get_toned', equipment: 'full_gym' })); const old = { name: 'Barbell Curl', muscle: 'biceps', sets: 5, reps: 8, unit: 'reps', restSec: 45 };
  const sw = swapExercise(old, byName.get('hammer curl'), ctx); assert.deepEqual([sw.name, sw.sets, sw.restSec], ['Hammer Curl', 5, 45]); assert.equal(sw.reps, 15);
  const add = exerciseFromLib(byName.get('plank'), ctx); assert.equal(add.unit, 'sec');
  const found = searchLibrary('curl', ctx, 'biceps', ['Hammer Curl']); assert.ok(found.length >= 4 && found.every((e) => e.muscle === 'biceps' && e.name !== 'Hammer Curl'));
  assert.ok(searchLibrary('', ctx, 'all').length > 20); assert.deepEqual(searchLibrary('zzzz', ctx), []);
  const home = ctxOf(brief({ equipment: 'home_bodyweight' })); assert.ok(searchLibrary('', home, 'all', [], 200).every((e) => e.gear === 'bodyweight'));
});

t('editing: reorder, remove, insert and replace are exact and never mutate', () => {
  const a = ['x', 'y', 'z']; assert.deepEqual(moveAt(a, 0, 1), ['y', 'x', 'z']); assert.deepEqual(moveAt(a, 0, -1), a); assert.deepEqual(moveAt(a, 2, 1), a);
  assert.deepEqual(removeAt(a, 1), ['x', 'z']); assert.deepEqual(insertAt(a, 1, 'q'), ['x', 'q', 'y', 'z']); assert.deepEqual(replaceAt(a, 2, 'w'), ['x', 'y', 'w']); assert.deepEqual(a, ['x', 'y', 'z']);
  assert.equal(sameExercises([{ name: 'a' }], [{ name: 'a' }]), true); assert.equal(sameExercises([{ name: 'a' }], [{ name: 'b' }]), false);
});

t('what the AI is told: the avoid list joins the note, within the length the server keeps', () => {
  const b = aiBrief(brief({ avoid: ['knee', 'wrist'], notes: 'no jumping' })); assert.match(b.notes, /knee, wrist/); assert.match(b.notes, /no jumping/); assert.ok(b.notes.length <= 200); assert.equal('avoid' in b, false);
  assert.ok(aiBrief(brief({ avoid: ALL_AVOID, notes: 'x'.repeat(300) })).notes.length === 200);
  assert.equal(aiBrief(brief()).notes, '');
});
console.log(`${n} checks passed`);
