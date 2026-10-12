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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage
      await AsyncStorage.multiRemove(['rep_rumble_token', 'rep_rumble_user']);
    }
    return Promise.reject(error);
  }
);

export default api;
