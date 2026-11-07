import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Dimensions, Animated, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/api';
import { Meal, Workout, RootStackParamList } from '../../types';
import ChatFAB from '../../components/chat/ChatFAB';
import { HomeSkeleton } from '../../components/states/Skeleton';
import { ErrorState } from '../../components/states/StateViews';
import StaleNote from '../../components/states/StaleNote';
import { loadWithCache } from '../../config/cache';

import { colors } from '../../theme/colors';
import RankCard from '../../features/mission/RankCard';
import MissionsCard from '../../features/mission/MissionsCard';
import WaterCard from '../../features/mission/WaterCard';
import BriefingCard from '../../features/mission/BriefingCard';
import BadgesRow from '../../features/mission/BadgesRow';
import { GOALS, Mission, badgesFor, dayKey, insightsFor, levelFromXp } from '../../features/mission/missionLogic';
import { loadWater, saveWater } from '../../features/mission/missionStore';
import { useTargets } from '../../features/profile/targetsStore';
interface ServerProgress { xp: number; level: number; streak: number; missions: (Mission & { claimed: boolean })[]; claimableXp: number; awarded?: number }

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const { width: SW } = Dimensions.get('window');

const WORKOUT_GOAL = GOALS.workouts;

const QUICK_ACTIONS = [
  { label: 'Scan Meal',    icon: 'camera',        color: colors.success, bg: [colors.successSoft, colors.successSoft] as const, route: 'FoodScanner' },
  { label: 'Log Workout',  icon: 'barbell',       color: colors.brand, bg: [colors.brandSoft, colors.brandSoft] as const, route: 'Streak' },
  { label: 'Challenges',   icon: 'trophy',        color: colors.warning, bg: [colors.warningSoft, colors.warningSoft] as const, route: 'Challenges' },
  { label: 'Food Search',  icon: 'search',        color: colors.info, bg: [colors.infoSoft, colors.infoSoft] as const, route: 'FoodSearch' },
];

function Ring({ pct, size, color, icon, label }: { pct: number; size: number; color: string; icon: string; label: string }) {
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(pct / 100, 1) * circumference;
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View style={{ width: size, height: size }}>
        {/* Track */}
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 5, borderColor: color + '22' }} />
        {/* Fill (approximated with gradient arc) */}
        <LinearGradient
          colors={[color, color + 'aa']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute', width: size, height: size, borderRadius: size / 2,
            borderWidth: 5, borderColor: 'transparent',
            opacity: Math.min(pct / 100 + 0.15, 1),
          }}
        />
        <View style={{
          position: 'absolute', width: size - 14, height: size - 14,
          top: 7, left: 7, borderRadius: (size - 14) / 2,
          backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
        }}>
          <Ionicons name={icon as any} size={size * 0.28} color={color} />
          <Text style={{ fontSize: size * 0.2, fontWeight: '900', color, lineHeight: size * 0.25 }}>
            {Math.min(Math.round(pct), 100)}
          </Text>
          <Text style={{ fontSize: size * 0.12, color: colors.faint }}>%</Text>
        </View>
      </View>
      <Text style={{ fontSize: 10, color: colors.muted, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, updateUser } = useAuth();
  const targets = useTargets();
  const CAL_GOAL = targets.calories;
  const PROTEIN_GOAL = targets.protein;
  const goals = { ...GOALS, ...targets };
  const [meals, setMeals] = useState<Meal[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [water, setWater] = useState(0);
  // XP, level, streak and the daily missions are decided by the server, from what has really been logged.
  const [progress, setProgress] = useState<ServerProgress | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Water is saved per calendar day on this phone (and sent to the server when it checks the hydration mission).
  const uid = user?._id || user?.email || 'me';
  useEffect(() => { loadWater(uid, dayKey()).then(setWater); }, [uid]);

  const loadProgress = useCallback(async (glasses = water) => {
    try {
      const res = await api.get('/progress/missions', { params: { day: dayKey(), tz: new Date().getTimezoneOffset(), calories: targets.calories, protein: targets.protein, water: targets.water, glasses } });
      const snap = res.data?.data as ServerProgress;
      setProgress(snap);
      updateUser({ xp: snap.xp, level: snap.level, streak: snap.streak });
    } catch { /* offline: the missions card simply waits until we are back */ }
  }, [water, targets.calories, targets.protein, targets.water, updateUser]);

  // Whenever you come back to Home (after logging a meal or a workout, say) the day is read again.
  useFocusEffect(useCallback(() => { fetchData(); loadProgress(); }, [loadProgress]));

  useEffect(() => {
    // Pulse animation for streak
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const [savedAt, setSavedAt] = useState<number | undefined>();
  const fetchData = async () => {
    const r = await loadWithCache('home', async () => {
      const [mealsRes, workoutsRes] = await Promise.all([api.get('/meals'), api.get('/workouts')]);
      return { meals: (mealsRes.data.data || []) as Meal[], workouts: (workoutsRes.data.data || []) as Workout[] };
    });
    if (r.data) { setMeals(r.data.meals); setWorkouts(r.data.workouts); }
    setFailed(!r.data);
    setSavedAt(r.fromCache ? r.savedAt ?? Date.now() : undefined);
    setLoading(false);
  };

  const onRefresh = async () => { setRefreshing(true); await Promise.all([fetchData(), loadProgress()]); setRefreshing(false); };

  const today = new Date().toDateString();
  const todayMeals = meals.filter(m => new Date(m.timestamp).toDateString() === today);
  const todayWorkouts = workouts.filter(w => new Date(w.timestamp).toDateString() === today);
  const totalCalories = todayMeals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = todayMeals.reduce((s, m) => s + (m.protein || 0), 0);

  const calPct = (totalCalories / CAL_GOAL) * 100;
  const protPct = (totalProtein / PROTEIN_GOAL) * 100;
  const workPct = (todayWorkouts.length / WORKOUT_GOAL) * 100;

  const name = user?.displayName || user?.email?.split('@')[0] || 'Champ';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const currentXP = progress?.xp ?? user?.xp ?? 0;
  const streak = progress?.streak ?? user?.streak ?? 0;

  // Missions, briefing and medals are all worked out from what has really been logged.
  const missions: Mission[] = progress?.missions ?? [];
  const claimed = missions.filter(m => (m as any).claimed).map(m => m.id);
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const workoutsLast7 = workouts.filter(w => new Date(w.timestamp).getTime() >= weekAgo).length;
  const daysWithMealsLast7 = new Set(meals.filter(m => new Date(m.timestamp).getTime() >= weekAgo).map(m => dayKey(new Date(m.timestamp)))).size;
  const insights = insightsFor({ todayCalories: totalCalories, todayProtein: totalProtein, todayWorkouts: todayWorkouts.length, todayMeals: todayMeals.length, streak, hour, workoutsLast7, daysWithMealsLast7 }, goals);
  const badges = badgesFor({ meals: meals.length, workouts: workouts.length, streak, level: levelFromXp(currentXP) });

  const changeWater = (n: number) => { setWater(n); saveWater(uid, dayKey(), n); loadProgress(n); };

  // Collect XP: the server checks the missions are really complete, pays each one once, and answers with the new totals.
  const claimMissions = async (ids: string[]): Promise<boolean> => {
    try {
      const res = await api.post('/progress/missions/claim', { day: dayKey(), tz: new Date().getTimezoneOffset(), targets, glasses: water, ids });
      const snap = res.data?.data as ServerProgress;
      setProgress(snap);
      updateUser({ xp: snap.xp, level: snap.level, streak: snap.streak });
      return (snap.awarded ?? 0) > 0;
    } catch (e: any) {
      Alert.alert('Could not collect XP', e?.response?.data?.message || 'Check your connection and try again. Your mission is still complete.');
      return false;
    }
  };

  const recentActivity = [
    ...todayMeals.slice(0, 2).map(m => ({ type: 'meal' as const, label: m.foodName, meta: `${m.calories} kcal`, emoji: '🍽️', color: colors.success })),
    ...todayWorkouts.slice(0, 2).map(w => ({ type: 'workout' as const, label: w.exercise, meta: `${w.duration} min`, emoji: '💪', color: colors.brand })),
  ];

  return (
    <View style={s.root}>
      <LinearGradient colors={['transparent', 'transparent', 'transparent']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          contentContainerStyle={{ paddingBottom: 110 }}
        >

          {/* ── Header ── */}
          <View style={s.header}>
            <View>
              <Text style={s.greeting}>{greeting},</Text>
              <Text style={s.name}>{name} 👋</Text>
            </View>
          </View>

          <RankCard xp={currentXP} streak={streak} />

          {savedAt !== undefined && <StaleNote savedAt={savedAt} what="Your day is" />}
          {loading ? <HomeSkeleton /> : failed && meals.length === 0 && workouts.length === 0 ? (
            <ErrorState onRetry={() => { setLoading(true); fetchData(); }} />
          ) : (
          <>
          {/* ── Daily Goals Rings ── */}
          <LinearGradient colors={[colors.surface, colors.surface]} style={s.ringsCard}>
            <View style={s.glowOrb} />
            <Text style={s.ringsTitle}>Daily Goals</Text>
            <View style={s.ringsRow}>
              <Ring pct={calPct}  size={100} color={colors.success} icon="restaurant"  label="Calories" />
              <Ring pct={protPct} size={100} color={colors.brand} icon="fitness"     label="Protein" />
              <Ring pct={workPct} size={100} color={colors.accent} icon="barbell"     label="Workouts" />
            </View>
            <View style={s.ringsLegend}>
              {[
                { label: `${totalCalories} / ${CAL_GOAL} kcal`, color: colors.success },
                { label: `${totalProtein} / ${PROTEIN_GOAL}g`,   color: colors.brand },
                { label: `${todayWorkouts.length} / ${WORKOUT_GOAL} session`, color: colors.accent },
              ].map((r, i) => (
                <View key={i} style={{ alignItems: 'center' }}>
                  <Text style={[s.ringsLegendText, { color: r.color }]}>{r.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          {/* ── Quick Actions ── */}
          <Text style={s.sectionLabel}>Quick Actions</Text>
          <View style={s.quickGrid}>
            {QUICK_ACTIONS.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={s.quickCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate(a.route as any)}
              >
                <LinearGradient colors={a.bg} style={s.quickCardInner}>
                  <View style={[s.quickIconWrap, { backgroundColor: a.color + '30' }]}>
                    <Ionicons name={a.icon as any} size={22} color={a.color} />
                  </View>
                  <Text style={s.quickLabel}>{a.label}</Text>
                  <Ionicons name="chevron-forward" size={14} color={a.color + '80'} />
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Missions, hydration and briefing ── */}
          {progress ? <MissionsCard missions={missions} claimed={claimed} onClaim={claimMissions} /> : null}
          <WaterCard glasses={water} goal={goals.water} onChange={changeWater} />
          <BriefingCard insights={insights} onAsk={() => navigation.navigate('Chat')} />

          {/* ── Today's Activity ── */}
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>Today's Activity</Text>
            <Text style={s.sectionCount}>{recentActivity.length} logged</Text>
          </View>

          {recentActivity.length > 0 ? (
            recentActivity.map((item, i) => (
              <View key={i} style={s.activityItem}>
                <LinearGradient
                  colors={[item.color + '30', item.color + '00']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.activityBar}
                />
                <View style={[s.activityIconWrap, { backgroundColor: item.color + '20' }]}>
                  <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.activityLabel}>{item.label}</Text>
                  <Text style={s.activityMeta}>{item.meta}</Text>
                </View>
                <View style={[s.activityTypePill, { backgroundColor: item.color + '20', borderColor: item.color + '40' }]}>
                  <Text style={[s.activityTypeText, { color: item.color }]}>{item.type}</Text>
                </View>
              </View>
            ))
          ) : (
            <LinearGradient colors={[colors.surface, colors.surface]} style={s.emptyCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🚀</Text>
              <Text style={s.emptyTitle}>Start your day strong!</Text>
              <Text style={s.emptyHint}>Scan a meal or log a workout to get started</Text>
              <TouchableOpacity onPress={() => navigation.navigate('FoodScanner' as any)} style={s.emptyCta}>
                <LinearGradient colors={[colors.brand, colors.tealMid]} style={s.emptyCtaGrad}>
                  <Ionicons name="camera" size={16} color={colors.white} />
                  <Text style={s.emptyCtaText}>Scan First Meal</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          )}

          {/* ── Macro Breakdown ── */}
          <Text style={[s.sectionLabel, { marginTop: 24 }]}>Today's Macros</Text>
          <LinearGradient colors={[colors.surface, colors.surface]} style={s.macroCard}>
            {[
              { label: 'Calories', value: totalCalories, goal: CAL_GOAL,     unit: 'kcal', color: colors.success },
              { label: 'Protein',  value: totalProtein,  goal: PROTEIN_GOAL, unit: 'g',    color: colors.brand },
              { label: 'Carbs',    value: todayMeals.reduce((s, m) => s + (m.carbs || 0), 0),  goal: 250, unit: 'g', color: colors.warning },
              { label: 'Fat',      value: todayMeals.reduce((s, m) => s + (m.fat || 0), 0),    goal: 70,  unit: 'g', color: colors.accent },
            ].map((m, i) => (
              <View key={i} style={[s.macroRow, i > 0 && { marginTop: 14 }]}>
                <Text style={s.macroRowLabel}>{m.label}</Text>
                <View style={s.macroTrackWrap}>
                  <View style={s.macroTrack}>
                    <LinearGradient
                      colors={[m.color, m.color + 'aa']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[s.macroFill, { width: `${Math.min((m.value / m.goal) * 100, 100)}%` }]}
                    />
                  </View>
                </View>
                <Text style={[s.macroValue, { color: m.color }]}>{m.value}<Text style={s.macroUnit}>{m.unit}</Text></Text>
              </View>
            ))}
          </LinearGradient>

          <BadgesRow badges={badges} />

          </>
          )}
        </ScrollView>
      </SafeAreaView>

      <ChatFAB onPress={() => navigation.navigate('Chat')} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  greeting: { fontSize: 13, color: colors.muted },
  name: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.5, marginTop: 1 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.accent + '30' },
  streakBadgeText: { color: colors.accent, fontWeight: '800', fontSize: 13 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  levelText: { color: colors.white, fontWeight: '700', fontSize: 12 },

  xpRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 6, marginTop: 4 },
  xpLabel: { fontSize: 11, color: colors.muted },
  xpTotal: { fontSize: 11, color: colors.brand, fontWeight: '700' },
  xpTrack: { marginHorizontal: 20, height: 5, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 20 },
  xpFill: { height: '100%', borderRadius: 3 },

  ringsCard: { marginHorizontal: 20, borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  glowOrb: { display: 'none', position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: colors.brand, opacity: 0.08, top: -50, right: -30 },
  glowOrbRight: { display: 'none', position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: colors.brandBright, opacity: 0.07, top: -30, right: -20 },
  ringsTitle: { fontSize: 13, fontWeight: '800', color: colors.ink, letterSpacing: 0.5, marginBottom: 18 },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
  ringsLegend: { flexDirection: 'row', justifyContent: 'space-around' },
  ringsLegendText: { fontSize: 10, fontWeight: '700' },

  sectionLabel: { fontSize: 14, fontWeight: '800', color: colors.ink, paddingHorizontal: 20, marginBottom: 12, letterSpacing: 0.3 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12, marginTop: 8 },
  sectionCount: { fontSize: 12, color: colors.faint },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  quickCard: { width: (SW - 50) / 2, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  quickCardInner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  quickIconWrap: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink },

  tipCard: { marginHorizontal: 20, borderRadius: 22, padding: 18, marginBottom: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  tipIconWrap: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  tipBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  tipBadge: { fontSize: 9, fontWeight: '800', color: colors.brand, letterSpacing: 1 },
  tipTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  tipBody: { fontSize: 13, color: colors.muted, lineHeight: 19, marginBottom: 14 },
  tipCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brand + '20', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.brand + '40' },
  tipCtaText: { fontSize: 12, fontWeight: '700', color: colors.brand },

  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 14, marginHorizontal: 20, marginBottom: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  activityBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  activityIconWrap: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  activityLabel: { fontSize: 14, fontWeight: '600', color: colors.ink },
  activityMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  activityTypePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  activityTypeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  emptyCard: { marginHorizontal: 20, borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  emptyHint: { fontSize: 12, color: colors.faint, marginBottom: 16, textAlign: 'center' },
  emptyCta: { borderRadius: 14, overflow: 'hidden' },
  emptyCtaGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  emptyCtaText: { fontSize: 14, fontWeight: '700', color: colors.white },

  macroCard: { marginHorizontal: 20, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  macroRowLabel: { fontSize: 12, color: colors.muted, width: 60 },
  macroTrackWrap: { flex: 1 },
  macroTrack: { height: 7, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 4 },
  macroValue: { fontSize: 13, fontWeight: '800', width: 56, textAlign: 'right' },
  macroUnit: { fontSize: 10, fontWeight: '400', color: colors.faint },
});
