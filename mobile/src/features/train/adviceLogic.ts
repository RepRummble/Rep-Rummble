// Turns today's recovery into advice for today's workout. Pure functions.
import { levelOf, strainTarget, type Level, type StrainTarget } from '../health/scores';
import type { Template } from './trainLogic';

export type Action = 'as-planned' | 'lighter' | 'rest';
export interface Advice { level: Level; headline: string; detail: string; suggested: Action; target: StrainTarget | null }

/** What to do today. With no recovery score yet, there is no advice (we never guess). */
export function adviceFor(recovery: number | null): Advice | null {
  if (recovery === null) return null;
  const level = levelOf(recovery), target = strainTarget(recovery);
  if (level === 'green') return { level, headline: 'You are primed', detail: 'Your body is recovered. Do your plan, and push the main lifts if it feels good.', suggested: 'as-planned', target };
  if (level === 'yellow') return { level, headline: 'A steady day', detail: 'Recovery is average. Do your plan, but stop every set about 2 reps before failure.', suggested: 'as-planned', target };
  return { level, headline: 'Recovery is low', detail: 'Your body needs rest more than a hard session. Go lighter today, or do some mobility work and a walk.', suggested: 'lighter', target };
}

/** The same workout with about 30% less work: fewer sets, never below 2 (or the 1 it already had). Reps and rest stay as they are. */
export function lighterVersion(t: Template): Template {
  return {
    ...t, id: `${t.id}-lighter`, name: `${t.name} (lighter)`,
    exercises: t.exercises.map((e) => ({ ...e, sets: e.sets <= 1 ? e.sets : Math.max(2, Math.round(e.sets * 0.7)) })),
  };
}

export const totalSets = (t: Pick<Template, 'exercises'>) => t.exercises.reduce((a, e) => a + e.sets, 0);

/** The gentle session offered on a low-recovery day. */
export const RECOVERY_TEMPLATE_ID = 'mobility';
