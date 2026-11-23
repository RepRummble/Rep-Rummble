import api from '../config/api';
import type { CheckIn, CheckInList, NutritionRequest, NutritionState } from '../features/coaching/coachingLogic';

const tz = () => new Date().getTimezoneOffset();

export const coaching = {
  checkIns: async (): Promise<CheckInList> => (await api.get('/coaching/checkins', { params: { tz: tz() } })).data.data,
  requestCheckIn: async (topic: string, preferredTimes: string): Promise<CheckIn> => (await api.post('/coaching/checkins', { topic, preferredTimes, tz: tz() })).data.data,
  cancelCheckIn: async (id: string): Promise<CheckIn> => (await api.post(`/coaching/checkins/${id}/cancel`)).data.data,
  nutrition: async (): Promise<NutritionState> => (await api.get('/coaching/nutrition', { params: { tz: tz() } })).data.data,
  requestNutrition: async (b: { goal: string; mealsPerDay: number; dietPrefs: string; allergies: string; notes: string }): Promise<NutritionRequest> => (await api.post('/coaching/nutrition', { ...b, tz: tz() })).data.data,
};
