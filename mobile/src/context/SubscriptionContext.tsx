import React, { createContext, useContext, useState, useCallback } from 'react';
import { PlanId } from '../types';
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

export const PLAN_PRICES = {
  free:    { monthly: 0,     annual: 0      },
  pro:     { monthly: 9.99,  annual: 79.99  },
  premium: { monthly: 19.99, annual: 159.99 },
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
  setPlan: (p: PlanId) => void;
}

const Ctx = createContext<SubscriptionCtx | null>(null);

export function SubscriptionProvider({ children, initialPlan = 'free' }: {
  children: React.ReactNode;
  initialPlan?: PlanId;
}) {
  // In dev mode we start as free so you can see all paywall gates
  const [plan, setPlanState] = useState<PlanId>(DEV_BYPASS_AUTH ? 'free' : initialPlan);
  const [scansUsedToday, setScansUsed] = useState(0);
  const [chatUsedToday, setChatUsed] = useState(0);

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

  const setPlan = useCallback((p: PlanId) => setPlanState(p), []);

  return (
    <Ctx.Provider value={{
      plan, limits,
      isProOrAbove: plan === 'pro' || plan === 'premium',
      isPremium: plan === 'premium',
      scansUsedToday, chatUsedToday,
      canScan, canChat, recordScan, recordChat, setPlan,
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
