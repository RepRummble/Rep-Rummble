import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import SpaceBackground from '../components/fx/SpaceBackground';
import { ListSkeleton } from '../components/states/Skeleton';
import { ErrorState } from '../components/states/StateViews';
import { Eyebrow, GlassCard } from '../features/mission/ui';
import { saveTargets } from '../features/profile/targetsStore';
import {
  CheckIn, CheckInList, NutritionState, STATUS_LABEL, allowanceLine, goalProblem, isOpen, macroKcal, planTargets, safeLink, topicProblem, upgradeText, whyCannotRequest,
} from '../features/coaching/coachingLogic';
import { coaching } from '../services/coachingService';

const TONE = { good: colors.success, warn: colors.warning, bad: colors.danger, muted: colors.muted } as const;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');

/** Premium coaching: two check-ins a month with a coach, and one custom nutrition plan a month. Other plans see what Premium adds. */
export default function CoachingScreen() {
  const nav = useNavigation<any>();
  const [tab, setTab] = useState<'checkins' | 'nutrition'>('checkins');
  const [ci, setCi] = useState<CheckInList | null>(null);
  const [nu, setNu] = useState<NutritionState | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState(''); const [times, setTimes] = useState('');
  const [goal, setGoal] = useState(''); const [meals, setMeals] = useState('3'); const [diet, setDiet] = useState(''); const [allergies, setAllergies] = useState(''); const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    try { const [a, b] = await Promise.all([coaching.checkIns(), coaching.nutrition()]); setCi(a); setNu(b); setState('ready'); }
    catch { setState((s) => (s === 'ready' ? s : 'error')); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const fail = (e: any, fallback: string) => {
    const up = upgradeText(e);
    if (up) Alert.alert('Premium', up, [{ text: 'See plans', onPress: () => nav.navigate('Subscription') }, { text: 'Not now', style: 'cancel' }]);
    else Alert.alert('Could not do that', e?.response?.data?.message || fallback);
  };

  const askCheckIn = async () => {
    const p = topicProblem(topic); if (p) { Alert.alert('One more thing', p); return; }
    setBusy(true);
    try { await coaching.requestCheckIn(topic.trim(), times.trim()); setTopic(''); setTimes(''); await load(); Alert.alert('Request sent', 'A coach will book a time and you will see it here. We will email you too.'); }
    catch (e) { fail(e, 'Check your connection and try again.'); } finally { setBusy(false); }
  };
  const cancel = (c: CheckIn) => Alert.alert('Cancel this check-in?', c.status === 'scheduled' ? 'It is already booked, so it still uses one of this month’s check-ins.' : 'You will get it back.', [
    { text: 'Keep it', style: 'cancel' },
    { text: 'Cancel check-in', style: 'destructive', onPress: async () => { try { await coaching.cancelCheckIn(c._id); await load(); } catch (e) { fail(e, 'Try again.'); } } },
  ]);
  const askPlan = async () => {
    const p = goalProblem(goal); if (p) { Alert.alert('One more thing', p); return; }
    setBusy(true);
    try { await coaching.requestNutrition({ goal: goal.trim(), mealsPerDay: Math.min(8, Math.max(2, Number(meals) || 3)), dietPrefs: diet.trim(), allergies: allergies.trim(), notes: notes.trim() }); setGoal(''); setDiet(''); setAllergies(''); setNotes(''); await load(); Alert.alert('Request sent', 'A coach will write your plan. You will see it here and we will email you.'); }
    catch (e) { fail(e, 'Check your connection and try again.'); } finally { setBusy(false); }
  };
  const useTargets = async (p: NonNullable<NutritionState['current']>['plan']) => {
    if (!p) return;
    await saveTargets({ ...planTargets(p) });
    Alert.alert('Targets updated', `Your daily targets are now ${p.calories} kcal, ${p.protein} g protein and ${p.water} glasses of water. They show on Home and in your missions.`);
  };

  const premium = ci?.premium ?? false;

  return (
    <View style={{ flex: 1 }}>
      <SpaceBackground quiet />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.top}>
            <TouchableOpacity onPress={() => nav.goBack()} hitSlop={10} accessibilityLabel="Back"><Ionicons name="chevron-back" size={28} color={colors.ink} /></TouchableOpacity>
            <Text style={s.title}>Coaching</Text><View style={{ width: 28 }} />
          </View>
          {state === 'loading' ? <ListSkeleton /> : state === 'error' || !ci || !nu ? <ErrorState onRetry={load} /> : (
            <ScrollView contentContainerStyle={{ paddingBottom: 80 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.brandBright} />}>

              {!premium ? (
                <GlassCard glow>
                  <Ionicons name="ribbon" size={34} color={colors.warning} />
                  <Text style={s.h}>Coaching is part of Premium</Text>
                  <Text style={s.body}>Premium gives you two 1-on-1 check-ins with a coach every month, a custom nutrition plan written for you, PDF progress reports and priority support.</Text>
                  <TouchableOpacity style={s.primary} onPress={() => nav.navigate('Subscription')} accessibilityRole="button"><Text style={s.primaryText}>See plans</Text></TouchableOpacity>
                </GlassCard>
              ) : null}

              <View style={s.tabs}>
                {([['checkins', 'Check-ins'], ['nutrition', 'Nutrition plan']] as const).map(([k, l]) => (
                  <TouchableOpacity key={k} style={[s.tab, tab === k && s.tabOn]} onPress={() => setTab(k)} accessibilityRole="button" accessibilityState={{ selected: tab === k }}><Text style={[s.tabText, tab === k && { color: '#fff' }]}>{l}</Text></TouchableOpacity>
                ))}
              </View>

              {tab === 'checkins' ? (
                <>
                  <Eyebrow right={premium ? `${ci.used} of ${ci.limit} used` : undefined}>Your check-ins</Eyebrow>
                  {premium ? <Text style={s.note}>{allowanceLine(ci)}</Text> : null}
                  {ci.items.length === 0 ? <GlassCard><Text style={s.body}>{premium ? 'No check-ins yet. Ask for one below and a coach will book a time with you.' : 'Your check-ins will show here.'}</Text></GlassCard> : ci.items.map((c) => {
                    const st = STATUS_LABEL[c.status]; const link = safeLink(c.meetingLink);
                    return (
                      <GlassCard key={c._id}>
                        <View style={s.row}><View style={[s.pill, { borderColor: TONE[st.tone] }]}><Text style={[s.pillText, { color: TONE[st.tone] }]}>{st.label}</Text></View><Text style={s.date}>{new Date(c.createdAt).toLocaleDateString()}</Text></View>
                        <Text style={s.topic}>{c.topic}</Text>
                        {c.scheduledFor ? <Text style={s.when}>{when(c.scheduledFor)}{c.coachName ? ` · ${c.coachName}` : ''}</Text> : null}
                        {c.status === 'scheduled' && link ? <TouchableOpacity style={s.primary} onPress={() => Linking.openURL(link)} accessibilityRole="button"><Ionicons name="videocam" size={18} color="#fff" /><Text style={s.primaryText}>Join the call</Text></TouchableOpacity> : null}
                        {c.summary ? <><Text style={s.sub}>FROM YOUR COACH</Text><Text style={s.body}>{c.summary}</Text></> : null}
                        {c.actionItems.length ? <><Text style={s.sub}>NEXT STEPS</Text>{c.actionItems.map((a) => <Text key={a} style={s.item}>• {a}</Text>)}</> : null}
                        {c.declineReason ? <Text style={s.body}>{c.declineReason} This one does not count against your two a month.</Text> : null}
                        {isOpen(c.status) ? <TouchableOpacity onPress={() => cancel(c)} style={s.ghost}><Text style={s.ghostText}>Cancel</Text></TouchableOpacity> : null}
                      </GlassCard>
                    );
                  })}

                  <Eyebrow>Ask for a check-in</Eyebrow>
                  <GlassCard>
                    {whyCannotRequest(ci) ? <Text style={s.body}>{whyCannotRequest(ci)}</Text> : (
                      <>
                        <Text style={s.label}>What would you like to talk about?</Text>
                        <TextInput style={[s.input, { minHeight: 90 }]} value={topic} onChangeText={setTopic} placeholder="For example: my squat has stalled, can you look at my plan?" placeholderTextColor={colors.faint} multiline maxLength={600} />
                        <Text style={s.label}>Best times (optional)</Text>
                        <TextInput style={s.input} value={times} onChangeText={setTimes} placeholder="Weekday evenings" placeholderTextColor={colors.faint} maxLength={300} />
                        <TouchableOpacity style={[s.primary, busy && { opacity: 0.6 }]} disabled={busy} onPress={askCheckIn} accessibilityRole="button">{busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Send request</Text>}</TouchableOpacity>
                      </>
                    )}
                  </GlassCard>
                </>
              ) : (
                <>
                  {nu.current?.plan ? (
                    <>
                      <Eyebrow right={nu.current.coachName ?? undefined}>Your plan</Eyebrow>
                      <GlassCard glow>
                        <Text style={s.big}>{nu.current.plan.calories}<Text style={s.unit}> kcal a day</Text></Text>
                        <View style={s.macros}>
                          {[['Protein', nu.current.plan.protein], ['Carbs', nu.current.plan.carbs], ['Fat', nu.current.plan.fat]].map(([l, v]) => <View key={String(l)} style={{ flex: 1 }}><Text style={s.macroV}>{v} g</Text><Text style={s.macroL}>{l}</Text></View>)}
                        </View>
                        <Text style={s.note}>About {macroKcal(nu.current.plan)} kcal from those macros · {nu.current.plan.water} glasses of water</Text>
                        <TouchableOpacity style={s.primary} onPress={() => useTargets(nu.current!.plan)} accessibilityRole="button"><Text style={s.primaryText}>Use these as my daily targets</Text></TouchableOpacity>
                      </GlassCard>
                      <Eyebrow>Meals</Eyebrow>
                      <GlassCard>{nu.current.plan.meals.map((m, i) => <View key={m.name} style={[s.meal, i > 0 && s.mealBorder]}><Text style={s.mealName}>{m.name}</Text><Text style={s.body}>{m.items}</Text></View>)}</GlassCard>
                      {nu.current.plan.notes ? <GlassCard><Text style={s.sub}>NOTES FROM YOUR COACH</Text><Text style={s.body}>{nu.current.plan.notes}</Text></GlassCard> : null}
                    </>
                  ) : null}

                  {nu.latest?.status === 'requested' ? (
                    <GlassCard><Text style={s.h}>Your coach is on it</Text><Text style={s.body}>You asked for a plan for “{nu.latest.goal}”. It usually takes a couple of days. It will appear here and we will email you.</Text></GlassCard>
                  ) : nu.latest?.status === 'declined' ? (
                    <GlassCard><Text style={s.h}>Not this time</Text><Text style={s.body}>{nu.latest.declineReason} You can ask again.</Text></GlassCard>
                  ) : null}

                  <Eyebrow>{nu.current ? 'Ask for a new plan' : 'Ask for a plan'}</Eyebrow>
                  <GlassCard>
                    {!premium ? <Text style={s.body}>A custom nutrition plan comes with Premium.</Text> : !nu.canRequest ? (
                      <Text style={s.body}>{nu.latest?.status === 'requested' ? 'Your coach is already working on your plan.' : `You can ask for one new plan a month. You can ask again on ${new Date(`${nu.resetsOn}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })}.`}</Text>
                    ) : (
                      <>
                        <Text style={s.label}>Your goal</Text><TextInput style={s.input} value={goal} onChangeText={setGoal} placeholder="For example: lose 5 kg by March" placeholderTextColor={colors.faint} maxLength={200} />
                        <Text style={s.label}>Meals a day</Text><TextInput style={s.input} value={meals} onChangeText={setMeals} keyboardType="number-pad" maxLength={1} />
                        <Text style={s.label}>Diet (optional)</Text><TextInput style={s.input} value={diet} onChangeText={setDiet} placeholder="Vegetarian, halal, no dairy…" placeholderTextColor={colors.faint} maxLength={400} />
                        <Text style={s.label}>Allergies (important)</Text><TextInput style={s.input} value={allergies} onChangeText={setAllergies} placeholder="Peanuts, shellfish… or none" placeholderTextColor={colors.faint} maxLength={400} />
                        <Text style={s.label}>Anything else (optional)</Text><TextInput style={[s.input, { minHeight: 70 }]} value={notes} onChangeText={setNotes} multiline maxLength={800} placeholder="Foods you love or hate, your schedule, your budget" placeholderTextColor={colors.faint} />
                        <TouchableOpacity style={[s.primary, busy && { opacity: 0.6 }]} disabled={busy} onPress={askPlan} accessibilityRole="button">{busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Send request</Text>}</TouchableOpacity>
                      </>
                    )}
                  </GlassCard>
                  <Text style={s.fine}>Nutrition plans are general guidance, not medical advice. If you have a medical condition, check with your doctor.</Text>
                </>
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 }, title: { fontSize: 20, fontWeight: '900', color: colors.ink },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 6 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }, tabOn: { backgroundColor: colors.brand, borderColor: colors.brandBright }, tabText: { color: colors.inkSoft, fontWeight: '800', fontSize: 13.5 },
  h: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 8 }, body: { color: colors.inkSoft, fontSize: 14.5, lineHeight: 21, marginTop: 6 }, note: { color: colors.muted, fontSize: 13, marginHorizontal: 22, marginBottom: 8 }, fine: { color: colors.faint, fontSize: 11.5, lineHeight: 16, marginHorizontal: 24, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, date: { color: colors.faint, fontSize: 12 },
  pill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 }, pillText: { fontWeight: '800', fontSize: 12 },
  topic: { color: colors.ink, fontSize: 15.5, fontWeight: '700', marginTop: 10, lineHeight: 21 }, when: { color: colors.brandBright, fontWeight: '800', marginTop: 8 },
  sub: { color: colors.faint, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginTop: 14 }, item: { color: colors.inkSoft, fontSize: 14.5, lineHeight: 21, marginTop: 4 },
  primary: { flexDirection: 'row', gap: 8, height: 48, borderRadius: 14, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 14 }, primaryText: { color: '#fff', fontWeight: '900', fontSize: 15.5 },
  ghost: { alignItems: 'center', paddingTop: 14 }, ghostText: { color: '#ff6b7a', fontWeight: '800' },
  label: { color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginTop: 12, marginBottom: 6 },
  input: { minHeight: 46, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: colors.ink, fontSize: 15.5, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', textAlignVertical: 'top' },
  big: { color: colors.ink, fontSize: 44, fontWeight: '900' }, unit: { fontSize: 16, color: colors.muted, fontWeight: '700' },
  macros: { flexDirection: 'row', marginTop: 12 }, macroV: { color: colors.ink, fontSize: 22, fontWeight: '900' }, macroL: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  meal: { paddingVertical: 8 }, mealBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' }, mealName: { color: colors.brandBright, fontWeight: '900', fontSize: 14 },
});
