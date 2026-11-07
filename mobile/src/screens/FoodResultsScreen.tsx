import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../config/api';
import { clearCache } from '../config/cache';
import { RootStackParamList, DetectedFood } from '../types';
import { colors } from '../theme/colors';
import SpaceBackground from '../components/fx/SpaceBackground';
import { GlassCard, Eyebrow } from '../features/mission/ui';
import { useTargets } from '../features/profile/targetsStore';
import {
  MEAL_TYPES, amountLabel, hasItemNutrition, healthLabel, highlights, itemsAddUp, macroSplit, mealTitle, mealTypeByHour, shareOfDay, sureness,
} from '../features/food/foodLogic';

type RouteProps = RouteProp<RootStackParamList, 'FoodResults'>;
const MACRO = { protein: '#4da3ff', carbs: '#ffc24d', fat: '#ff6a8a' } as const;
const TONE = { good: colors.success, watch: colors.warning, info: colors.brandBright } as const;

/**
 * What the scan found, in the order a person asks: what is it, how much, what do I get from it,
 * what is in it, is it good for me, and what should I do about it.
 */
export default function FoodResultsScreen() {
  const navigation = useNavigation<any>();
  const { analysisResult, imageUri } = useRoute<RouteProps>().params;
  const targets = useTargets();
  const { detectedFoods: foods, totalNutrition: total, healthScore, suggestions, alternatives, confidence } = analysisResult;
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]>(analysisResult.mealType ?? mealTypeByHour(new Date().getHours()));
  const [saving, setSaving] = useState(false);

  const fiber = total.fiber ?? total.micronutrients?.fiber, sugar = total.sugar ?? total.micronutrients?.sugar, sodium = total.sodium ?? total.micronutrients?.sodium;
  const split = macroSplit(total);
  const tags = useMemo(() => highlights({ ...total, fiber, sugar, sodium }), [total, fiber, sugar, sodium]);
  const health = healthLabel(healthScore);
  const healthColor = { great: colors.success, good: colors.success, fair: colors.warning, poor: colors.danger }[health.level];
  const showItems = itemsAddUp(foods, total);
  const overall = sureness(confidence);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.post('/meals', {
        foodName: foods.map((f) => f.name).join(', ') || mealTitle(foods),
        calories: total.calories, protein: total.protein, carbs: total.carbs, fat: total.fat, fiber, sugar, sodium,
        imageUrl: imageUri, confidence, mealType, isAIGenerated: true, detectedFoods: foods, healthScore, aiSuggestions: suggestions, alternatives,
      });
      await clearCache();
      const meal = res.data?.data;
      Alert.alert('Meal logged', 'Collect your daily mission XP on the Home screen. Want to share it with your friends?', [
        { text: 'Not now', style: 'cancel', onPress: () => navigation.navigate('Main') },
        { text: 'Share to feed', onPress: () => navigation.navigate('Main', { screen: 'Social', params: { screen: 'Compose', params: { mode: 'post', attach: { kind: 'meal', id: meal?._id, label: `${mealTitle(foods)} · ${Math.round(total.calories)} kcal` } } } }) },
      ]);
    } catch (error) {
      Alert.alert('Could not save meal', (error as any)?.response?.data?.message || 'Please check your connection and try again.');
    } finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1 }}>
      <SpaceBackground quiet />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.top}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Back"><Ionicons name="chevron-back" size={28} color={colors.ink} /></TouchableOpacity>
          <Text style={s.topTitle}>Your meal</Text>
          <View style={s.ai}><Ionicons name="sparkles" size={13} color={colors.brandBright} /><Text style={s.aiText}>AI estimate</Text></View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          {/* 1. What is it */}
          <View style={s.hero}>
            {imageUri ? <Image source={{ uri: imageUri }} style={s.photo} /> : <View style={[s.photo, s.noPhoto]}><Ionicons name="restaurant" size={40} color={colors.brandBright} /></View>}
            <LinearGradient colors={['transparent', 'rgba(5,10,20,0.92)']} style={s.heroFade} />
            <View style={s.heroText}>
              <Text style={s.title} numberOfLines={2}>{mealTitle(foods)}</Text>
              <Text style={s.heroSub}>{foods.length} {foods.length === 1 ? 'food' : 'foods'} found · {overall.label}</Text>
            </View>
          </View>

          {/* 2. What we get: the totals */}
          <GlassCard glow style={{ marginTop: -6 }}>
            <View style={s.calRow}>
              <View>
                <Text style={s.kcal}>{Math.round(total.calories)}</Text>
                <Text style={s.kcalLabel}>calories in this meal</Text>
              </View>
              <View style={s.dayBox}>
                <Text style={s.dayPct}>{shareOfDay(total.calories, targets.calories)}%</Text>
                <Text style={s.dayLabel}>of your {targets.calories} kcal day</Text>
              </View>
            </View>

            <View style={s.splitBar}>
              <View style={{ flex: Math.max(split.protein, 1), backgroundColor: MACRO.protein }} />
              <View style={{ flex: Math.max(split.carbs, 1), backgroundColor: MACRO.carbs }} />
              <View style={{ flex: Math.max(split.fat, 1), backgroundColor: MACRO.fat }} />
            </View>
            <View style={s.macros}>
              <Macro label="Protein" grams={total.protein} pct={split.protein} color={MACRO.protein} />
              <Macro label="Carbs" grams={total.carbs} pct={split.carbs} color={MACRO.carbs} />
              <Macro label="Fat" grams={total.fat} pct={split.fat} color={MACRO.fat} />
            </View>
            <Text style={s.note}>Percentages show where the calories come from. Protein is {shareOfDay(total.protein, targets.protein)}% of your {targets.protein} g goal.</Text>

            {(fiber !== undefined || sugar !== undefined || sodium !== undefined) ? (
              <View style={s.extras}>
                {fiber !== undefined ? <Extra label="Fibre" value={`${Math.round(fiber)} g`} /> : null}
                {sugar !== undefined ? <Extra label="Sugar" value={`${Math.round(sugar)} g`} /> : null}
                {sodium !== undefined ? <Extra label="Sodium" value={`${Math.round(sodium)} mg`} /> : null}
              </View>
            ) : null}
          </GlassCard>

          {tags.length ? (
            <View style={s.tags}>{tags.map((t) => (
              <View key={t.label} style={[s.tag, { borderColor: TONE[t.tone] }]}><Ionicons name={t.tone === 'watch' ? 'alert-circle' : 'checkmark-circle'} size={14} color={TONE[t.tone]} /><Text style={[s.tagText, { color: TONE[t.tone] }]}>{t.label}</Text></View>
            ))}</View>
          ) : null}

          {/* 3. What it contains: each food */}
          <Eyebrow right={showItems ? 'estimates per food' : undefined}>What’s on the plate</Eyebrow>
          {foods.map((f: DetectedFood, i: number) => <FoodCard key={`${f.name}-${i}`} food={f} showNumbers={showItems} />)}

          {/* 4. Is it good for me */}
          <GlassCard>
            <View style={s.healthRow}>
              <View style={[s.healthRing, { borderColor: healthColor }]}><Text style={[s.healthNum, { color: healthColor }]}>{Math.round(healthScore)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.healthTitle}>{health.label}</Text>
                <Text style={s.healthSub}>Health score out of 100, based on protein, fibre, sugar and salt.</Text>
              </View>
            </View>
          </GlassCard>

          {/* 5. What to do about it */}
          {suggestions.length ? (
            <>
              <Eyebrow>Tips for this meal</Eyebrow>
              <GlassCard>{suggestions.map((t, i) => <View key={i} style={s.tip}><Ionicons name="bulb-outline" size={18} color={colors.brandBright} /><Text style={s.tipText}>{t}</Text></View>)}</GlassCard>
            </>
          ) : null}
          {alternatives.length ? (
            <>
              <Eyebrow>Lighter swaps</Eyebrow>
              <GlassCard>{alternatives.map((a, i) => (
                <View key={i} style={[s.alt, i > 0 && s.altBorder]}>
                  <View style={{ flex: 1 }}><Text style={s.altName}>{a.name}</Text><Text style={s.altWhy}>{a.reason}</Text></View>
                  <Text style={s.altKcal}>{Math.round(a.calories)} kcal</Text>
                </View>
              ))}</GlassCard>
            </>
          ) : null}
          <Text style={s.disclaimer}>These numbers are an AI estimate from the photo. If something looks wrong, go back and search for the food by name for exact values.</Text>
        </ScrollView>

        {/* Save bar */}
        <View style={s.saveBar}>
          <View style={s.types}>{MEAL_TYPES.map((m) => (
            <TouchableOpacity key={m} onPress={() => setMealType(m)} style={[s.type, mealType === m && s.typeOn]} accessibilityRole="button">
              <Text style={[s.typeText, mealType === m && { color: '#fff' }]}>{m[0].toUpperCase() + m.slice(1)}</Text>
            </TouchableOpacity>
          ))}</View>
          <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.9} accessibilityRole="button">
            <LinearGradient colors={['#ff7a1a', '#d62839']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtn}>
              {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={s.saveText}>Log this meal</Text></>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Macro({ label, grams, pct, color }: { label: string; grams: number; pct: number; color: string }) {
  return (
    <View style={s.macro}>
      <View style={s.macroHead}><View style={[s.dot, { backgroundColor: color }]} /><Text style={s.macroLabel}>{label}</Text></View>
      <Text style={s.macroGrams}>{Math.round(grams)}<Text style={s.macroUnit}> g</Text></Text>
      <Text style={s.macroPct}>{pct}% of calories</Text>
    </View>
  );
}
const Extra = ({ label, value }: { label: string; value: string }) => <View style={s.extra}><Text style={s.extraValue}>{value}</Text><Text style={s.extraLabel}>{label}</Text></View>;

function FoodCard({ food, showNumbers }: { food: DetectedFood; showNumbers: boolean }) {
  const sure = sureness(food.confidence);
  return (
    <GlassCard style={{ marginBottom: 12 }}>
      <View style={s.foodHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.foodName}>{food.name}</Text>
          {food.description ? <Text style={s.foodDesc}>{food.description}</Text> : null}
        </View>
        {showNumbers && hasItemNutrition(food) ? <View style={s.foodKcal}><Text style={s.foodKcalNum}>{Math.round(food.estimatedCalories ?? 0)}</Text><Text style={s.foodKcalUnit}>kcal</Text></View> : null}
      </View>
      <View style={s.metaRow}>
        <View style={s.chip}><Ionicons name="scale-outline" size={13} color={colors.muted} /><Text style={s.chipText}>{amountLabel(food)}</Text></View>
        <View style={[s.chip, sure.level === 'low' && { borderColor: colors.warning }]}><Ionicons name={sure.level === 'high' ? 'checkmark-circle' : 'help-circle'} size={13} color={sure.level === 'low' ? colors.warning : colors.muted} /><Text style={[s.chipText, sure.level === 'low' && { color: colors.warning }]}>{sure.label}</Text></View>
      </View>
      {showNumbers ? (
        <View style={s.itemMacros}>
          <Text style={[s.itemMacro, { color: MACRO.protein }]}>P {Math.round(food.estimatedProtein ?? 0)} g</Text>
          <Text style={[s.itemMacro, { color: MACRO.carbs }]}>C {Math.round(food.estimatedCarbs ?? 0)} g</Text>
          <Text style={[s.itemMacro, { color: MACRO.fat }]}>F {Math.round(food.estimatedFat ?? 0)} g</Text>
        </View>
      ) : null}
      {food.ingredients?.length ? (
        <View style={{ marginTop: 10 }}>
          <Text style={s.ingHead}>CONTAINS</Text>
          <View style={s.ings}>{food.ingredients.map((x) => <View key={x} style={s.ing}><Text style={s.ingText}>{x}</Text></View>)}</View>
        </View>
      ) : null}
    </GlassCard>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 }, topTitle: { fontSize: 18, fontWeight: '900', color: colors.ink },
  ai: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(255,122,26,0.14)' }, aiText: { color: colors.brandBright, fontWeight: '800', fontSize: 11.5 },
  hero: { height: 240, marginHorizontal: 20, borderRadius: 26, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,190,140,0.25)' },
  photo: { width: '100%', height: '100%' }, noPhoto: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 130 },
  heroText: { position: 'absolute', left: 18, right: 18, bottom: 16 }, title: { color: '#fff', fontSize: 27, fontWeight: '900', letterSpacing: -0.4 }, heroSub: { color: '#ffd9c2', fontWeight: '700', fontSize: 13, marginTop: 4 },
  calRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  kcal: { fontSize: 54, fontWeight: '900', color: colors.ink, lineHeight: 58 }, kcalLabel: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  dayBox: { alignItems: 'flex-end' }, dayPct: { fontSize: 26, fontWeight: '900', color: colors.brandBright }, dayLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  splitBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  macros: { flexDirection: 'row', marginTop: 14, gap: 8 }, macro: { flex: 1 }, macroHead: { flexDirection: 'row', alignItems: 'center', gap: 6 }, dot: { width: 9, height: 9, borderRadius: 5 },
  macroLabel: { color: colors.inkSoft, fontWeight: '800', fontSize: 13 }, macroGrams: { color: colors.ink, fontSize: 26, fontWeight: '900', marginTop: 2 }, macroUnit: { fontSize: 14, color: colors.muted }, macroPct: { color: colors.muted, fontSize: 11.5, marginTop: 1 },
  note: { color: colors.faint, fontSize: 11.5, marginTop: 12, lineHeight: 16 },
  extras: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }, extra: { flex: 1 }, extraValue: { color: colors.ink, fontWeight: '900', fontSize: 18 }, extraLabel: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)' }, tagText: { fontWeight: '800', fontSize: 12.5 },
  foodHead: { flexDirection: 'row', gap: 12 }, foodName: { color: colors.ink, fontSize: 19, fontWeight: '900' }, foodDesc: { color: colors.muted, fontSize: 13.5, marginTop: 3, lineHeight: 19 },
  foodKcal: { alignItems: 'center', minWidth: 52 }, foodKcalNum: { color: colors.brandBright, fontSize: 24, fontWeight: '900' }, foodKcalUnit: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }, chipText: { color: colors.inkSoft, fontSize: 12.5, fontWeight: '700' },
  itemMacros: { flexDirection: 'row', gap: 16, marginTop: 12 }, itemMacro: { fontWeight: '900', fontSize: 14 },
  ingHead: { color: colors.faint, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.6, marginBottom: 6 }, ings: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ing: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)' }, ingText: { color: colors.inkSoft, fontSize: 12.5, fontWeight: '600' },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 16 }, healthRing: { width: 74, height: 74, borderRadius: 37, borderWidth: 6, alignItems: 'center', justifyContent: 'center' }, healthNum: { fontSize: 24, fontWeight: '900' },
  healthTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' }, healthSub: { color: colors.muted, fontSize: 12.5, marginTop: 3, lineHeight: 18 },
  tip: { flexDirection: 'row', gap: 10, paddingVertical: 6 }, tipText: { flex: 1, color: colors.inkSoft, fontSize: 14.5, lineHeight: 21 },
  alt: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }, altBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' }, altName: { color: colors.ink, fontWeight: '800', fontSize: 15 }, altWhy: { color: colors.muted, fontSize: 12.5, marginTop: 2 }, altKcal: { color: colors.brandBright, fontWeight: '900' },
  disclaimer: { color: colors.faint, fontSize: 12, lineHeight: 17, marginHorizontal: 24, marginTop: 4, textAlign: 'center' },
  saveBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, backgroundColor: 'rgba(5,10,20,0.96)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', gap: 10 },
  types: { flexDirection: 'row', gap: 6 }, type: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }, typeOn: { backgroundColor: colors.brand, borderColor: colors.brandBright }, typeText: { color: colors.inkSoft, fontWeight: '800', fontSize: 12.5 },
  saveBtn: { height: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, saveText: { color: '#fff', fontWeight: '900', fontSize: 16.5 },
});
