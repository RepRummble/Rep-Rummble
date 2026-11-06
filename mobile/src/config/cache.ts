import AsyncStorage from '@react-native-async-storage/async-storage';

// Keeps the last good answer for each list, so a screen can still show something when the phone is
// offline or the server is down. Keys are prefixed so logout can clear them with the rest.
const PREFIX = 'rep_rumble_cache_';

export interface Loaded<T> {
  data: T | null;
  /** True when the data came from the saved copy because the live request failed. */
  fromCache: boolean;
  /** When the saved copy was stored (ms since epoch), if `fromCache`. */
  savedAt?: number;
}

/** Runs the request; on success saves the result, on failure falls back to the saved copy. */
export async function loadWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<Loaded<T>> {
  try {
    const data = await fetcher();
    AsyncStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), data })).catch(() => {});
    return { data, fromCache: false };
  } catch {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      if (raw) {
        const { savedAt, data } = JSON.parse(raw) as { savedAt: number; data: T };
        return { data, fromCache: true, savedAt };
      }
    } catch { /* unreadable copy: treat as nothing saved */ }
    return { data: null, fromCache: false };
  }
}

export async function clearCache() {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
  if (keys.length) await AsyncStorage.removeMany(keys);
}

/** "3 min ago", "2 h ago", "yesterday" for the saved-copy note. */
export function ago(ms?: number) {
  if (!ms) return 'earlier';
  const mins = Math.max(1, Math.round((Date.now() - ms) / 60000));
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return mins < 2880 ? 'yesterday' : `${Math.round(mins / 1440)} days ago`;
}
