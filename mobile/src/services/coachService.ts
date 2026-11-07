import api from '../config/api';
import type { Brief } from '../features/coach/coachLogic';
import type { Routine, RoutineExercise } from '../features/train/trainLogic';

export interface CoachDay { name: string; focus: string; exercises: RoutineExercise[] }
export interface CoachPlan { summary: string; days: CoachDay[]; tips: string[] }

export const coach = {
  suggest: async (b: Brief): Promise<CoachPlan> => (await api.post('/coach/suggest', b, { timeout: 90000 })).data.data.plan,
  routines: async (): Promise<Routine[]> => (await api.get('/coach/routines')).data.data,
  create: async (r: { name: string; focus?: string; exercises: RoutineExercise[]; weekdays?: number[]; source?: string }): Promise<Routine> => (await api.post('/coach/routines', r)).data.data,
  update: async (id: string, patch: { name?: string; weekdays?: number[]; exercises?: RoutineExercise[] }): Promise<Routine> => (await api.put(`/coach/routines/${id}`, patch)).data.data,
  addExercises: async (id: string, exercises: RoutineExercise[]): Promise<{ routine: Routine; added: number }> => { const r = (await api.post(`/coach/routines/${id}/exercises`, { exercises })).data; return { routine: r.data, added: r.added }; },
  remove: async (id: string) => (await api.delete(`/coach/routines/${id}`)).data,
};
