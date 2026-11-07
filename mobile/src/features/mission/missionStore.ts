import AsyncStorage from '@react-native-async-storage/async-storage';

// Small per-day values that live on the phone: how much water you drank, and which missions you already collected XP for.
// Keyed by account as well as day, so two people using one phone never see each other's water or collected missions.
const water = (uid: string, day: string) => `rr_water_${uid}_${day}`;
const claimed = (uid: string, day: string) => `rr_claimed_${uid}_${day}`;

export async function loadWater(uid: string, day: string): Promise<number> {
  try { const v = Number(await AsyncStorage.getItem(water(uid, day))); return Number.isFinite(v) && v > 0 ? Math.min(v, 30) : 0; } catch { return 0; }
}
export async function saveWater(uid: string, day: string, glasses: number) {
  try { await AsyncStorage.setItem(water(uid, day), String(Math.max(0, Math.min(glasses, 30)))); } catch { /* storage unavailable: the count just will not persist */ }
}
export async function loadClaimed(uid: string, day: string): Promise<string[]> {
  try { const raw = await AsyncStorage.getItem(claimed(uid, day)); const v = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
}
export async function saveClaimed(uid: string, day: string, ids: string[]) {
  try { await AsyncStorage.setItem(claimed(uid, day), JSON.stringify(ids)); } catch { /* ignore */ }
}
