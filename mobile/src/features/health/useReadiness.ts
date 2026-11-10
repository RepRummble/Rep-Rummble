import { useCallback, useEffect, useRef, useState } from 'react';
import { cachedReadiness, loadReadiness } from '../../services/readinessService';
import type { Readiness } from './readiness';

/** Today's readiness. Shows the last result straight away and refreshes it (at most every 10 minutes unless asked). */
export function useReadiness() {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const refresh = useCallback(async (force = false) => {
    const cached = await cachedReadiness();
    if (cached && alive.current) { setReadiness(cached.r); if (cached.fresh && !force) { setLoading(false); return; } }
    try { const r = await loadReadiness(); if (alive.current) setReadiness(r); } catch { /* keep what we have */ }
    if (alive.current) setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { readiness, loading, refresh: () => refresh(true) };
}
