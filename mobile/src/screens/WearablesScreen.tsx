import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  getAvailability, getLast7Days, getTodayHealth, requestHealthPermissions, syncToServer,
  type HealthAvailability, type HealthDay, type HealthToday,
} from '../services/healthService';

import { colors } from '../theme/colors';
const { width: SW } = Dimensions.get('window');

// ════════════════════════════════════════════════════════════
// SAMPLE DATA — shown until Apple Health is connected. Live values
// from HealthKit replace these in useHealthData() below.
// ════════════════════════════════════════════════════════════

const SAMPLE = {
  // Composite score
  healthScore: 87,
  biologicalAge: 24,
  chronologicalAge: 27,
  // Vitals
  heartRate: 68, restingHR: 56, minHR: 52, maxHR: 151,
  hrv: 54, hrvBaseline: 48,
  spo2: 98, breathingRate: 14.2, bodyTemp: 36.6,
  stressIndex: 28, vo2max: 44,
  // Activity
  steps: 10_234, stepsGoal: 12_000,
  activeCalories: 487, totalCalories: 2_105, caloriesGoal: 2_200,
  exerciseMinutes: 42, standHours: 9, distance: 7.8,
  // Sleep
  sleepScore: 82, sleepTotal: 7.8,
  deepSleep: 1.6, remSleep: 1.9, lightSleep: 3.8, awake: 0.5,
  sleepStart: '10:42 PM', sleepEnd: '6:30 AM',
  // Recovery
  recoveryScore: 76,
};

const SAMPLE_WEEKLY = [
  { day: 'Sun', steps: 8234,  cal: 2100, sleep: 7.2, hr: 68 },
  { day: 'Mon', steps: 12450, cal: 2450, sleep: 6.8, hr: 72 },
  { day: 'Tue', steps: 6789,  cal: 1980, sleep: 8.1, hr: 65 },
  { day: 'Wed', steps: 9876,  cal: 2320, sleep: 7.5, hr: 70 },
  { day: 'Thu', steps: 11234, cal: 2180, sleep: 6.5, hr: 74 },
  { day: 'Fri', steps: 14567, cal: 2670, sleep: 8.3, hr: 63 },
  { day: 'Sat', steps: 10234, cal: 2050, sleep: 7.8, hr: 67 },
];

const HOURLY_HR = [
  { h: '12a', v: 58 }, { h: '2a',  v: 55 }, { h: '4a',  v: 53 }, { h: '6a',  v: 62 },
  { h: '8a',  v: 78 }, { h: '10a', v: 80 }, { h: '12p', v: 88 }, { h: '2p',  v: 90 },
  { h: '4p',  v: 82 }, { h: '6p',  v: 88 }, { h: '8p',  v: 72 }, { h: '10p', v: 65 },
];

const ENERGY_FORECAST = [
  { h: '6a', v: 45 }, { h: '8a', v: 72 }, { h: '10a', v: 88 },
  { h: '12p', v: 80 }, { h: '2p', v: 65 }, { h: '4p', v: 90 },
  { h: '6p', v: 82 }, { h: '8p', v: 60 }, { h: '10p', v: 35 },
];

const AI_INSIGHTS = [
  {
    level: 'peak', icon: 'flash', color: colors.success,
    title: 'Peak Window: 4–6 PM Today',
    body: 'Your HRV (+12% above baseline) and resting HR (56 bpm) indicate optimal neuromuscular readiness. Energy forecast hits 90/100 at 4 PM. Schedule high-intensity training now.',
  },
  {
    level: 'insight', icon: 'moon', color: colors.brand,
    title: 'REM Surge Detected',
    body: '1.9h of REM last night — 18% above your 4-week average. Expect elevated focus, memory consolidation, and reaction time today. Ideal for skill-based training.',
  },
  {
    level: 'bio', icon: 'leaf', color: colors.info,
    title: 'Biological Age: 24 (You\'re 27)',
    body: 'VO₂ max (44 ml/kg/min), resting HR (56 bpm), and HRV patterns place your cardiovascular biological age 3 years below chronological. You\'re winning.',
  },
];

const CORRELATIONS = [
  { emoji: '😴', pattern: 'Sleep 8h+', result: '+34% next-day workout performance', conf: 89 },
  { emoji: '🏋️', pattern: 'Train before 5 PM', result: '8 bpm lower resting HR next morning', conf: 76 },
  { emoji: '💧', pattern: 'High hydration days', result: '22% fewer afternoon energy dips', conf: 71 },
];

const ANOMALIES = [
  { icon: 'trending-up', color: colors.success, text: 'HRV 12% above your 30-day average — great recovery.' },
];

const DEVICES = [
  { name: 'Apple Watch',  icon: 'watch-outline',         color: colors.ink, connected: false },
  { name: 'Oura Ring',    icon: 'radio-button-on-outline',color: colors.warning, connected: false },
  { name: 'WHOOP',        icon: 'pulse-outline',          color: colors.danger, connected: false },
  { name: 'Garmin',       icon: 'navigate-outline',       color: colors.success, connected: false },
  { name: 'Fitbit',       icon: 'fitness-outline',        color: colors.info, connected: false },
  { name: 'Samsung',      icon: 'phone-portrait-outline', color: colors.brand, connected: false },
];

const sleepStages = (d: typeof SAMPLE) => [
  { label: 'Deep',  hours: d.deepSleep,  color: colors.info, desc: 'Physical repair, immune boost' },
  { label: 'REM',   hours: d.remSleep,   color: colors.brand, desc: 'Memory consolidation, creativity' },
  { label: 'Core',  hours: d.lightSleep, color: colors.info, desc: 'Transition, recovery' },
  { label: 'Awake', hours: d.awake,      color: colors.border, desc: 'Brief arousals' },
];

const MUSCLE_GROUPS = [
  { group: 'Chest', soreness: 30, lastTrained: '2 days ago' },
  { group: 'Back',  soreness: 15, lastTrained: '4 days ago' },
  { group: 'Legs',  soreness: 75, lastTrained: 'Yesterday'  },
  { group: 'Arms',  soreness: 45, lastTrained: '2 days ago' },
  { group: 'Core',  soreness: 20, lastTrained: '3 days ago' },
];

// ════════════════════════════════════════════════════════════
// REUSABLE UI COMPONENTS
// ════════════════════════════════════════════════════════════

function SectionLabel({ label, icon, iconColor = colors.brand }: { label: string; icon?: string; iconColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22, marginBottom: 10 }}>
      {icon && <Ionicons name={icon as any} size={14} color={iconColor} />}
      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.faint, letterSpacing: 1.2, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

function MiniCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

function BarChart({ data, color, barH = 80 }: {
  data: { label: string; value: number }[];
  color: string; barH?: number;
}) {
  const maxV = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: barH + 28, gap: 5 }}>
      {data.map((d, i) => {
        const h = Math.max((d.value / maxV) * barH, 4);
        const isLast = i === data.length - 1;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            {isLast && <Text style={{ fontSize: 8, color, fontWeight: '800', marginBottom: 2 }}>NOW</Text>}
            <LinearGradient
              colors={isLast ? [color, color + 'aa'] : [color + '55', color + '22']}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={{ width: '100%', height: h, borderRadius: 5 }}
            />
            <Text style={{ fontSize: 9, color: colors.faint, marginTop: 5 }}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function ProgressRing({ score, size = 130, color = colors.success }: { score: number; size?: number; color?: string }) {
  const bw = Math.round(size * 0.075);
  const inner = size - bw * 2;
  const lightColor = color === colors.success ? colors.successSoft : color === colors.warning ? colors.warning : colors.dangerSoft;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size * 1.4, height: size * 1.4, borderRadius: size * 0.7, backgroundColor: color, opacity: 0 }} />
      <LinearGradient
        colors={[lightColor, color, color + '55']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: size / 2, justifyContent: 'center', alignItems: 'center' }}
      >
        <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: size * 0.3, fontWeight: '900', color: colors.ink, lineHeight: size * 0.35 }}>{score}</Text>
          <Text style={{ fontSize: size * 0.085, color, fontWeight: '700', letterSpacing: 0.5 }}>/100</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function PulseHeart({ bpm }: { bpm: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const beat = Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,   duration: 300, useNativeDriver: true }),
    ]);
    const loop = Animated.loop(beat);
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name="heart" size={36} color={colors.danger} />
    </Animated.View>
  );
}

function Gauge({ value, maxValue, color, label, unit }: {
  value: number; maxValue: number; color: string; label: string; unit: string;
}) {
  const pct = Math.min(value / maxValue, 1);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, color: colors.muted, fontWeight: '500' }}>{label}</Text>
        <Text style={{ fontSize: 13, color: colors.white, fontWeight: '700' }}>{value}<Text style={{ color, fontSize: 11 }}> {unit}</Text></Text>
      </View>
      <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
        <LinearGradient
          colors={[color + 'cc', color]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ height: '100%', width: `${pct * 100}%`, borderRadius: 3 }}
        />
      </View>
    </View>
  );
}

function VitalTile({ icon, color, label, value, unit, sublabel }: {
  icon: string; color: string; label: string; value: string | number; unit: string; sublabel?: string;
}) {
  return (
    <LinearGradient colors={[color + '18', color + '06']} style={vitS.tile}>
      <View style={[vitS.tileIcon, { backgroundColor: color + '25' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={vitS.tileLabel}>{label}</Text>
      <Text style={[vitS.tileValue, { color }]}>{value}<Text style={vitS.tileUnit}> {unit}</Text></Text>
      {sublabel ? <Text style={vitS.tileSub}>{sublabel}</Text> : null}
    </LinearGradient>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════

const TABS = ['Overview', 'Vitals', 'Sleep', 'Recovery', 'Trends'];

const fmtTime = (d: Date | null) =>
  d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';

function mergeLive(live: HealthToday): typeof SAMPLE {
  const sl = live.sleep;
  return {
    ...SAMPLE,
    heartRate: live.heartRate ?? 0,
    restingHR: live.restingHR ?? 0,
    minHR: live.minHR ?? 0,
    maxHR: live.maxHR ?? 0,
    hrv: live.hrv ?? 0,
    hrvBaseline: live.hrvBaseline ?? live.hrv ?? 0,
    spo2: live.spo2 ?? 0,
    breathingRate: live.breathingRate ?? 0,
    vo2max: live.vo2max ?? 0,
    steps: live.steps,
    activeCalories: live.activeCalories,
    exerciseMinutes: live.exerciseMinutes,
    distance: live.distanceKm,
    sleepTotal: sl?.totalHours ?? 0,
    deepSleep: sl?.deep ?? 0,
    remSleep: sl?.rem ?? 0,
    lightSleep: sl?.core ?? 0,
    awake: sl?.awake ?? 0,
    sleepStart: fmtTime(sl?.start ?? null),
    sleepEnd: fmtTime(sl?.end ?? null),
  };
}

const UNAVAILABLE_COPY: Record<Exclude<HealthAvailability, { ok: true }>['reason'], string> = {
  'expo-go': 'Apple Health needs the Reprummble development build — it cannot run inside Expo Go.',
  'not-ios': 'Apple Health is only on iPhone. Health Connect support for Android is coming next.',
  'unsupported-device': 'This device does not support Apple Health (e.g. some iPads).',
  'module-missing': 'The HealthKit module is not in this build. Rebuild the development client.',
};

function useHealthData() {
  const availability = useMemo(getAvailability, []);
  const [live, setLive] = useState<HealthToday | null>(null);
  const [week, setWeek] = useState<HealthDay[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [serverSynced, setServerSynced] = useState<boolean | null>(null);

  const load = useCallback(async (askPermission: boolean) => {
    if (!availability.ok) return;
    setStatus('loading');
    try {
      if (askPermission) await requestHealthPermissions();
      const [today, days] = await Promise.all([getTodayHealth(), getLast7Days()]);
      setLive(today);
      setWeek(days);
      setLastSync(new Date());
      setStatus('idle');
      if (today) setServerSynced(await syncToServer(today));
    } catch (e) {
      console.warn('Apple Health read failed', e);
      setStatus('error');
    }
  }, [availability.ok]);

  // Asking for permission every time is safe: iOS only shows the sheet for types not yet asked about.
  useEffect(() => { load(true); }, [load]);

  return { availability, live, week, status, lastSync, serverSynced, refresh: () => load(true) };
}



export default function WearablesScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const health = useHealthData();
  const syncing = health.status === 'loading';
  const isLive = !!health.live;
  const D = isLive ? mergeLive(health.live!) : SAMPLE;
  const WEEKLY = isLive && health.week.length ? health.week : SAMPLE_WEEKLY;
  const SLEEP_STAGES = sleepStages(D);
  const hasWatch = isLive && health.live!.sources.some((n) => /watch/i.test(n));

  const handleSync = () => {
    if (!health.availability.ok) {
      Alert.alert('Apple Health unavailable', UNAVAILABLE_COPY[health.availability.reason]);
      return;
    }
    health.refresh();
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Athlete';

  return (
    <View style={s.root}>
      <LinearGradient colors={[colors.bg, colors.bg, colors.bg]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe} edges={['top']}>
        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Health Intelligence</Text>
            <View style={s.aiBadge}>
              <Ionicons name="sparkles" size={10} color={colors.brand} />
              <Text style={s.aiBadgeText}>AI-Powered · Real-Time</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleSync} style={s.syncBtn} activeOpacity={0.8}>
            <LinearGradient colors={[colors.brand + '30', colors.brand + '10']} style={s.syncBtnGrad}>
              <Ionicons name={syncing ? 'sync' : 'sync-outline'} size={18} color={colors.brand} />
              <Text style={s.syncBtnText}>{syncing ? 'Syncing…' : 'Sync'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Data source banner ── */}
        <View style={[s.sourceBanner, { borderColor: isLive ? colors.success + '40' : colors.warning + '40' }]}>
          <Ionicons name={isLive ? 'checkmark-circle' : 'information-circle'} size={16} color={isLive ? colors.success : colors.warning} />
          <Text style={s.sourceBannerText}>
            {isLive
              ? `Live from Apple Health${health.live!.sources.length ? ` · ${health.live!.sources.join(', ')}` : ''}${health.lastSync ? ` · ${fmtTime(health.lastSync)}` : ''}${health.serverSynced === false ? ' · server sync failed' : health.serverSynced === null ? ' · not saved (dev login)' : ' · saved'}. Scores and AI insights are samples.`
              : health.availability.ok
                ? health.status === 'error' ? 'Could not read Apple Health. Tap Sync to try again.' : 'Connecting to Apple Health…'
                : `Sample data. ${UNAVAILABLE_COPY[health.availability.reason]}`}
          </Text>
        </View>

        {/* ── Tabs ── */}
        <View style={[s.tabRow, { flexDirection: 'row', paddingHorizontal: 12 }]}>
          {TABS.map((t, i) => (
            <TouchableOpacity key={i} onPress={() => setTab(i)} activeOpacity={0.8} style={[s.tabPill, { flex: 1 }, tab === i && s.tabPillActive]}>
              {tab === i && (
                <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}>
                  <LinearGradient colors={[colors.brand, colors.tealMid]} style={{ flex: 1 }} />
                </View>
              )}
              <Text style={[s.tabText, tab === i && s.tabTextActive]} numberOfLines={1}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Content ── */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>

          {/* ══════════════════════════════════════════
              TAB 0 — OVERVIEW
          ══════════════════════════════════════════ */}
          {tab === 0 && (
            <>
              {/* Health Score Hero */}
              <LinearGradient colors={[colors.surface, colors.surface]} style={s.scoreHero}>
                <View style={s.glowOrb} />
                <View style={s.scoreHeroRow}>
                  <ProgressRing score={D.healthScore} size={140} color={colors.success} />
                  <View style={s.scoreMetaCol}>
                    <Text style={s.scoreGreeting}>Good morning,</Text>
                    <Text style={s.scoreName}>{displayName} 👋</Text>
                    <View style={{ gap: 10, marginTop: 12 }}>
                      {[
                        { icon: 'footsteps', color: colors.success, v: `${(D.steps / 1000).toFixed(1)}k`, l: 'Steps' },
                        { icon: 'heart',     color: colors.danger, v: `${D.heartRate}`,           l: 'BPM' },
                        { icon: 'moon',      color: colors.brand, v: `${D.sleepTotal}h`,          l: 'Sleep' },
                        { icon: 'pulse',     color: colors.info, v: `${D.hrv}ms`,               l: 'HRV' },
                      ].map(m => (
                        <View key={m.l} style={s.scoreMeta}>
                          <Ionicons name={m.icon as any} size={13} color={m.color} />
                          <Text style={[s.scoreMetaV, { color: m.color }]}>{m.v}</Text>
                          <Text style={s.scoreMetaL}>{m.l}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Biological Age */}
                <LinearGradient colors={[colors.info + '20', colors.info + '05']} style={s.bioAge}>
                  <Ionicons name="leaf" size={16} color={colors.info} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.bioAgeTitle}>Biological Age</Text>
                    <Text style={s.bioAgeBody}>Your body is functioning like a <Text style={{ color: colors.success, fontWeight: '800' }}>{D.biologicalAge}-year-old</Text> — {D.chronologicalAge - D.biologicalAge} years younger than your age.</Text>
                  </View>
                  <View style={s.bioAgeBadge}>
                    <Text style={s.bioAgeBadgeText}>{D.biologicalAge}</Text>
                    <Text style={s.bioAgeBadgeSub}>BIO AGE</Text>
                  </View>
                </LinearGradient>
              </LinearGradient>

              {/* Anomaly Alerts */}
              {ANOMALIES.map((a, i) => (
                <LinearGradient key={i} colors={[a.color + '18', a.color + '05']} style={s.anomaly}>
                  <View style={[s.anomalyIcon, { backgroundColor: a.color + '25' }]}>
                    <Ionicons name={a.icon as any} size={16} color={a.color} />
                  </View>
                  <Text style={s.anomalyText}>{a.text}</Text>
                </LinearGradient>
              ))}

              {/* AI Insights */}
              <SectionLabel label="AI Health Insights" icon="sparkles" iconColor={colors.brandBright} />
              {AI_INSIGHTS.map((ins, i) => (
                <LinearGradient key={i} colors={[ins.color + '18', ins.color + '05', colors.surface]} style={s.insightCard}>
                  <View style={[s.insightIcon, { backgroundColor: ins.color + '25' }]}>
                    <Ionicons name={ins.icon as any} size={18} color={ins.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.insightTitle, { color: ins.color }]}>{ins.title}</Text>
                    <Text style={s.insightBody}>{ins.body}</Text>
                  </View>
                </LinearGradient>
              ))}

              {/* Energy Forecast */}
              <SectionLabel label="Energy Forecast — Today" icon="sunny-outline" iconColor={colors.warning} />
              <MiniCard>
                <Text style={s.cardSubtitle}>Predicted energy levels based on sleep + circadian rhythm + HRV</Text>
                <View style={{ marginTop: 12 }}>
                  <BarChart
                    data={ENERGY_FORECAST.map(e => ({ label: e.h, value: e.v }))}
                    color={colors.warning}
                    barH={70}
                  />
                </View>
                <View style={s.peakWindowRow}>
                  <Ionicons name="flash" size={14} color={colors.success} />
                  <Text style={s.peakWindowText}>Peak window today: <Text style={{ color: colors.success, fontWeight: '700' }}>4 PM – 6 PM (90/100 energy)</Text></Text>
                </View>
              </MiniCard>

              {/* Smart Correlations */}
              <SectionLabel label="Smart Correlations" icon="analytics-outline" iconColor={colors.info} />
              <MiniCard>
                <Text style={s.cardSubtitle}>Patterns detected from your last 90 days of data</Text>
                {CORRELATIONS.map((c, i) => (
                  <View key={i}>
                    {i > 0 && <View style={s.divider} />}
                    <View style={s.corrRow}>
                      <Text style={s.corrEmoji}>{c.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.corrPattern}>{c.pattern}</Text>
                        <Text style={s.corrResult}>{c.result}</Text>
                      </View>
                      <View style={s.confBadge}>
                        <Text style={s.confText}>{c.conf}%</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </MiniCard>

              {/* Circadian Window */}
              <SectionLabel label="Circadian Optimizer" icon="time-outline" iconColor={colors.accent} />
              <LinearGradient colors={[colors.dangerSoft, colors.dangerSoft, colors.surface]} style={s.circadian}>
                {[
                  { icon: 'barbell-outline', color: colors.success, time: '4:00 – 6:00 PM', label: 'Optimal Training Window' },
                  { icon: 'restaurant-outline', color: colors.warning, time: '7am · 12pm · 6pm', label: 'Best Meal Times' },
                  { icon: 'moon-outline', color: colors.brand, time: '10:30 PM', label: 'Ideal Sleep Time' },
                  { icon: 'sunny-outline', color: colors.accent, time: '6:30 AM', label: 'Circadian Wake Time' },
                ].map((item, i) => (
                  <View key={i} style={s.circRow}>
                    <View style={[s.circIcon, { backgroundColor: item.color + '20' }]}>
                      <Ionicons name={item.icon as any} size={16} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.circLabel}>{item.label}</Text>
                      <Text style={[s.circTime, { color: item.color }]}>{item.time}</Text>
                    </View>
                  </View>
                ))}
              </LinearGradient>

              {/* Connected Devices */}
              <SectionLabel label="Connected Devices" icon="watch-outline" iconColor={colors.muted} />
              <View style={s.devicesGrid}>
                {DEVICES.map((d0) => ({ ...d0, connected: d0.name === 'Apple Watch' ? hasWatch : false })).map((dev, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.deviceCard}
                    onPress={() => Alert.alert(
                      dev.connected ? `${dev.name} connected` : `Connect ${dev.name}`,
                      dev.connected
                        ? `${dev.name} data is flowing in through Apple Health.`
                        : dev.name === 'Apple Watch'
                          ? 'Wear your watch paired to this iPhone, then tap Sync. Its data reaches Reprummble through Apple Health.'
                          : `Open the ${dev.name} app and turn on "Apple Health" sync in its settings. Reprummble then reads that data from Apple Health.`,
                    )}
                    activeOpacity={0.7}
                  >
                    <LinearGradient colors={dev.connected ? [dev.color + '25', dev.color + '10'] : [colors.surface, colors.bg]} style={s.deviceCardInner}>
                      <Ionicons name={dev.icon as any} size={24} color={dev.connected ? dev.color : colors.borderStrong} />
                      <Text style={[s.deviceName, { color: dev.connected ? colors.ink : colors.borderStrong }]}>{dev.name}</Text>
                      <View style={[s.deviceDot, { backgroundColor: dev.connected ? colors.success : colors.border }]} />
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ══════════════════════════════════════════
              TAB 1 — VITALS
          ══════════════════════════════════════════ */}
          {tab === 1 && (
            <>
              {/* Live Heart Rate Hero */}
              <LinearGradient colors={[colors.dangerSoft, colors.dangerSoft, colors.bg]} style={s.hrHero}>
                <View style={s.hrHeroLeft}>
                  <PulseHeart bpm={D.heartRate} />
                  <Text style={s.hrLabel}>HEART RATE</Text>
                </View>
                <View style={s.hrHeroRight}>
                  <Text style={s.hrBig}>{D.heartRate}</Text>
                  <Text style={s.hrUnit}>BPM</Text>
                  <Text style={s.hrSub}>Resting: {D.restingHR} bpm</Text>
                </View>
                <View style={s.hrRange}>
                  <Text style={s.hrRangeText}>Daily range</Text>
                  <Text style={s.hrRangeVal}>
                    <Text style={{ color: colors.success }}>{D.minHR}</Text>
                    <Text style={{ color: colors.faint }}> – </Text>
                    <Text style={{ color: colors.danger }}>{D.maxHR}</Text>
                    <Text style={{ color: colors.faint }}> bpm</Text>
                  </Text>
                </View>
              </LinearGradient>

              {/* Hourly HR chart */}
              <SectionLabel label="Hourly Heart Rate" icon="bar-chart-outline" iconColor={colors.danger} />
              <MiniCard>
                <BarChart data={HOURLY_HR.map(h => ({ label: h.h, value: h.v }))} color={colors.danger} barH={80} />
                <Text style={s.cardSubtitle}>Dips during sleep (12a–6a), peaks during afternoon activity.</Text>
              </MiniCard>

              {/* HRV */}
              <SectionLabel label="Heart Rate Variability" icon="pulse-outline" iconColor={colors.brand} />
              <LinearGradient colors={[colors.tealMid + '20', colors.brand + '05', colors.surface]} style={s.hrvCard}>
                <View style={s.hrvRow}>
                  <ProgressRing score={D.hrv} size={90} color={colors.brand} />
                  <View style={{ flex: 1, gap: 10 }}>
                    <View>
                      <Text style={s.hrvTitle}>HRV Score</Text>
                      <Text style={s.hrvVal}>{D.hrv}<Text style={{ fontSize: 14, color: colors.brand }}> ms</Text></Text>
                    </View>
                    <View style={s.hrvBadge}>
                      <Ionicons name="trending-up" size={12} color={colors.success} />
                      <Text style={s.hrvBadgeText}>+{D.hrv - D.hrvBaseline}ms above your 30-day avg</Text>
                    </View>
                    <Text style={s.cardSubtitle}>Higher HRV = better recovery capacity & stress tolerance.</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Vitals Grid */}
              <SectionLabel label="Other Vitals" icon="body-outline" iconColor={colors.success} />
              <View style={s.vitalsGrid}>
                <VitalTile icon="water-outline"     color={colors.info} label="Blood Oxygen"    value={D.spo2}          unit="%"     sublabel="Normal 95–100%" />
                <VitalTile icon="leaf-outline"      color={colors.success} label="Breathing Rate"  value={D.breathingRate} unit="br/m"  sublabel="Resting range" />
                <VitalTile icon="thermometer-outline" color={colors.accent} label="Body Temp"     value={D.bodyTemp}      unit="°C"    sublabel="Normal 36.1–37.2" />
                <VitalTile icon="cloudy-outline"    color={colors.warning} label="Stress Index"    value={D.stressIndex}   unit="/100"  sublabel="Low stress" />
                <VitalTile icon="fitness-outline"   color={colors.brand} label="VO₂ Max"         value={D.vo2max}        unit="ml/kg" sublabel="Above average" />
                <VitalTile icon="flame-outline"     color={colors.danger} label="Active Calories" value={D.activeCalories} unit="kcal" sublabel={`of ${D.caloriesGoal} goal`} />
              </View>

              {/* Activity Gauges */}
              <SectionLabel label="Activity Today" icon="barbell-outline" iconColor={colors.success} />
              <MiniCard style={{ gap: 16 }}>
                <Gauge value={D.steps}          maxValue={D.stepsGoal}     color={colors.success} label="Steps"              unit={`/ ${(D.stepsGoal/1000).toFixed(0)}k`} />
                <Gauge value={D.exerciseMinutes} maxValue={60}             color={colors.brand} label="Exercise Minutes"   unit="/ 60 min" />
                <Gauge value={D.standHours}     maxValue={12}              color={colors.info} label="Stand Hours"        unit="/ 12 hrs" />
                <Gauge value={Math.round(D.distance * 10) / 10} maxValue={10} color={colors.accent} label="Distance"       unit={`/ 10 km`} />
              </MiniCard>
            </>
          )}

          {/* ══════════════════════════════════════════
              TAB 2 — SLEEP
          ══════════════════════════════════════════ */}
          {tab === 2 && (
            <>
              {/* Sleep Score Hero */}
              <LinearGradient colors={[colors.surface, colors.surface]} style={s.sleepHero}>
                <View style={s.glowOrb} />
                <ProgressRing score={D.sleepScore} size={130} color={colors.brand} />
                <View style={s.sleepHeroInfo}>
                  <Text style={s.sleepTotal}>{D.sleepTotal}<Text style={s.sleepTotalUnit}>h</Text></Text>
                  <Text style={s.sleepTotalLabel}>Total Sleep</Text>
                  <View style={s.sleepTimeRow}>
                    <Ionicons name="bed-outline" size={14} color={colors.faint} />
                    <Text style={s.sleepTimeText}>{D.sleepStart} → {D.sleepEnd}</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Sleep Stages Architecture */}
              <SectionLabel label="Sleep Architecture" icon="layers-outline" iconColor={colors.brand} />
              <MiniCard>
                <Text style={s.cardSubtitle}>Last night's sleep composition</Text>
                {/* Segmented bar */}
                <View style={s.stagesBar}>
                  {SLEEP_STAGES.map((st) => (
                    <View key={st.label} style={[s.stageSegment, { flex: st.hours, backgroundColor: st.color }]} />
                  ))}
                </View>
                {/* Legend */}
                {SLEEP_STAGES.map((st, i) => (
                  <View key={i} style={s.stageLegendRow}>
                    <View style={[s.stageDot, { backgroundColor: st.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.stageLegendLabel}>{st.label} Sleep</Text>
                      <Text style={s.stageLegendDesc}>{st.desc}</Text>
                    </View>
                    <Text style={[s.stageLegendHours, { color: st.color }]}>{st.hours}h</Text>
                    <Text style={s.stageLegendPct}>{D.sleepTotal ? Math.round((st.hours / D.sleepTotal) * 100) : 0}%</Text>
                  </View>
                ))}
              </MiniCard>

              {/* 7-Day Sleep Trend */}
              <SectionLabel label="7-Day Sleep Trend" icon="calendar-outline" iconColor={colors.brand} />
              <MiniCard>
                <BarChart data={WEEKLY.map(w => ({ label: w.day, value: w.sleep }))} color={colors.brand} barH={72} />
                <View style={s.weekAvgRow}>
                  <Text style={s.cardSubtitle}>Weekly avg:</Text>
                  <Text style={{ color: colors.brand, fontWeight: '700', fontSize: 14 }}>
                    {(WEEKLY.reduce((s, w) => s + w.sleep, 0) / WEEKLY.length).toFixed(1)}h
                  </Text>
                </View>
              </MiniCard>

              {/* Sleep Quality Metrics */}
              <SectionLabel label="Sleep Quality Metrics" icon="checkmark-circle-outline" iconColor={colors.success} />
              <View style={s.sleepMetricsGrid}>
                {[
                  { icon: 'moon', color: colors.brand, label: 'Sleep Latency', value: '8 min', note: 'Excellent (<20 min)' },
                  { icon: 'sync', color: colors.info, label: 'Sleep Cycles', value: '5 cycles', note: '90-min cycles' },
                  { icon: 'checkmark-circle', color: colors.success, label: 'Consistency', value: '87%', note: 'vs last 7 days' },
                  { icon: 'thermometer', color: colors.accent, label: 'Sleep Temp', value: '18.5°C', note: 'Optimal range' },
                ].map((m, i) => (
                  <LinearGradient key={i} colors={[m.color + '18', m.color + '05']} style={s.sleepMetricCard}>
                    <Ionicons name={m.icon as any} size={20} color={m.color} />
                    <Text style={s.sleepMetricLabel}>{m.label}</Text>
                    <Text style={[s.sleepMetricValue, { color: m.color }]}>{m.value}</Text>
                    <Text style={s.sleepMetricNote}>{m.note}</Text>
                  </LinearGradient>
                ))}
              </View>

              {/* AI Sleep Tip */}
              <LinearGradient colors={[colors.surface, colors.surface]} style={s.sleepTip}>
                <View style={s.sleepTipIcon}>
                  <Ionicons name="sparkles" size={18} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sleepTipTitle}>AI Sleep Coach</Text>
                  <Text style={s.sleepTipBody}>Your best sleep occurs when you're in bed by 10:30 PM. On days you sleep before 10:45 PM, your deep sleep increases by 22% and morning HRV is 14ms higher on average.</Text>
                </View>
              </LinearGradient>
            </>
          )}

          {/* ══════════════════════════════════════════
              TAB 3 — RECOVERY
          ══════════════════════════════════════════ */}
          {tab === 3 && (
            <>
              {/* Recovery Hero */}
              {(() => {
                const color = D.recoveryScore >= 75 ? colors.success : D.recoveryScore >= 50 ? colors.warning : colors.danger;
                const label = D.recoveryScore >= 75 ? 'OPTIMAL' : D.recoveryScore >= 50 ? 'MODERATE' : 'LOW';
                return (
                  <LinearGradient colors={[color + '18', colors.bg]} style={s.recoveryHero}>
                    <View style={s.glowOrb} />
                    <ProgressRing score={D.recoveryScore} size={140} color={color} />
                    <View style={s.recoveryMeta}>
                      <View style={[s.recoveryLabelBadge, { borderColor: color + '60', backgroundColor: color + '15' }]}>
                        <Text style={[s.recoveryLabelText, { color }]}>{label} RECOVERY</Text>
                      </View>
                      <Text style={s.recoveryDesc}>
                        {D.recoveryScore >= 75
                          ? 'Your body is primed. Go hard today.'
                          : D.recoveryScore >= 50
                          ? 'Moderate readiness. Stick to Zone 2.'
                          : 'Take a rest day. Your body needs it.'}
                      </Text>
                      <View style={s.recoveryRecoRow}>
                        <Ionicons name="barbell-outline" size={14} color={color} />
                        <Text style={[s.recoveryReco, { color }]}>
                          {D.recoveryScore >= 75 ? 'High-Intensity or Heavy Lift' : D.recoveryScore >= 50 ? 'Moderate Cardio or Strength' : 'Active Recovery or Yoga'}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                );
              })()}

              {/* HRV vs Baseline */}
              <SectionLabel label="HRV vs Baseline" icon="pulse-outline" iconColor={colors.brand} />
              <MiniCard>
                <View style={s.hrvCompareRow}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 36, fontWeight: '900', color: colors.brand }}>{D.hrv}</Text>
                    <Text style={{ fontSize: 11, color: colors.faint, marginTop: 2 }}>TODAY</Text>
                  </View>
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <View style={s.hrvArrow}>
                      <Ionicons name="trending-up" size={20} color={colors.success} />
                      <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>+{D.hrv - D.hrvBaseline}ms</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.faint }}>vs baseline</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 36, fontWeight: '900', color: colors.muted }}>{D.hrvBaseline}</Text>
                    <Text style={{ fontSize: 11, color: colors.faint, marginTop: 2 }}>30-DAY AVG</Text>
                  </View>
                </View>
                <Text style={[s.cardSubtitle, { marginTop: 10 }]}>HRV above baseline signals strong parasympathetic activity and recovery readiness.</Text>
              </MiniCard>

              {/* Muscle Recovery Map */}
              <SectionLabel label="Muscle Recovery Map" icon="body-outline" iconColor={colors.accent} />
              <MiniCard style={{ gap: 12 }}>
                {MUSCLE_GROUPS.map((m, i) => {
                  const color = m.soreness <= 25 ? colors.success : m.soreness <= 55 ? colors.warning : colors.danger;
                  const label = m.soreness <= 25 ? 'Ready' : m.soreness <= 55 ? 'Moderate' : 'Sore';
                  return (
                    <View key={i}>
                      {i > 0 && <View style={s.divider} />}
                      <View style={[s.muscleRow, { marginTop: i > 0 ? 12 : 0 }]}>
                        <Text style={s.muscleGroup}>{m.group}</Text>
                        <Text style={s.muscleDate}>{m.lastTrained}</Text>
                        <View style={s.muscleBarWrap}>
                          <View style={s.muscleBarTrack}>
                            <LinearGradient colors={[color, color + '80']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.muscleBarFill, { width: `${m.soreness}%` }]} />
                          </View>
                        </View>
                        <View style={[s.muscleBadge, { backgroundColor: color + '20', borderColor: color + '50' }]}>
                          <Text style={[s.muscleBadgeText, { color }]}>{label}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </MiniCard>

              {/* Training Periodization */}
              <SectionLabel label="This Week's Training Plan" icon="calendar-outline" iconColor={colors.warning} />
              <MiniCard>
                {[
                  { day: 'Sun',  done: true,  type: 'Rest',         icon: 'bed-outline',    color: colors.faint },
                  { day: 'Mon',  done: true,  type: 'Strength',     icon: 'barbell-outline', color: colors.brand },
                  { day: 'Tue',  done: true,  type: 'Cardio',       icon: 'bicycle-outline', color: colors.success },
                  { day: 'Wed',  done: true,  type: 'Strength',     icon: 'barbell-outline', color: colors.brand },
                  { day: 'Thu',  done: true,  type: 'HIIT',         icon: 'flame-outline',   color: colors.danger },
                  { day: 'Fri',  done: true,  type: 'Active Rest',  icon: 'walk-outline',    color: colors.muted },
                  { day: 'Sat',  done: false, type: 'Peak Day 🔥',  icon: 'trophy-outline',  color: colors.warning },
                ].map((d, i) => (
                  <View key={i} style={[s.planRow, i < 6 && { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, marginBottom: 10 }]}>
                    <Text style={[s.planDay, d.done && { color: colors.faint }]}>{d.day}</Text>
                    <View style={[s.planIcon, { backgroundColor: d.color + '20', opacity: d.done ? 0.5 : 1 }]}>
                      <Ionicons name={d.icon as any} size={14} color={d.color} />
                    </View>
                    <Text style={[s.planType, d.done && { color: colors.faint }]}>{d.type}</Text>
                    {d.done
                      ? <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                      : <LinearGradient colors={[colors.warning, colors.warning]} style={s.todayPill}><Text style={s.todayPillText}>TODAY</Text></LinearGradient>
                    }
                  </View>
                ))}
              </MiniCard>
            </>
          )}

          {/* ══════════════════════════════════════════
              TAB 4 — TRENDS
          ══════════════════════════════════════════ */}
          {tab === 4 && (
            <>
              {/* Week comparison */}
              <LinearGradient colors={[colors.infoSoft + '20', colors.surface]} style={s.weekCompCard}>
                <Text style={s.weekCompTitle}>Week vs Last Week</Text>
                <View style={s.weekCompGrid}>
                  {[
                    { label: 'Avg Steps',   curr: 10234, prev: 8890,  color: colors.success, icon: 'footsteps-outline' },
                    { label: 'Avg Sleep',   curr: 7.4,   prev: 7.1,   color: colors.brand, icon: 'moon-outline' },
                    { label: 'Avg Calories',curr: 2190,  prev: 2050,  color: colors.accent, icon: 'flame-outline' },
                    { label: 'Avg HR',      curr: 68,    prev: 71,    color: colors.danger, icon: 'heart-outline' },
                  ].map((item, i) => {
                    const delta = typeof item.curr === 'number' && typeof item.prev === 'number'
                      ? (((item.curr - item.prev) / item.prev) * 100).toFixed(1)
                      : '0';
                    const up = parseFloat(delta) >= 0;
                    const goodUp = item.label !== 'Avg HR';
                    const good = goodUp ? up : !up;
                    return (
                      <View key={i} style={s.weekCompItem}>
                        <Ionicons name={item.icon as any} size={16} color={item.color} />
                        <Text style={s.weekCompLabel}>{item.label}</Text>
                        <Text style={[s.weekCompVal, { color: item.color }]}>{item.curr}</Text>
                        <View style={s.weekCompDelta}>
                          <Ionicons name={up ? 'trending-up' : 'trending-down'} size={12} color={good ? colors.success : colors.danger} />
                          <Text style={[s.weekCompDeltaText, { color: good ? colors.success : colors.danger }]}>{up ? '+' : ''}{delta}%</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </LinearGradient>

              <SectionLabel label="Daily Steps — 7 Days" icon="footsteps-outline" iconColor={colors.success} />
              <MiniCard>
                <BarChart data={WEEKLY.map(w => ({ label: w.day, value: w.steps }))} color={colors.success} barH={90} />
                <Text style={s.cardSubtitle}>Goal: {(D.stepsGoal / 1000).toFixed(0)}k steps/day · Best: {(() => { const b = WEEKLY.reduce((a, w) => (w.steps > a.steps ? w : a), WEEKLY[0]); return `${b.day} (${(b.steps / 1000).toFixed(1)}k)`; })()}</Text>
              </MiniCard>

              <SectionLabel label="Calorie Burn — 7 Days" icon="flame-outline" iconColor={colors.accent} />
              <MiniCard>
                <BarChart data={WEEKLY.map(w => ({ label: w.day, value: w.cal }))} color={colors.accent} barH={90} />
                <Text style={s.cardSubtitle}>Avg: {Math.round(WEEKLY.reduce((s, w) => s + w.cal, 0) / WEEKLY.length)} kcal/day</Text>
              </MiniCard>

              <SectionLabel label="Sleep Duration — 7 Days" icon="moon-outline" iconColor={colors.brand} />
              <MiniCard>
                <BarChart data={WEEKLY.map(w => ({ label: w.day, value: w.sleep }))} color={colors.brand} barH={90} />
                <Text style={s.cardSubtitle}>Optimal target: 8h · Avg: {(WEEKLY.reduce((s, w) => s + w.sleep, 0) / WEEKLY.length).toFixed(1)}h</Text>
              </MiniCard>

              <SectionLabel label="Resting Heart Rate — 7 Days" icon="heart-outline" iconColor={colors.danger} />
              <MiniCard>
                <BarChart data={WEEKLY.map(w => ({ label: w.day, value: w.hr }))} color={colors.danger} barH={90} />
                <Text style={s.cardSubtitle}>Lower is better · Best: {Math.min(...WEEKLY.map(w => w.hr).filter(Boolean)) || '—'} bpm</Text>
              </MiniCard>

              {/* Monthly Health Score Trend */}
              <SectionLabel label="Health Score Trajectory" icon="trending-up-outline" iconColor={colors.success} />
              <MiniCard>
                <BarChart
                  data={[
                    { label: 'Jan', value: 71 }, { label: 'Feb', value: 73 }, { label: 'Mar', value: 76 },
                    { label: 'Apr', value: 74 }, { label: 'May', value: 80 }, { label: 'Jun', value: 87 },
                  ]}
                  color={colors.success}
                  barH={90}
                />
                <View style={s.peakWindowRow}>
                  <Ionicons name="trending-up" size={14} color={colors.success} />
                  <Text style={s.peakWindowText}>+16 points in 6 months — You're trending toward your healthiest self.</Text>
                </View>
              </MiniCard>
            </>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  sourceBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, backgroundColor: colors.infoSoft,
  },
  sourceBannerText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 16 },
  root: { flex: 1 },
  safe: { flex: 1 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  aiBadgeText: { fontSize: 11, color: colors.brand, fontWeight: '600' },
  syncBtn: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.brand + '40' },
  syncBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9 },
  syncBtnText: { color: colors.brand, fontWeight: '700', fontSize: 13 },

  tabRow: { marginBottom: 12, gap: 6 },
  tabPill: { paddingHorizontal: 4, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tabPillActive: { borderColor: colors.brand },
  tabText: { fontSize: 12, color: colors.faint, fontWeight: '600', textAlign: 'center' },
  tabTextActive: { color: colors.white, fontWeight: '700' },

  // Overview
  scoreHero: { borderRadius: 22, padding: 20, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  glowOrb: { display: 'none', position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: colors.brand, opacity: 0.10, top: -60, right: -40 },
  scoreHeroRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 16 },
  scoreGreeting: { fontSize: 13, color: colors.muted, fontWeight: '500' },
  scoreName: { fontSize: 17, fontWeight: '800', color: colors.ink, marginTop: 2 },
  scoreMetaCol: { flex: 1 },
  scoreMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreMetaV: { fontSize: 14, fontWeight: '800', minWidth: 46 },
  scoreMetaL: { fontSize: 12, color: colors.faint },
  bioAge: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.info + '30' },
  bioAgeTitle: { fontSize: 12, color: colors.muted, fontWeight: '600', marginBottom: 2 },
  bioAgeBody: { fontSize: 13, color: colors.inkSoft, lineHeight: 18 },
  bioAgeBadge: { alignItems: 'center', backgroundColor: colors.info + '25', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.info + '40' },
  bioAgeBadgeText: { fontSize: 22, fontWeight: '900', color: colors.info },
  bioAgeBadgeSub: { fontSize: 9, color: colors.faint, fontWeight: '700', letterSpacing: 0.5 },

  anomaly: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 13, marginBottom: 4, borderWidth: 1, borderColor: colors.success + '30' },
  anomalyIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  anomalyText: { flex: 1, fontSize: 13, color: colors.inkSoft, lineHeight: 18 },

  insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  insightIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  insightTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  insightBody: { fontSize: 13, color: colors.muted, lineHeight: 19 },

  peakWindowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: colors.success + '10', borderRadius: 10, padding: 10 },
  peakWindowText: { flex: 1, fontSize: 12, color: colors.muted, lineHeight: 18 },

  corrRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  corrEmoji: { fontSize: 24 },
  corrPattern: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 2 },
  corrResult: { fontSize: 12, color: colors.muted },
  confBadge: { backgroundColor: colors.success + '20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.success + '40' },
  confText: { fontSize: 11, fontWeight: '800', color: colors.success },

  circadian: { borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.accent + '30', gap: 0 },
  circRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt },
  circIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  circLabel: { fontSize: 11, color: colors.muted, fontWeight: '500', marginBottom: 2 },
  circTime: { fontSize: 14, fontWeight: '700' },

  devicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  deviceCard: { width: (SW - 52) / 3, height: 108, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  deviceCardInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7 },
  deviceName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  deviceDot: { width: 6, height: 6, borderRadius: 3 },

  cardSubtitle: { fontSize: 12, color: colors.faint, lineHeight: 18, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border },
  weekAvgRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },

  // Vitals
  hrHero: { borderRadius: 22, padding: 20, marginBottom: 4, overflow: 'hidden', borderWidth: 1, borderColor: colors.danger + '30' },
  hrHeroLeft: { alignItems: 'center', gap: 6, marginBottom: 8 },
  hrLabel: { fontSize: 10, fontWeight: '800', color: colors.danger, letterSpacing: 1.5 },
  hrHeroRight: { alignItems: 'center', marginBottom: 12 },
  hrBig: { fontSize: 72, fontWeight: '900', color: colors.ink, lineHeight: 80 },
  hrUnit: { fontSize: 16, color: colors.danger, fontWeight: '700', marginTop: -8 },
  hrSub: { fontSize: 13, color: colors.faint, marginTop: 4 },
  hrRange: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.black + '30', borderRadius: 10, padding: 10 },
  hrRangeText: { fontSize: 12, color: colors.faint },
  hrRangeVal: { fontSize: 13, fontWeight: '600' },

  hrvCard: { borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.brand + '30' },
  hrvRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  hrvTitle: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  hrvVal: { fontSize: 36, fontWeight: '900', color: colors.brand, marginTop: 2 },
  hrvBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.success + '15', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.success + '30' },
  hrvBadgeText: { fontSize: 12, color: colors.success, fontWeight: '600' },

  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  // Sleep
  sleepHero: { borderRadius: 22, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 4, overflow: 'hidden', borderWidth: 1, borderColor: colors.brand + '30' },
  sleepHeroInfo: { flex: 1 },
  sleepTotal: { fontSize: 52, fontWeight: '900', color: colors.ink, lineHeight: 60 },
  sleepTotalUnit: { fontSize: 22, color: colors.brand },
  sleepTotalLabel: { fontSize: 13, color: colors.muted, marginTop: 4 },
  sleepTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  sleepTimeText: { fontSize: 12, color: colors.faint, fontWeight: '500' },

  stagesBar: { flexDirection: 'row', height: 20, borderRadius: 10, overflow: 'hidden', marginVertical: 14 },
  stageSegment: { height: '100%' },
  stageLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  stageDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  stageLegendLabel: { fontSize: 13, fontWeight: '700', color: colors.ink },
  stageLegendDesc: { fontSize: 11, color: colors.faint, marginTop: 1 },
  stageLegendHours: { fontSize: 14, fontWeight: '800' },
  stageLegendPct: { fontSize: 12, color: colors.faint, width: 36, textAlign: 'right' },

  sleepMetricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sleepMetricCard: { width: (SW - 42) / 2, borderRadius: 16, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.border },
  sleepMetricLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  sleepMetricValue: { fontSize: 20, fontWeight: '900' },
  sleepMetricNote: { fontSize: 10, color: colors.faint },

  sleepTip: { borderRadius: 18, padding: 16, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: colors.brand + '30', marginTop: 4 },
  sleepTipIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.brand + '25', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  sleepTipTitle: { fontSize: 13, fontWeight: '700', color: colors.brand, marginBottom: 4 },
  sleepTipBody: { fontSize: 13, color: colors.muted, lineHeight: 19 },

  // Recovery
  recoveryHero: { borderRadius: 22, padding: 20, alignItems: 'center', gap: 16, marginBottom: 4, overflow: 'hidden', borderWidth: 1, borderColor: colors.success + '20' },
  recoveryMeta: { alignItems: 'center', gap: 8 },
  recoveryLabelBadge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 6 },
  recoveryLabelText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  recoveryDesc: { fontSize: 14, color: colors.inkSoft, textAlign: 'center', lineHeight: 20 },
  recoveryRecoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recoveryReco: { fontSize: 13, fontWeight: '700' },

  hrvCompareRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8 },
  hrvArrow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  muscleGroup: { fontSize: 14, fontWeight: '700', color: colors.ink, width: 46 },
  muscleDate: { fontSize: 11, color: colors.faint, width: 72 },
  muscleBarWrap: { flex: 1 },
  muscleBarTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  muscleBarFill: { height: '100%', borderRadius: 3 },
  muscleBadge: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  muscleBadgeText: { fontSize: 11, fontWeight: '700' },

  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planDay: { fontSize: 13, fontWeight: '700', color: colors.ink, width: 30 },
  planIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  planType: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
  todayPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  todayPillText: { fontSize: 10, fontWeight: '800', color: colors.white },

  // Trends
  weekCompCard: { borderRadius: 18, padding: 16, marginBottom: 4, borderWidth: 1, borderColor: colors.info + '30' },
  weekCompTitle: { fontSize: 13, fontWeight: '800', color: colors.muted, marginBottom: 14, letterSpacing: 0.5 },
  weekCompGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  weekCompItem: { width: (SW - 64) / 2, gap: 4 },
  weekCompLabel: { fontSize: 11, color: colors.faint },
  weekCompVal: { fontSize: 22, fontWeight: '900' },
  weekCompDelta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  weekCompDeltaText: { fontSize: 12, fontWeight: '700' },
});

// Vital tile style (separate to keep organized)
const vitS = StyleSheet.create({
  tile: { width: (SW - 42) / 2, borderRadius: 16, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.border },
  tileIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  tileLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  tileValue: { fontSize: 22, fontWeight: '900' },
  tileUnit: { fontSize: 12, color: colors.muted, fontWeight: '400' },
  tileSub: { fontSize: 10, color: colors.faint },
});
