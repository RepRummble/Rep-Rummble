import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../config/api';

export type Role = 'Owner' | 'Coach' | 'Nutritionist' | 'Viewer';
export type Area = 'members' | 'plans' | 'nutrition' | 'reports' | 'settings';
export type MemberStatus = 'active' | 'inactive' | 'invited';

export interface BusinessInfo {
  id: string; name: string; type: string; city: string; contactEmail: string;
  status: 'pending' | 'approved' | 'rejected'; rejectionReason?: string;
}
export interface Member {
  id: string; name: string; email: string; status: MemberStatus; planId: string | null; mealPlanId: string | null;
  adherence: number | null; sessionsWeek: number; lastActiveDays: number | null;
}
export interface WorkoutPlan { id: string; name: string; goal: string; level: 'Beginner' | 'Intermediate' | 'Advanced'; weeks: number; daysPerWeek: number; notes: string }
export interface MealPlan { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; mealsPerDay: number; notes: string }
export interface Food { id: string; name: string; serving: string; calories: number; protein: number; carbs: number; fat: number }
export interface Staff { id: string; name: string; email: string; role: 'Coach' | 'Nutritionist' | 'Viewer' }
export interface Stats {
  counts: { members: number; active: number; invited: number; workoutPlans: number; mealPlans: number };
  avgAdherence: number | null;
  weeklySessions: number[];
  adherenceBands: { high: number; mid: number; low: number };
  needsCheckIn: { id: string; name: string; lastActiveDays: number | null; adherence: number | null }[];
  planUsage: { name: string; members: number }[];
  members: { name: string; adherence: number | null }[];
}
export interface Application {
  id: string; name: string; type: string; city: string; size: string; message: string;
  ownerEmail: string; contactEmail: string; createdAt: string;
}

// Mirrors the server's permission table; the server is what actually enforces it.
const ACCESS: Record<Role, Partial<Record<Area, 'r' | 'rw'>>> = {
  Owner: { members: 'rw', plans: 'rw', nutrition: 'rw', reports: 'rw', settings: 'rw' },
  Coach: { members: 'rw', plans: 'rw', nutrition: 'r', reports: 'r' },
  Nutritionist: { members: 'r', plans: 'r', nutrition: 'rw', reports: 'r' },
  Viewer: { members: 'r', plans: 'r', nutrition: 'r', reports: 'r' },
};
export const can = (role: Role, area: Area, mode: 'read' | 'write') => {
  const level = ACCESS[role]?.[area];
  return mode === 'read' ? !!level : level === 'rw';
};

const send = <T>(method: string, path: string, body?: unknown) =>
  apiRequest<T>(`/api/business${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

export const biz = {
  me: () => send<{ business: BusinessInfo | null; role?: Role }>('GET', '/me'),
  apply: (body: Record<string, string>) => send('POST', '/apply', body),
  stats: (weeks: number) => send<Stats>('GET', `/stats?weeks=${weeks}`),
  members: {
    list: () => send<Member[]>('GET', '/members'),
    create: (body: { name: string; email: string; planId: string | null }) => send('POST', '/members', body),
    update: (id: string, body: { planId?: string | null; mealPlanId?: string | null }) => send('PATCH', `/members/${id}`, body),
    remove: (id: string) => send('DELETE', `/members/${id}`),
  },
  plans: {
    list: () => send<WorkoutPlan[]>('GET', '/plans'),
    create: (body: Omit<WorkoutPlan, 'id'>) => send('POST', '/plans', body),
    remove: (id: string) => send('DELETE', `/plans/${id}`),
  },
  mealPlans: {
    list: () => send<MealPlan[]>('GET', '/meal-plans'),
    create: (body: Omit<MealPlan, 'id'>) => send('POST', '/meal-plans', body),
    remove: (id: string) => send('DELETE', `/meal-plans/${id}`),
  },
  foods: {
    list: () => send<Food[]>('GET', '/foods'),
    create: (body: Omit<Food, 'id'>) => send('POST', '/foods', body),
    remove: (id: string) => send('DELETE', `/foods/${id}`),
  },
  staff: {
    list: () => send<Staff[]>('GET', '/staff'),
    create: (body: Omit<Staff, 'id'>) => send('POST', '/staff', body),
    remove: (id: string) => send('DELETE', `/staff/${id}`),
  },
  updateProfile: (body: { name: string; type: string; city: string; contactEmail: string }) => send('PATCH', '/profile', body),
  admin: {
    list: (status: 'pending' | 'approved' | 'rejected') => send<Application[]>('GET', `/admin/applications?status=${status}`),
    approve: (id: string) => send('POST', `/admin/applications/${id}/approve`),
    reject: (id: string, reason: string) => send('POST', `/admin/applications/${id}/reject`, { reason }),
    revoke: (id: string, reason: string) => send('POST', `/admin/applications/${id}/revoke`, { reason }),
    status: () => send<{ isAdmin: boolean; pending?: number }>('GET', '/admin/status'),
  },
};

export const macroKcal = (p: number, c: number, f: number) => Math.round(p * 4 + c * 4 + f * 9);

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  // Quote every cell and neutralise spreadsheet formulas (=, +, -, @) in user-entered text.
  const cell = (v: string | number) => {
    const text = String(v);
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const blob = new Blob([rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Runs a request on mount and whenever `deps` change; `reload` re-runs it after a change. */
export function useLoad<T>(fn: () => Promise<{ data?: T; error?: string }>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [tick, setTick] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  useEffect(() => {
    let cancelled = false;
    run().then((res) => { if (!cancelled) setState({ data: res.data, error: res.error, loading: false }); });
    return () => { cancelled = true; };
  }, [run, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}
