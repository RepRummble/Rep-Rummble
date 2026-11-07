// Editing a suggested plan: change sets, reps and rest, swap an exercise for a similar one, add from the library, reorder.
// Pure helpers used by the Coach screen and by saved workouts. Every result stays inside the limits the server accepts.

import type { RoutineExercise } from '../train/trainLogic';
import { LIBRARY, byName, normalizeMuscle, type LibExercise, type Muscle } from './exerciseLibrary';
import { isAllowed, prescribe, type Ctx } from './planGenerator';

/** Where an exercise sits in the library, when it is one of ours (the AI's names are matched by name). */
export function libEntryFor(ex: Pick<RoutineExercise, 'name'>): LibExercise | undefined {
  return byName.get(ex.name.toLowerCase().replace(' (seconds)', '').trim());
}

export function muscleOf(ex: Pick<RoutineExercise, 'name' | 'muscle'>): Muscle | null {
  return libEntryFor(ex)?.muscle ?? normalizeMuscle(ex.muscle);
}

/** Similar exercises to swap in: same muscle, allowed for this person, not already in the workout. Same movement first. */
export function alternativesFor(ex: RoutineExercise, ctx: Ctx, exclude: Iterable<string> = [], limit = 12): LibExercise[] {
  const m = muscleOf(ex);
  if (!m) return [];
  const skip = new Set([...exclude].map((n) => n.toLowerCase().replace(' (seconds)', '')));
  skip.add(ex.name.toLowerCase().replace(' (seconds)', ''));
  const me = libEntryFor(ex);
  return LIBRARY.filter((e) => e.muscle === m && !skip.has(e.name.toLowerCase()) && isAllowed(e, ctx))
    .map((e) => ({ e, score: (me && e.pattern === me.pattern ? 4 : 0) + (me && e.kind === me.kind ? 2 : 0) + (me && e.gear === me.gear ? 1 : 0) - Math.abs(e.level - (me?.level ?? e.level)) }))
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name))
    .slice(0, limit).map((x) => x.e);
}

/** Search the library by name or muscle, only for exercises this person can do. */
export function searchLibrary(query: string, ctx: Ctx, muscle: Muscle | 'all' = 'all', exclude: Iterable<string> = [], limit = 40): LibExercise[] {
  const q = query.trim().toLowerCase();
  const skip = new Set([...exclude].map((n) => n.toLowerCase().replace(' (seconds)', '')));
  return LIBRARY.filter((e) => isAllowed(e, ctx) && !skip.has(e.name.toLowerCase()) && (muscle === 'all' || e.muscle === muscle) && (!q || e.name.toLowerCase().includes(q) || e.muscle.includes(q)))
    .sort((a, b) => a.muscle.localeCompare(b.muscle) || a.level - b.level || a.name.localeCompare(b.name)).slice(0, limit);
}

/** A library exercise, ready to drop into a workout with sensible sets and reps for the person's goal. */
export const exerciseFromLib = (e: LibExercise, ctx: Ctx): RoutineExercise => prescribe(e, { goal: ctx.goal, level: ctx.level, style: ctx.style });

/** Swap keeps the sets and rest the person chose, and takes the new exercise's reps and unit. */
export function swapExercise(old: RoutineExercise, next: LibExercise, ctx: Ctx): RoutineExercise {
  const fresh = exerciseFromLib(next, ctx);
  return { ...fresh, sets: old.sets, restSec: old.restSec };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export type Field = 'sets' | 'reps' | 'restSec';
/** One tap of a stepper. Reps move by 1, or by 5 seconds for holds; rest moves by 15 seconds. */
export function step(ex: RoutineExercise, field: Field, dir: 1 | -1): RoutineExercise {
  if (field === 'sets') return { ...ex, sets: clamp(ex.sets + dir, 1, 8) };
  if (field === 'restSec') return { ...ex, restSec: clamp(ex.restSec + dir * 15, 0, 300) };
  return ex.unit === 'sec' ? { ...ex, reps: clamp(ex.reps + dir * 5, 10, 300) } : { ...ex, reps: clamp(ex.reps + dir, 1, 50) };
}

export const replaceAt = <T,>(a: T[], i: number, v: T): T[] => a.map((x, j) => (j === i ? v : x));
export const removeAt = <T,>(a: T[], i: number): T[] => a.filter((_, j) => j !== i);
export const insertAt = <T,>(a: T[], i: number, v: T): T[] => [...a.slice(0, i), v, ...a.slice(i)];
/** Moves an item one place up (-1) or down (+1). Out of range does nothing. */
export function moveAt<T>(a: T[], i: number, dir: 1 | -1): T[] {
  const j = i + dir;
  if (j < 0 || j >= a.length || i < 0 || i >= a.length) return a;
  const c = [...a]; [c[i], c[j]] = [c[j], c[i]]; return c;
}

export const sameExercises = (a: RoutineExercise[], b: RoutineExercise[]) => JSON.stringify(a) === JSON.stringify(b);
