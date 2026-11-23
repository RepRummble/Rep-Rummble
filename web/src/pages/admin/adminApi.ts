import { apiBlob, apiRequest } from '../../config/api';

const send = <T>(method: string, path: string, body?: unknown) =>
  apiRequest<T>(`/api/admin${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

export interface LeadStats { total: number; last7: number; last30: number; bySource: { source: string; count: number }[]; days: { date: string; count: number }[] }
export interface Lead { _id: string; email: string; source: string; createdAt: string }
export interface CheckIn {
  _id: string; email?: string; name?: string; topic: string; preferredTimes: string; status: 'requested' | 'scheduled' | 'done' | 'cancelled' | 'declined';
  createdAt: string; scheduledFor?: string; meetingLink?: string; coachName?: string; summary?: string; actionItems?: string[]; declineReason?: string;
}
export interface NutritionPlan { calories: number; protein: number; carbs: number; fat: number; water: number; meals: { name: string; items: string }[]; notes: string }
export interface NutritionReq {
  _id: string; email?: string; name?: string; goal: string; mealsPerDay: number; dietPrefs: string; allergies: string; notes: string;
  status: 'requested' | 'delivered' | 'declined'; createdAt: string; plan?: NutritionPlan; coachName?: string; declineReason?: string;
}

const qs = (o: Record<string, string | number | undefined>) => Object.entries(o).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');

export const admin = {
  status: () => send<{ isAdmin: boolean; leads: number; openCheckIns: number; openNutrition: number }>('GET', '/status'),
  leads: {
    stats: () => send<LeadStats>('GET', '/leads/stats'),
    list: (p: { search?: string; source?: string; page?: number }) => send<{ items: Lead[]; total: number; page: number; pages: number }>('GET', `/leads?${qs({ ...p, limit: 25 })}`),
    remove: (id: string) => send('DELETE', `/leads/${id}`),
    exportCsv: (p: { search?: string; source?: string }) => apiBlob(`/api/admin/leads/export?${qs(p)}`),
  },
  checkins: {
    list: (status: string) => send<CheckIn[]>('GET', `/checkins?status=${status}`),
    schedule: (id: string, b: { scheduledFor: string; meetingLink: string; coachName?: string }) => send('PATCH', `/checkins/${id}`, { action: 'schedule', ...b }),
    complete: (id: string, b: { summary: string; actionItems: string[]; coachName?: string }) => send('PATCH', `/checkins/${id}`, { action: 'complete', ...b }),
    decline: (id: string, reason: string) => send('PATCH', `/checkins/${id}`, { action: 'decline', reason }),
  },
  nutrition: {
    list: (status: string) => send<NutritionReq[]>('GET', `/nutrition?status=${status}`),
    deliver: (id: string, plan: NutritionPlan, coachName?: string) => send('POST', `/nutrition/${id}/deliver`, { plan, coachName }),
    decline: (id: string, reason: string) => send('POST', `/nutrition/${id}/decline`, { reason }),
  },
};
