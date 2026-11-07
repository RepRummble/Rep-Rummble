import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_TARGETS, Targets, sanitizeTargets } from './profileLogic';

// Daily targets live on this phone. Saving them updates every screen that shows them (Home, missions) straight away.
const KEY = 'rr_targets';
let current: Targets = DEFAULT_TARGETS;
const listeners = new Set<(t: Targets) => void>();

export async function loadTargets(): Promise<Targets> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    current = raw ? sanitizeTargets(JSON.parse(raw)) : DEFAULT_TARGETS;
  } catch { current = DEFAULT_TARGETS; }
  return current;
}

export async function saveTargets(t: Targets): Promise<Targets> {
  current = sanitizeTargets(t);
  try { await AsyncStorage.setItem(KEY, JSON.stringify(current)); } catch { /* the targets still apply until the app closes */ }
  listeners.forEach((l) => l(current));
  return current;
}

export function useTargets(): Targets {
  const [t, setT] = useState<Targets>(current);
  useEffect(() => {
    let alive = true;
    loadTargets().then((x) => { if (alive) setT(x); });
    listeners.add(setT);
    return () => { alive = false; listeners.delete(setT); };
  }, []);
  return t;
}
