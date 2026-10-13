import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Meal } from '../../types';
import api from '../../config/api';

import { colors } from '../../theme/colors';
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SW = Dimensions.get('window').width;

const FEATURES = [
  { icon: 'sparkles',    color: colors.brand, bg: colors.brand + '20', label: 'AI-Powered',        desc: 'GPT-4 Vision' },
  { icon: 'nutrition',   color: colors.success, bg: colors.success + '20', label: 'Full Nutrition',     desc: 'Macros & micros' },
  { icon: 'restaurant',  color: colors.accent, bg: colors.accent + '20', label: 'Regional Foods',     desc: 'Indian & local' },
  { icon: 'bulb',        color: colors.warning, bg: colors.warning + '20', label: 'Smart Tips',         desc: 'Healthier swaps' },
];

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: '🍳', lunch: '🍱', dinner: '🍽️', snack: '🥨', default: '🍴',
};

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export default function SnapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMeals = async () => {
    try {
      const res = await api.get('/meals');
      setMeals((res.data.data || []).slice(0, 10));
    } catch {}
  };

  // Refresh every time the tab is focused (after a scan)
  useFocusEffect(useCallback(() => { fetchMeals(); }, []));

  const onRefresh = async () => { setRefreshing(true); await fetchMeals(); setRefreshing(false); };

  const today = new Date().toDateString();
  const todayMeals = meals.filter(m => new Date(m.timestamp).toDateString() === today);
  const totalCal  = todayMeals.reduce((s, m) => s + m.calories, 0);
  const totalProt = todayMeals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs = todayMeals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat  = todayMeals.reduce((s, m) => s + (m.fat || 0), 0);
  const goalCal   = 2200;
  const pct       = Math.min((totalCal / goalCal) * 100, 100);
  const recentMeals = meals.slice(0, 5);

  return (
    <View style={s.root}>
      <LinearGradient colors={[colors.bg, colors.bg, colors.bg]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        >

          {/* ── Header ── */}
          <View style={s.header}>
            <View>
              <Text style={s.title}>Nutrition AI</Text>
              <Text style={s.subtitle}>Scan, search & track your meals</Text>
            </View>
            <View style={s.headerBadge}>
              <Ionicons name="flame" size={14} color={colors.accent} />
              <Text style={s.headerBadgeText}>2,850 cal goal</Text>
            </View>
          </View>

          {/* ── Today's Macros Bar ── */}
          <LinearGradient colors={[colors.surface, colors.surface]} style={s.macroCard}>
            <View style={s.macroRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.macroLabel}>TODAY'S CALORIES</Text>
                <View style={s.macroValRow}>
                  <Text style={s.macroVal}>{totalCal}</Text>
                  <Text style={s.macroGoal}> / {goalCal} kcal</Text>
                </View>
                <View style={s.macroTrack}>
                  <LinearGradient
                    colors={[colors.brand, colors.success]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[s.macroFill, { width: `${pct}%` }]}
                  />
                </View>
              </View>
              <View style={s.macroStats}>
                {[
                  { label: 'Protein', val: `${totalProt}g`, color: colors.brand },
                  { label: 'Carbs',   val: `${totalCarbs}g`, color: colors.success },
                  { label: 'Fat',     val: `${totalFat}g`, color: colors.accent },
                ].map((m, i) => (
                  <View key={i} style={s.macroStat}>
                    <Text style={[s.macroStatVal, { color: m.color }]}>{m.val}</Text>
                    <Text style={s.macroStatLabel}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>

          {/* ── Two Action Cards ── */}
          <View style={s.actionRow}>

            {/* Scan Card */}
            <TouchableOpacity
              style={s.scanCard}
              onPress={() => navigation.navigate('FoodScanner')}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[colors.brand, colors.tealDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.scanCardInner}>
                <View style={s.scanIconWrap}>
                  <LinearGradient colors={[colors.white + '30', colors.white + '20']} style={s.scanIconBg}>
                    <Ionicons name="camera" size={32} color={colors.white} />
                  </LinearGradient>
                </View>
                <Text style={s.scanCardTitle}>Scan Meal</Text>
                <Text style={s.scanCardSub}>AI instant recognition</Text>
                <View style={s.scanBadge}>
                  <Ionicons name="flash" size={10} color={colors.white} />
                  <Text style={s.scanBadgeText}>Instant</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Search Card */}
            <TouchableOpacity
              style={s.searchCard}
              onPress={() => navigation.navigate('FoodSearch')}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[colors.surface, colors.surface]} style={s.searchCardInner}>
                <View style={s.searchIconWrap}>
                  <LinearGradient colors={[colors.brand + '40', colors.brand + '20']} style={s.scanIconBg}>
                    <Ionicons name="search" size={28} color={colors.brand} />
                  </LinearGradient>
                </View>
                <Text style={s.searchCardTitle}>Food Search</Text>
                <Text style={s.searchCardSub}>USDA database</Text>
                <View style={[s.scanBadge, { backgroundColor: colors.brand + '40' }]}>
                  <Ionicons name="library-outline" size={10} color={colors.brand} />
                  <Text style={[s.scanBadgeText, { color: colors.brand }]}>900k+ foods</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

          </View>

          {/* ── Feature Grid ── */}
          <View style={s.featureGrid}>
            {FEATURES.map((f, i) => (
              <View key={i} style={s.featureCard}>
                <View style={[s.featureIconWrap, { backgroundColor: f.bg }]}>
                  <Ionicons name={f.icon as any} size={18} color={f.color} />
                </View>
                <Text style={s.featureLabel}>{f.label}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>

          {/* ── Recent Meals ── */}
          <View style={s.sectionRow}>
            <View style={s.sectionLeft}>
              <Ionicons name="time-outline" size={14} color={colors.success} />
              <Text style={s.sectionTitle}>Recent Meals</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('FoodSearch')}>
              <Text style={s.sectionLink}>See all</Text>
            </TouchableOpacity>
          </View>

          {recentMeals.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="restaurant-outline" size={36} color={colors.border} />
              <Text style={s.emptyText}>No meals logged yet</Text>
              <Text style={s.emptyHint}>Tap Scan Meal above to add your first</Text>
            </View>
          ) : recentMeals.map((meal, i) => (
            <View key={meal._id || i} style={s.mealRow}>
              <View style={s.mealEmoji}>
                <Text style={{ fontSize: 26 }}>{MEAL_EMOJIS[meal.mealType || ''] || MEAL_EMOJIS.default}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.mealName}>{meal.foodName}</Text>
                <View style={s.mealMacros}>
                  {[
                    { label: `P ${meal.protein || 0}g`, color: colors.brand },
                    { label: `C ${meal.carbs || 0}g`,   color: colors.success },
                    { label: `F ${meal.fat || 0}g`,     color: colors.accent },
                  ].map((m, j) => (
                    <Text key={j} style={[s.mealMacro, { color: m.color }]}>{m.label}</Text>
                  ))}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={s.mealCal}>{meal.calories}</Text>
                <Text style={s.mealCalUnit}>kcal</Text>
                <Text style={s.mealTime}>{timeAgo(meal.timestamp)}</Text>
              </View>
            </View>
          ))}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const CARD_W = (SW - 48) / 2;

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: colors.faint, marginTop: 2 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent + '18', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.accent + '30' },
  headerBadgeText: { fontSize: 11, color: colors.accent, fontWeight: '700' },

  macroCard: { borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  macroLabel: { fontSize: 10, fontWeight: '800', color: colors.faint, letterSpacing: 1, marginBottom: 4 },
  macroValRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  macroVal: { fontSize: 28, fontWeight: '900', color: colors.ink },
  macroGoal: { fontSize: 13, color: colors.faint },
  macroTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 3 },
  macroStats: { gap: 8 },
  macroStat: { alignItems: 'flex-end' },
  macroStatVal: { fontSize: 14, fontWeight: '800' },
  macroStatLabel: { fontSize: 10, color: colors.faint, marginTop: 1 },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },

  scanCard: { width: CARD_W, borderRadius: 20, overflow: 'hidden' },
  scanCardInner: { padding: 20, alignItems: 'flex-start', minHeight: 180 },
  scanIconWrap: { marginBottom: 14 },
  scanIconBg: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  scanCardTitle: { fontSize: 17, fontWeight: '800', color: colors.white, marginBottom: 4 },
  scanCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 12, flex: 1 },
  scanBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  scanBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },

  searchCard: { width: CARD_W, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.brand + '40' },
  searchCardInner: { padding: 20, alignItems: 'flex-start', minHeight: 180 },
  searchIconWrap: { marginBottom: 14 },
  searchCardTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  searchCardSub: { fontSize: 12, color: colors.brand, marginBottom: 12, flex: 1 },

  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  featureCard: { width: (SW - 42) / 2, backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border },
  featureIconWrap: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  featureLabel: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  featureDesc: { fontSize: 11, color: colors.faint, lineHeight: 16 },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  sectionLink: { fontSize: 12, color: colors.brand, fontWeight: '600' },

  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  mealEmoji: { width: 48, height: 48, backgroundColor: colors.border, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  mealName: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 5 },
  mealMacros: { flexDirection: 'row', gap: 8 },
  mealMacro: { fontSize: 11, fontWeight: '700' },
  mealCal: { fontSize: 18, fontWeight: '900', color: colors.ink },
  mealCalUnit: { fontSize: 10, color: colors.faint },
  mealTime: { fontSize: 10, color: colors.faint },
  emptyCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  emptyText: { fontSize: 15, color: colors.faint, marginTop: 12, fontWeight: '500' },
  emptyHint: { fontSize: 12, color: colors.border, marginTop: 4 },
});
