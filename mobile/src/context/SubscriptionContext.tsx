import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { PlanId } from '../types';
import api from '../config/api';
import { useAuth } from './AuthContext';
import { DEV_BYPASS_AUTH } from '../config/devConfig';

// ── Plan limits ───────────────────────────────────────────────────────────────

export const PLAN_LIMITS = {
  free: {
    aiScansPerDay: 3,
    chatMessagesPerDay: 5,
    wearableDevices: 0,
    canCreateChallenges: false,
    hasMicronutrients: false,
    hasPersonalizedPlans: false,
    hasAdvancedAnalytics: false,
    hasPrioritySupport: false,
    hasFullLeaderboard: false,
  },
  pro: {
    aiScansPerDay: Infinity,
    chatMessagesPerDay: Infinity,
    wearableDevices: 1,
    canCreateChallenges: true,
    hasMicronutrients: true,
    hasPersonalizedPlans: false,
    hasAdvancedAnalytics: false,
    hasPrioritySupport: false,
    hasFullLeaderboard: true,
  },
  premium: {
    aiScansPerDay: Infinity,
    chatMessagesPerDay: Infinity,
    wearableDevices: Infinity,
    canCreateChallenges: true,
    hasMicronutrients: true,
    hasPersonalizedPlans: true,
    hasAdvancedAnalytics: true,
    hasPrioritySupport: true,
    hasFullLeaderboard: true,
  },
};

// ── Context ───────────────────────────────────────────────────────────────────

interface SubscriptionCtx {
  plan: PlanId;
  limits: typeof PLAN_LIMITS.free;
  isProOrAbove: boolean;
  isPremium: boolean;
  scansUsedToday: number;
  chatUsedToday: number;
  canScan: () => boolean;
  canChat: () => boolean;
  recordScan: () => void;
  recordChat: () => void;
  /** Prices in dollars per month, as set on the server (the same as the website). */
  prices: Partial<Record<PlanId, number>>;
  /** Set when a partner gym includes Pro for this person. */
  includedBy: string | null;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SubscriptionCtx | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  // The plan and the daily allowance come from the server, which is also what enforces them. Until they arrive, Free.
  const [plan, setPlan] = useState<PlanId>('free');
  const [includedBy, setIncludedBy] = useState<string | null>(null);
  const [prices, setPrices] = useState<Partial<Record<PlanId, number>>>({});
  const [scansUsedToday, setScansUsed] = useState(0);
  const [chatUsedToday, setChatUsed] = useState(0);

  const refresh = useCallback(async () => {
    if (DEV_BYPASS_AUTH) return;
    const [billing, usage] = await Promise.allSettled([api.get('/billing'), api.get('/ai/usage')]);
    if (billing.status === 'fulfilled') {
      const b = billing.value.data?.data ?? billing.value.data;
      if (b?.effectivePlan) setPlan(b.effectivePlan as PlanId);
      setIncludedBy(b?.includedBy ?? null);
      const p: Partial<Record<PlanId, number>> = {};
      (b?.plans ?? []).forEach((x: { id: PlanId; priceCents: number }) => { p[x.id] = x.priceCents / 100; });
      setPrices(p);
    }
    if (usage.status === 'fulfilled') setScansUsed(usage.value.data?.data?.used?.scan ?? 0);
  }, []);

  useEffect(() => {
    if (isAuthenticated) refresh(); else { setPlan('free'); setIncludedBy(null); setScansUsed(0); setChatUsed(0); }
  }, [isAuthenticated, refresh]);

  const limits = PLAN_LIMITS[plan];

  const canScan = useCallback(() => {
    if (limits.aiScansPerDay === Infinity) return true;
    return scansUsedToday < limits.aiScansPerDay;
  }, [limits, scansUsedToday]);

  const canChat = useCallback(() => {
    if (limits.chatMessagesPerDay === Infinity) return true;
    return chatUsedToday < limits.chatMessagesPerDay;
  }, [limits, chatUsedToday]);

  const recordScan = useCallback(() => setScansUsed(n => n + 1), []);
  const recordChat = useCallback(() => setChatUsed(n => n + 1), []);

  return (
    <Ctx.Provider value={{
      plan, limits,
      isProOrAbove: plan === 'pro' || plan === 'premium',
      isPremium: plan === 'premium',
      scansUsedToday, chatUsedToday,
      canScan, canChat, recordScan, recordChat, prices, includedBy, refresh,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSubscription must be used inside SubscriptionProvider');
  return ctx;
}
