// The offline coach: builds a week of workouts from the exercise library with fixed rules. No network, no AI, same answers
// give the same plan. A "seed" changes the picks so a person can shuffle for a different set of exercises.

import type { RoutineExercise } from '../train/trainLogic';
import { BY_MUSCLE, CURATED_BY_MUSCLE, PLANNABLE, allowedGear, type LibExercise, type Gear, type Kind, type Muscle, type Pattern, type Stress } from './exerciseLibrary';
import type { Brief } from './coachLogic';

export interface PlanDay { name: string; focus: string; exercises: RoutineExercise[] }
export interface OfflinePlan { summary: string; days: PlanDay[]; tips: string[]; source: 'offline'; notes: string[] }

interface Slot { m: Muscle; k?: Kind; p?: Pattern; boost?: boolean }
const C: Kind = 'compound', I: Kind = 'isolation';
const s = (m: Muscle, k?: Kind, p?: Pattern): Slot => ({ m, k, p });

interface DayType { name: string; focus: string; slots: Slot[] }
export const DAY_TYPES: Record<string, DayType> = {
  push: { name: 'Push', focus: 'Chest, shoulders, triceps', slots: [s('chest', C, 'hpush'), s('shoulders', C, 'vpush'), s('chest', I), s('triceps', I), s('shoulders', I), s('chest', C, 'hpush'), s('triceps', C), s('abs', I)] },
  pull: { name: 'Pull', focus: 'Back, rear shoulders, biceps', slots: [s('back', C, 'vpull'), s('back', C, 'hpull'), s('back', I), s('shoulders', I), s('biceps', I), s('back', C, 'hpull'), s('biceps', I), s('abs', I)] },
  legs: { name: 'Legs', focus: 'Quads, hamstrings, glutes, calves', slots: [s('quads', C, 'squat'), s('hamstrings', C, 'hinge'), s('quads', C, 'lunge'), s('hamstrings', I), s('glutes', I), s('calves', I), s('quads', I), s('abs', I)] },
  upper: { name: 'Upper body', focus: 'Chest, back, shoulders, arms', slots: [s('chest', C, 'hpush'), s('back', C, 'hpull'), s('shoulders', C, 'vpush'), s('back', C, 'vpull'), s('biceps', I), s('triceps', I), s('shoulders', I), s('chest', I), s('back', I)] },
  lower: { name: 'Lower body', focus: 'Legs and glutes', slots: [s('quads', C, 'squat'), s('hamstrings', C, 'hinge'), s('glutes', C), s('quads', C, 'lunge'), s('hamstrings', I), s('calves', I), s('quads', I), s('abs', I)] },
  fullA: { name: 'Full body A', focus: 'Squat day, with pushing and pulling', slots: [s('quads', C, 'squat'), s('chest', C, 'hpush'), s('back', C, 'hpull'), s('shoulders', C, 'vpush'), s('hamstrings', I), s('biceps', I), s('triceps', I), s('abs', I), s('calves', I)] },
  fullB: { name: 'Full body B', focus: 'Hinge day, with pulling and pressing', slots: [s('hamstrings', C, 'hinge'), s('back', C, 'vpull'), s('chest', C, 'hpush'), s('shoulders', I), s('glutes', C), s('triceps', I), s('biceps', I), s('abs', I), s('calves', I)] },
  fullC: { name: 'Full body C', focus: 'Lunge day, with pressing and rowing', slots: [s('quads', C, 'lunge'), s('chest', C, 'hpush'), s('back', C, 'hpull'), s('shoulders', C, 'vpush'), s('glutes', I), s('chest', I), s('back', I), s('abs', I), s('quads', I)] },
  glutesHams: { name: 'Glutes and hamstrings', focus: 'Posterior chain', slots: [s('glutes', C, 'hinge'), s('hamstrings', C, 'hinge'), s('glutes', I), s('hamstrings', I), s('quads', C, 'lunge'), s('glutes', C, 'hinge'), s('calves', I), s('abs', I)] },
  quadsGlutes: { name: 'Quads and glutes', focus: 'Squats, lunges and glute work', slots: [s('quads', C, 'squat'), s('quads', C, 'lunge'), s('glutes', C), s('quads', I), s('glutes', I), s('hamstrings', I), s('calves', I), s('abs', I)] },
  glutesCore: { name: 'Glutes and core', focus: 'Glutes, hamstrings and abs', slots: [s('glutes', C, 'hinge'), s('glutes', I), s('hamstrings', I), s('quads', C, 'lunge'), s('abs', I), s('abs', I), s('calves', I)] },
};

const SPLITS: Record<number, string[]> = {
  2: ['fullA', 'fullB'], 3: ['fullA', 'fullB', 'fullC'], 4: ['upper', 'lower', 'upper', 'lower'],
  5: ['push', 'pull', 'legs', 'upper', 'lower'], 6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
};
const GLUTE_SPLITS: Record<number, string[]> = {
  2: ['glutesHams', 'fullA'], 3: ['glutesHams', 'upper', 'quadsGlutes'], 4: ['glutesHams', 'upper', 'quadsGlutes', 'glutesCore'],
  5: ['glutesHams', 'push', 'quadsGlutes', 'pull', 'glutesCore'], 6: ['glutesHams', 'push', 'quadsGlutes', 'pull', 'glutesCore', 'upper'],
};

const FOCUS_MUSCLES: Record<string, Muscle[]> = { chest: ['chest'], back: ['back'], shoulders: ['shoulders'], arms: ['biceps', 'triceps'], abs: ['abs'], glutes: ['glutes'], legs: ['quads', 'hamstrings'] };
const LEVEL_CAP: Record<string, 1 | 2 | 3> = { beginner: 1, intermediate: 2, advanced: 3 };
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** A small stable number from text, so "random" choices repeat exactly for the same inputs. */
function hash(text: string): number { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 1000 / 1000; }

export interface Ctx { gear: Gear[]; cap: 1 | 2 | 3; avoid: Stress[]; level: string; style: string; goal: string }

export function ctxOf(b: Pick<Brief, 'equipment' | 'level' | 'avoid' | 'goal' | 'bodyStyle'>): Ctx {
  return { gear: allowedGear(b.equipment, b.bodyStyle), cap: LEVEL_CAP[b.level] ?? 1, avoid: (b.avoid ?? []) as Stress[], level: b.level, style: b.bodyStyle ?? '', goal: b.goal ?? 'general_fitness' };
}

export const isAllowed = (e: LibExercise, ctx: Ctx, cap: number = ctx.cap) => ctx.gear.includes(e.gear) && e.level <= cap && !e.stress.some((x) => ctx.avoid.includes(x));

/** Gear a style leans on, best first. */
function gearOrder(ctx: Ctx): Gear[] {
  if (ctx.level === 'beginner') return ['machine', 'dumbbell', 'cable', 'bodyweight', 'kettlebell', 'band', 'bar', 'barbell'];
  switch (ctx.style) {
    case 'powerlifter': return ['barbell', 'machine', 'dumbbell', 'cable', 'bar', 'bodyweight', 'kettlebell', 'band'];
    case 'bodybuilder': return ['dumbbell', 'cable', 'machine', 'barbell', 'bar', 'bodyweight', 'kettlebell', 'band'];
    case 'athletic': case 'functional': return ['kettlebell', 'dumbbell', 'barbell', 'bar', 'bodyweight', 'cable', 'machine', 'band'];
    case 'calisthenics': return ['bar', 'bodyweight'];
    default: return ['barbell', 'dumbbell', 'cable', 'machine', 'bar', 'bodyweight', 'kettlebell', 'band'];
  }
}

function pickFor(slot: Slot, ctx: Ctx, planUsed: Set<string>, dayUsed: Set<string>, seed: number, salt: string): LibExercise | null {
  const order = gearOrder(ctx);
  const tiers: ((e: LibExercise) => boolean)[] = [
    (e) => e.muscle === slot.m && (!slot.k || e.kind === slot.k) && (!slot.p || e.pattern === slot.p),
    (e) => e.muscle === slot.m && (!slot.k || e.kind === slot.k),
    (e) => e.muscle === slot.m && (!slot.p || e.pattern === slot.p),
    (e) => e.muscle === slot.m,
  ];
  for (const cap of [ctx.cap, Math.min(3, ctx.cap + 1)]) {
    for (const match of tiers) {
      const ok = (e: LibExercise) => match(e) && isAllowed(e, ctx, cap) && !dayUsed.has(e.name);
      // Our hand-picked exercises first. The database's are used only when none of ours fit (strict injuries, little equipment).
      let pool = (CURATED_BY_MUSCLE.get(slot.m) ?? []).filter(ok);
      if (!pool.length) pool = (BY_MUSCLE.get(slot.m) ?? []).filter((e) => PLANNABLE.includes(e.category) && ok(e));
      if (!pool.length) continue;
      let best = pool[0], bestScore = -Infinity;
      for (const e of pool) {
        const g = order.indexOf(e.gear);
        const score = (order.length - (g < 0 ? order.length : g)) * 2 - Math.abs(e.level - ctx.cap) * 3 - (planUsed.has(e.name) ? 6 : 0) + hash(`${e.id}|${seed}|${salt}`) * 0.9;
        if (score > bestScore) { bestScore = score; best = e; }
      }
      return best;
    }
  }
  return null;
}

interface Rx { sets: number; reps: number; rest: number }
const BASE: Record<string, { comp: Rx; iso: Rx }> = {
  build_muscle: { comp: { sets: 4, reps: 8, rest: 90 }, iso: { sets: 3, reps: 12, rest: 60 } },
  lose_fat: { comp: { sets: 3, reps: 12, rest: 60 }, iso: { sets: 3, reps: 15, rest: 45 } },
  get_toned: { comp: { sets: 3, reps: 12, rest: 60 }, iso: { sets: 3, reps: 15, rest: 45 } },
  get_stronger: { comp: { sets: 3, reps: 6, rest: 120 }, iso: { sets: 3, reps: 10, rest: 75 } },
  endurance: { comp: { sets: 3, reps: 15, rest: 45 }, iso: { sets: 3, reps: 20, rest: 30 } },
  general_fitness: { comp: { sets: 3, reps: 10, rest: 75 }, iso: { sets: 3, reps: 12, rest: 60 } },
};

export interface RxOpts { goal: string; level: string; style: string; first?: boolean; boost?: boolean }

/** Sets, reps and rest for one exercise, from the goal, the person's level and the style. Always within what the server accepts. */
export function prescribe(e: LibExercise, o: RxOpts): RoutineExercise {
  const base = BASE[o.goal] ?? BASE.general_fitness;
  const lightHold = o.level === 'beginner' ? 30 : o.level === 'advanced' ? 50 : 40;

  if (e.timed && e.category === 'stretch') return { name: e.name, muscle: e.muscle, sets: 2, reps: 30, unit: 'sec', restSec: 15, tip: e.tip };
  if (e.timed) {
    const cardio = e.muscle === 'cardio';
    return { name: e.name, muscle: e.muscle, sets: cardio && (o.goal === 'endurance' || o.goal === 'lose_fat') ? 4 : 3, reps: cardio ? 40 : lightHold, unit: 'sec', restSec: cardio ? 20 : 30, tip: e.tip };
  }
  if (e.muscle === 'cardio') return { name: e.name, muscle: e.muscle, sets: 3, reps: 10, unit: 'reps', restSec: 30, tip: e.tip };
  if (e.category === 'olympic') return { name: e.name, muscle: e.muscle, sets: 5, reps: 3, unit: 'reps', restSec: 120, tip: e.tip };   // heavy, few reps, long rest
  if (e.category === 'plyo') return { name: e.name, muscle: e.muscle, sets: 3, reps: 8, unit: 'reps', restSec: 45, tip: e.tip };
  if (e.category === 'strongman') return { name: e.name, muscle: e.muscle, sets: 4, reps: 5, unit: 'reps', restSec: 120, tip: e.tip };

  let rx: Rx = { ...(e.kind === 'compound' ? base.comp : base.iso) };
  if (e.kind === 'compound' && o.first) {
    if (o.goal === 'get_stronger') rx = { sets: 5, reps: 5, rest: 150 };
    if (o.style === 'powerlifter') rx = { sets: 5, reps: 4, rest: 180 };
  } else if (e.kind === 'compound' && o.style === 'powerlifter') rx = { sets: 4, reps: 6, rest: 120 };
  if (o.style === 'bodybuilder' && e.kind === 'isolation') rx.sets = 4;
  if (e.kind === 'compound' && (e.gear === 'bodyweight' || e.gear === 'bar')) rx.reps = o.goal === 'get_stronger' ? 6 : Math.max(6, rx.reps + 2);

  if (o.level === 'beginner') rx.sets = Math.min(rx.sets, 3);
  else if (o.level === 'advanced' && o.first && e.kind === 'compound') rx.sets += 1;
  if (o.boost) rx.sets += 1;
  return { name: e.name, muscle: e.muscle, sets: clamp(rx.sets, 1, 6), reps: clamp(rx.reps, 1, 50), unit: 'reps', restSec: clamp(rx.rest, 0, 300), tip: e.tip };
}

function slotsFor(type: DayType, b: Brief, n: number): Slot[] {
  let slots = type.slots.map((x) => ({ ...x }));
  const has = (m: Muscle) => slots.some((x) => x.m === m);
  const style = b.bodyStyle ?? '';
  const insert = (i: number, slot: Slot) => slots.splice(Math.min(i, slots.length), 0, slot);

  if (style === 'v_taper') {
    if (has('chest') && has('shoulders')) insert(2, { m: 'shoulders', k: I });
    if (has('back') && !has('chest')) insert(2, { m: 'back', k: I });
  }
  if (style === 'functional') insert(3, { m: 'abs', p: 'carry' });
  for (const f of b.focus) {
    for (const m of FOCUS_MUSCLES[f] ?? []) if (has(m)) insert(3, { m, k: I, boost: true });
  }

  let count = clamp(Math.round(b.minutes / 9), 3, 9);
  if (style === 'bodybuilder') count = Math.min(9, count + 1);
  if (b.level === 'beginner') count = Math.min(count, 7);
  const finisher = ['lose_fat', 'endurance', 'get_toned'].includes(b.goal ?? '') || ['athletic', 'lean_toned'].includes(style);
  slots = slots.slice(0, finisher ? count - 1 : count);
  if (finisher) slots.push({ m: 'cardio', k: C });
  return slots;
}

const SPLIT_NAME = (days: number, glutes: boolean) => glutes ? 'glute-focused' : days <= 3 ? 'full-body' : days === 4 ? 'upper/lower' : days === 5 ? 'push/pull/legs plus upper/lower' : 'push/pull/legs, twice a week';
const GOAL_PHRASE: Record<string, string> = { build_muscle: 'build muscle', lose_fat: 'burn fat while keeping your muscle', get_toned: 'get lean and toned', get_stronger: 'get stronger', endurance: 'build endurance', general_fitness: 'get fitter all round' };
const REP_LINE: Record<string, string> = {
  build_muscle: 'Main lifts are 6 to 10 reps with 90 seconds of rest; the rest is 10 to 15 reps.',
  lose_fat: 'Reps are 12 to 15 with short rests, and each session ends with conditioning.',
  get_toned: 'Reps are 12 to 15 with short rests, finished with conditioning.',
  get_stronger: 'Your first lift each day is 5 sets of 5 with long rests; the rest are 6 to 10 reps.',
  endurance: 'Reps are 15 to 20 with short rests, finished with conditioning.',
  general_fitness: 'Reps are 10 to 12 with a minute or so of rest.',
};
const STYLE_LINE: Record<string, string> = {
  bodybuilder: 'Extra isolation work builds a full, muscular look.', v_taper: 'Extra back and shoulder work builds the V-taper.', athletic: 'Carries and conditioning keep you fast and athletic.',
  lean_toned: 'Higher reps and short rests keep you lean and defined.', glutes_legs: 'Glute and leg work comes first.', powerlifter: 'Heavy, low-rep squat, press and deadlift variations lead each day.',
  calisthenics: 'Only bodyweight movements, with a pull-up bar.', functional: 'Carries, lunges and core work build capable, all-round strength.',
};
const TIPS: Record<string, string[]> = {
  build_muscle: ['Add a little weight or one more rep each week. That is how muscle grows.', 'Eat enough protein, around 1.6 to 2.2 g per kg of body weight.', 'Sleep 7 to 9 hours: growth happens while you rest.'],
  lose_fat: ['Keep lifting heavy enough to hold on to your muscle while you diet.', 'A small, steady calorie deficit works better than crash dieting.', 'Walk daily. It adds up without wearing you out.'],
  get_toned: ['“Toned” means muscle with less fat: lift regularly and keep protein up.', 'Progress the weights slowly, do not stay on the lightest dumbbells.', 'Be patient: visible change takes 8 to 12 weeks.'],
  get_stronger: ['Rest fully between heavy sets. Strength needs it.', 'Add 1 to 2.5 kg to the main lifts when you finish every rep.', 'Film a set now and then to check your form.'],
  endurance: ['Keep rests short, but never sacrifice your form.', 'Add a little time or one more round each week.', 'Fuel before long sessions and drink water.'],
  general_fitness: ['Consistency beats intensity. Show up every week.', 'Mix lifting with some walking or cardio.', 'Stop a set when your form breaks down.'],
};

/** A full week from the answers. `seed` shuffles the exercise choices without changing the structure. */
export function generatePlan(b: Brief, seed = 0): OfflinePlan {
  const goal = b.goal ?? 'general_fitness';
  const brief: Brief = { ...b, goal, bodyStyle: b.bodyStyle ?? 'athletic' };
  const ctx = ctxOf(brief);
  const glutes = brief.bodyStyle === 'glutes_legs';
  const days = clamp(Math.round(brief.daysPerWeek), 2, 6);
  const plan = (glutes ? GLUTE_SPLITS : SPLITS)[days];

  const planUsed = new Set<string>();
  const seenType = new Map<string, number>();
  const total = new Map<string, number>(); plan.forEach((t) => total.set(t, (total.get(t) ?? 0) + 1));

  const out: PlanDay[] = plan.map((key, di) => {
    const type = DAY_TYPES[key];
    const dayUsed = new Set<string>();
    const exercises: RoutineExercise[] = [];
    let firstCompoundDone = false;
    const slots = slotsFor(type, brief, days);
    slots.forEach((slot, si) => {
      const pick = pickFor(slot, ctx, planUsed, dayUsed, seed, `${di}|${si}`);
      if (!pick) return;
      dayUsed.add(pick.name); planUsed.add(pick.name);
      const first = pick.kind === 'compound' && pick.muscle !== 'cardio' && !firstCompoundDone;
      if (first) firstCompoundDone = true;
      exercises.push(prescribe(pick, { goal, level: brief.level, style: brief.bodyStyle ?? '', first, boost: slot.boost }));
    });

    // If the answers left too little to choose from, top the day up from what the person's equipment allows.
    const muscles = [...new Set([...type.slots.map((x) => x.m), 'abs', 'glutes', 'quads', 'back', 'hamstrings', 'chest', 'shoulders', 'calves'] as Muscle[])];
    for (const m of muscles) {
      if (exercises.length >= 3) break;
      const extra = pickFor({ m }, ctx, planUsed, dayUsed, seed, `fill|${di}|${m}`);
      if (extra) { dayUsed.add(extra.name); planUsed.add(extra.name); exercises.push(prescribe(extra, { goal, level: brief.level, style: brief.bodyStyle ?? '' })); }
    }

    const n = (seenType.get(key) ?? 0) + 1; seenType.set(key, n);
    const label = total.get(key)! > 1 && !['fullA', 'fullB', 'fullC'].includes(key) ? `${type.name} ${n === 1 ? 'A' : 'B'}` : type.name;
    return { name: label, focus: type.focus, exercises };
  });

  const notes: string[] = [];
  if (brief.avoid.length) notes.push(`Left out exercises that stress your ${brief.avoid.map((a) => ({ knee: 'knees', shoulder: 'shoulders', back: 'lower back', wrist: 'wrists', impact: 'joints (high impact)' } as Record<string, string>)[a] ?? a).join(', ')}.`);
  if (brief.bodyStyle === 'calisthenics') notes.push('This plan assumes a pull-up bar.');
  if (brief.equipment === 'home_bodyweight' && brief.bodyStyle !== 'calisthenics') notes.push('No equipment needed. For pulling exercises a sturdy table or bar helps, and the plan avoids ones that need a bar.');

  return {
    summary: `A ${days}-day ${SPLIT_NAME(days, glutes)} plan to ${GOAL_PHRASE[goal] ?? 'get fitter'}. ${STYLE_LINE[brief.bodyStyle ?? ''] ?? ''} ${REP_LINE[goal] ?? ''}`.replace(/\s+/g, ' ').trim(),
    days: out, tips: TIPS[goal] ?? TIPS.general_fitness, source: 'offline', notes,
  };
}
