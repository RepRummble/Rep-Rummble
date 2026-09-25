import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Dimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/api';
import { Meal, Workout, RootStackParamList } from '../../types';
import ChatFAB from '../../components/chat/ChatFAB';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const { width: SW } = Dimensions.get('window');

const CAL_GOAL = 2200;
const PROTEIN_GOAL = 150;
const WORKOUT_GOAL = 1;

const AI_TIPS = [
  { icon: '💧', title: 'Hydration Check', body: 'You\'re 3 hours in — aim for 500ml water before your next meal to boost metabolism by 30%.' },
  { icon: '🏋️', title: 'Lift Heavy Today', body: 'Your HRV suggests you\'re recovered. Push a PR on bench press — body is primed.' },
  { icon: '🥗', title: 'Protein Window', body: 'Log a protein-rich meal within the next 2 hours to maximize muscle protein synthesis.' },
  { icon: '😴', title: 'Recovery Mode', body: '8 hours of sleep = 34% better next-day performance. Wind down by 10:30 PM tonight.' },
  { icon: '🔥', title: 'Keep the Streak', body: 'Streaks rewire habits. One small workout — even 10 min — keeps your chain alive.' },
];

const QUICK_ACTIONS = [
  { label: 'Scan Meal',    icon: 'camera',        color: '#22c55e', bg: ['#052e16', '#15803d'] as const, route: 'FoodScanner' },
  { label: 'Log Workout',  icon: 'barbell',       color: '#7c3aed', bg: ['#2e1065', '#4c1d95'] as const, route: 'Streak' },
  { label: 'Challenges',   icon: 'trophy',        color: '#eab308', bg: ['#422006', '#713f12'] as const, route: 'Challenges' },
  { label: 'Food Search',  icon: 'search',        color: '#3b82f6', bg: ['#0c1f3a', '#1e3a5f'] as const, route: 'FoodSearch' },
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
          backgroundColor: '#080b14', justifyContent: 'center', alignItems: 'center',
        }}>
          <Ionicons name={icon as any} size={size * 0.28} color={color} />
          <Text style={{ fontSize: size * 0.2, fontWeight: '900', color, lineHeight: size * 0.25 }}>
            {Math.min(Math.round(pct), 100)}
          </Text>
          <Text style={{ fontSize: size * 0.12, color: '#6b7280' }}>%</Text>
        </View>
      </View>
      <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const tipIdx = useRef(new Date().getHours() % AI_TIPS.length).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchData();
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

  const fetchData = async () => {
    try {
      const [mealsRes, workoutsRes] = await Promise.all([
        api.get('/meals'),
        api.get('/workouts'),
      ]);
      setMeals(mealsRes.data.data || []);
      setWorkouts(workoutsRes.data.data || []);
    } catch {}
  };

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

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
  const tip = AI_TIPS[tipIdx];

  // XP to next level
  const xpPerLevel = 500;
  const currentXP = user?.xp || 0;
  const xpInLevel = currentXP % xpPerLevel;
  const xpPct = (xpInLevel / xpPerLevel) * 100;

  const recentActivity = [
    ...todayMeals.slice(0, 2).map(m => ({ type: 'meal' as const, label: m.foodName, meta: `${m.calories} kcal`, emoji: '🍽️', color: '#22c55e' })),
    ...todayWorkouts.slice(0, 2).map(w => ({ type: 'workout' as const, label: w.exercise, meta: `${w.duration} min`, emoji: '💪', color: '#7c3aed' })),
  ];

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1a0533', '#0d0f1a', '#080b14']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
          contentContainerStyle={{ paddingBottom: 110 }}
        >

          {/* ── Header ── */}
          <View style={s.header}>
            <View>
              <Text style={s.greeting}>{greeting},</Text>
              <Text style={s.name}>{name} 👋</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <LinearGradient colors={['#f9731625', '#f9731610']} style={s.streakBadge}>
                  <Text style={{ fontSize: 16 }}>🔥</Text>
                  <Text style={s.streakBadgeText}>{user?.streak || 0}d</Text>
                </LinearGradient>
              </Animated.View>
              <LinearGradient colors={['#7c3aed', '#4f1d9a']} style={s.levelBadge}>
                <Ionicons name="trophy" size={12} color="#ffd700" />
                <Text style={s.levelText}>Lvl {user?.level || 1}</Text>
              </LinearGradient>
            </View>
          </View>

          {/* ── XP Progress ── */}
          <View style={s.xpRow}>
            <Text style={s.xpLabel}>{xpInLevel} / {xpPerLevel} XP to Level {(user?.level || 1) + 1}</Text>
            <Text style={s.xpTotal}>{currentXP} total</Text>
          </View>
          <View style={s.xpTrack}>
            <LinearGradient colors={['#7c3aed', '#a78bfa', '#22c55e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.xpFill, { width: `${xpPct}%` }]} />
          </View>

          {/* ── Daily Goals Rings ── */}
          <LinearGradient colors={['#1e0545', '#0d0f1a']} style={s.ringsCard}>
            <View style={s.glowOrb} />
            <Text style={s.ringsTitle}>Daily Goals</Text>
            <View style={s.ringsRow}>
              <Ring pct={calPct}  size={100} color="#22c55e" icon="restaurant"  label="Calories" />
              <Ring pct={protPct} size={100} color="#7c3aed" icon="fitness"     label="Protein" />
              <Ring pct={workPct} size={100} color="#f97316" icon="barbell"     label="Workouts" />
            </View>
            <View style={s.ringsLegend}>
              {[
                { label: `${totalCalories} / ${CAL_GOAL} kcal`, color: '#22c55e' },
                { label: `${totalProtein} / ${PROTEIN_GOAL}g`,   color: '#7c3aed' },
                { label: `${todayWorkouts.length} / ${WORKOUT_GOAL} session`, color: '#f97316' },
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

          {/* ── AI Coach Tip ── */}
          <LinearGradient colors={['#2a0a4a', '#1a0533', '#0d0f1a']} style={s.tipCard}>
            <View style={s.glowOrbRight} />
            <View style={s.tipHeader}>
              <View style={s.tipIconWrap}>
                <Text style={{ fontSize: 22 }}>{tip.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.tipBadgeRow}>
                  <Ionicons name="sparkles" size={10} color="#a78bfa" />
                  <Text style={s.tipBadge}>AI COACH</Text>
                </View>
                <Text style={s.tipTitle}>{tip.title}</Text>
              </View>
            </View>
            <Text style={s.tipBody}>{tip.body}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Chat')} style={s.tipCta}>
              <Text style={s.tipCtaText}>Ask AI Coach</Text>
              <Ionicons name="arrow-forward" size={13} color="#a78bfa" />
            </TouchableOpacity>
          </LinearGradient>

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
            <LinearGradient colors={['#161b2e', '#0d0f1a']} style={s.emptyCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🚀</Text>
              <Text style={s.emptyTitle}>Start your day strong!</Text>
              <Text style={s.emptyHint}>Scan a meal or log a workout to get started</Text>
              <TouchableOpacity onPress={() => navigation.navigate('FoodScanner' as any)} style={s.emptyCta}>
                <LinearGradient colors={['#22c55e', '#15803d']} style={s.emptyCtaGrad}>
                  <Ionicons name="camera" size={16} color="#fff" />
                  <Text style={s.emptyCtaText}>Scan First Meal</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          )}

          {/* ── Macro Breakdown ── */}
          <Text style={[s.sectionLabel, { marginTop: 24 }]}>Today's Macros</Text>
          <LinearGradient colors={['#161b2e', '#0d0f1a']} style={s.macroCard}>
            {[
              { label: 'Calories', value: totalCalories, goal: CAL_GOAL,     unit: 'kcal', color: '#22c55e' },
              { label: 'Protein',  value: totalProtein,  goal: PROTEIN_GOAL, unit: 'g',    color: '#7c3aed' },
              { label: 'Carbs',    value: todayMeals.reduce((s, m) => s + (m.carbs || 0), 0),  goal: 250, unit: 'g', color: '#eab308' },
              { label: 'Fat',      value: todayMeals.reduce((s, m) => s + (m.fat || 0), 0),    goal: 70,  unit: 'g', color: '#f97316' },
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
  greeting: { fontSize: 13, color: '#94a3b8' },
  name: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginTop: 1 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#f9731630' },
  streakBadgeText: { color: '#f97316', fontWeight: '800', fontSize: 13 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  levelText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  xpRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 6, marginTop: 4 },
  xpLabel: { fontSize: 11, color: '#94a3b8' },
  xpTotal: { fontSize: 11, color: '#a78bfa', fontWeight: '700' },
  xpTrack: { marginHorizontal: 20, height: 5, backgroundColor: '#2d3561', borderRadius: 3, overflow: 'hidden', marginBottom: 20 },
  xpFill: { height: '100%', borderRadius: 3 },

  ringsCard: { marginHorizontal: 20, borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#3b1e6b50', overflow: 'hidden' },
  glowOrb: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#7c3aed', opacity: 0.08, top: -50, right: -30 },
  glowOrbRight: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: '#a78bfa', opacity: 0.07, top: -30, right: -20 },
  ringsTitle: { fontSize: 13, fontWeight: '800', color: '#e2e8f0', letterSpacing: 0.5, marginBottom: 18 },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
  ringsLegend: { flexDirection: 'row', justifyContent: 'space-around' },
  ringsLegendText: { fontSize: 10, fontWeight: '700' },

  sectionLabel: { fontSize: 14, fontWeight: '800', color: '#e2e8f0', paddingHorizontal: 20, marginBottom: 12, letterSpacing: 0.3 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12, marginTop: 8 },
  sectionCount: { fontSize: 12, color: '#6b7280' },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  quickCard: { width: (SW - 50) / 2, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#2d356140' },
  quickCardInner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  quickIconWrap: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: '#f1f5f9' },

  tipCard: { marginHorizontal: 20, borderRadius: 22, padding: 18, marginBottom: 8, borderWidth: 1, borderColor: '#3b1e6b50', overflow: 'hidden' },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  tipIconWrap: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#ffffff10', justifyContent: 'center', alignItems: 'center' },
  tipBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  tipBadge: { fontSize: 9, fontWeight: '800', color: '#a78bfa', letterSpacing: 1 },
  tipTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  tipBody: { fontSize: 13, color: '#94a3b8', lineHeight: 19, marginBottom: 14 },
  tipCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7c3aed20', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#7c3aed40' },
  tipCtaText: { fontSize: 12, fontWeight: '700', color: '#a78bfa' },

  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#161b2e', borderRadius: 16, padding: 14, marginHorizontal: 20, marginBottom: 8, borderWidth: 1, borderColor: '#2d356150', overflow: 'hidden' },
  activityBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  activityIconWrap: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  activityLabel: { fontSize: 14, fontWeight: '600', color: '#f1f5f9' },
  activityMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  activityTypePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  activityTypeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  emptyCard: { marginHorizontal: 20, borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#2d356140', marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#f1f5f9', marginBottom: 6 },
  emptyHint: { fontSize: 12, color: '#6b7280', marginBottom: 16, textAlign: 'center' },
  emptyCta: { borderRadius: 14, overflow: 'hidden' },
  emptyCtaGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  emptyCtaText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  macroCard: { marginHorizontal: 20, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#2d356150' },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  macroRowLabel: { fontSize: 12, color: '#94a3b8', width: 60 },
  macroTrackWrap: { flex: 1 },
  macroTrack: { height: 7, backgroundColor: '#2d3561', borderRadius: 4, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 4 },
  macroValue: { fontSize: 13, fontWeight: '800', width: 56, textAlign: 'right' },
  macroUnit: { fontSize: 10, fontWeight: '400', color: '#6b7280' },
});
