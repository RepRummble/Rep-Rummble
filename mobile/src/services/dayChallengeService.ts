import api from '../config/api';
import type { DayChallenge } from '../features/challenges/challengeLogic';

const tz = () => new Date().getTimezoneOffset();

export const dayChallenges = {
  list: async (): Promise<DayChallenge[]> => (await api.get('/day-challenges', { params: { tz: tz() } })).data.data,
  get: async (id: string): Promise<DayChallenge> => (await api.get(`/day-challenges/${id}`, { params: { tz: tz() } })).data.data,
  create: async (b: { days: number; perWeek: number; title?: string; friendIds: string[] }): Promise<DayChallenge> => (await api.post('/day-challenges', { ...b, tz: tz() })).data.data,
  invite: async (id: string, friendIds: string[]): Promise<DayChallenge> => (await api.post(`/day-challenges/${id}/invite`, { friendIds, tz: tz() })).data.data,
  accept: async (id: string): Promise<DayChallenge> => (await api.post(`/day-challenges/${id}/accept`, { tz: tz() })).data.data,
  decline: async (id: string) => (await api.post(`/day-challenges/${id}/decline`)).data,
  leave: async (id: string) => (await api.post(`/day-challenges/${id}/leave`)).data,
  end: async (id: string) => (await api.delete(`/day-challenges/${id}`)).data,
};
