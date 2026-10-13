import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { DEV_BYPASS_AUTH, devAdapter } from './devConfig';

// On a physical phone "localhost" is the phone itself, so in development we point
// at the computer running Metro (same Wi-Fi). Set EXPO_PUBLIC_API_URL to override,
// e.g. your Render URL for production builds.
function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return `${fromEnv.replace(/\/$/, '')}/api`;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (__DEV__ && host) return `http://${host}:5001/api`;
  return 'http://localhost:5001/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  ...(DEV_BYPASS_AUTH && { adapter: devAdapter }),
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('rep_rumble_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ── Staying signed in ──────────────────────────────────────────────────────────────
// Access tokens last about an hour. When the server answers 401 we trade the stored refresh token for
// a new pair and repeat the request, so people are not signed out. Refresh tokens work once, so only one
// refresh runs at a time and every request that failed meanwhile waits for it.
let refreshing: Promise<string | null> | null = null;
let onSessionExpired: (() => void) | null = null;

/** The auth provider registers here to be told when the person has to sign in again. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

async function refreshSession(): Promise<string | null> {
  const refreshToken = await AsyncStorage.getItem('rep_rumble_refresh');
  if (!refreshToken) return null;
  try {
    // A plain axios call: going through `api` would trigger this same interceptor again.
    const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { timeout: 30000 });
    const { token, refreshToken: nextRefresh } = res.data.data;
    await AsyncStorage.multiSet([
      ['rep_rumble_token', token],
      ['rep_rumble_refresh', nextRefresh],
    ]);
    return token;
  } catch (error: any) {
    // Only a clear "no" from the server ends the session. A network hiccup keeps it, so a bad
    // connection does not sign people out.
    if (error.response?.status === 401 || error.response?.status === 400) return null;
    throw error;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthCall = /\/auth\/(login|register|refresh)/.test(original?.url || '');
    if (error.response?.status !== 401 || !original || original._retried || isAuthCall) {
      return Promise.reject(error);
    }
    original._retried = true;
    try {
      // If another request already refreshed while this one was in flight, just use the new token.
      const current = await AsyncStorage.getItem('rep_rumble_token');
      const alreadyRefreshed = !!current && original.headers?.Authorization !== `Bearer ${current}`;
      if (!alreadyRefreshed) refreshing = refreshing ?? refreshSession().finally(() => { refreshing = null; });
      const token = alreadyRefreshed ? current : await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    } catch {
      return Promise.reject(error); // offline or server down: keep the session, fail this request
    }
    // The refresh token is gone or no longer valid: sign out.
    await AsyncStorage.multiRemove(['rep_rumble_token', 'rep_rumble_refresh', 'rep_rumble_user']);
    onSessionExpired?.();
    return Promise.reject(error);
  }
);

export default api;
