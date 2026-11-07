import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import api from '../config/api';
import { Connection, DeviceId, SummaryDay, SOURCE_NAMES } from '../features/devices/devicesLogic';
import { detectAppleWatch, getAvailability, getDailyRows, requestHealthPermissions } from './healthService';
import { detectGalaxy, getGalaxyDays, getHcAvailability, requestHcPermissions } from './healthConnectService';

export interface DeviceRow { id: DeviceId; name: string; kind: 'cloud' | 'phone'; available: boolean; unavailableReason?: 'not_configured'; connection: Connection | null }

export const RETURN_URL = 'reprummble://devices';
const msg = (e: any, fallback: string) => e?.response?.data?.message || fallback;

export const devices = {
  list: async (): Promise<DeviceRow[]> => (await api.get('/devices')).data.data,
  summary: async (days = 7): Promise<SummaryDay[]> => (await api.get('/devices/summary', { params: { days } })).data.data,
  syncAll: async () => (await api.post('/devices/sync')).data.data as { provider: string; ok: boolean; skipped?: boolean; error?: string }[],
  sync: async (id: DeviceId) => (await api.post(`/devices/${id}/sync`)).data,
  remove: async (id: DeviceId) => (await api.delete(`/devices/${id}`)).data,
  registerPhone: async (id: 'apple_watch' | 'galaxy_watch', label: string, days: unknown[]) => (await api.post(`/devices/phone/${id}`, { label, days })).data,
};

export type ConnectOutcome = { status: 'connected' } | { status: 'cancelled' } | { status: 'error'; code: string };

/** Signs in to a cloud device in the system browser. No password or secret passes through the app. */
export async function connectCloud(id: DeviceId): Promise<ConnectOutcome> {
  let url: string;
  try { url = (await api.post(`/devices/${id}/connect`)).data.data.url; }
  catch (e: any) { return { status: 'error', code: e?.response?.data?.code === 'not_configured' ? 'unavailable' : 'failed' }; }
  const result = await WebBrowser.openAuthSessionAsync(url, RETURN_URL);
  if (result.type !== 'success') return { status: 'cancelled' };
  const q = result.url.split('?')[1] ?? '';
  const params = new URLSearchParams(q);
  if (params.get('connected') === '1') return { status: 'connected' };
  return { status: 'error', code: params.get('error') ?? 'failed' };
}

export type PhoneOutcome = { status: 'connected'; label: string } | { status: 'unavailable' | 'denied' | 'no_data' | 'failed'; detail?: string };

/** Connects the Apple Watch: Apple Health must really hold data written by a watch. */
export async function connectAppleWatch(): Promise<PhoneOutcome> {
  if (Platform.OS !== 'ios' || !getAvailability().ok) return { status: 'unavailable' };
  try {
    await requestHealthPermissions();
    const name = await detectAppleWatch();
    if (!name) return { status: 'no_data' };
    await pushAppleWatch(name);
    return { status: 'connected', label: name };
  } catch (e) { return { status: 'failed', detail: msg(e, '') }; }
}

export async function pushAppleWatch(label: string) {
  const rows = await getDailyRows(7);
  const days = rows.map((r) => ({ date: r.date, steps: r.steps || undefined, activeCalories: r.activeCalories || undefined, sleepHours: r.sleepHours || undefined, restingHR: r.restingHR || undefined }));
  await devices.registerPhone('apple_watch', label, days);
}

/** Connects a Galaxy Watch through Health Connect. */
export async function connectGalaxyWatch(): Promise<PhoneOutcome> {
  if ((await getHcAvailability()).ok !== true) return { status: 'unavailable' };
  try {
    if (!(await requestHcPermissions())) return { status: 'denied' };
    const found = await detectGalaxy();
    if (!found) return { status: 'no_data' };
    await pushGalaxy(found.label);
    return { status: 'connected', label: found.label };
  } catch (e) { return { status: 'failed', detail: msg(e, '') }; }
}

export async function pushGalaxy(label: string) {
  await devices.registerPhone('galaxy_watch', label, await getGalaxyDays(7));
}

/** Re-reads watches that are already connected and sends the latest. Quiet: a failure is simply tried again next time. */
export async function refreshPhoneDevices(rows: DeviceRow[]) {
  for (const r of rows) {
    if (!r.connection || r.kind !== 'phone') continue;
    try {
      if (r.id === 'apple_watch' && Platform.OS === 'ios' && getAvailability().ok) await pushAppleWatch(r.connection.label);
      if (r.id === 'galaxy_watch' && Platform.OS === 'android' && (await getHcAvailability()).ok === true) await pushGalaxy(r.connection.label);
    } catch { /* tried again next time */ }
  }
}

export const sourceName = (s: string) => SOURCE_NAMES[s] ?? s;
