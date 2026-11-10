import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { Workout } from '../../types';
import { colors } from '../../theme/colors';
import { ErrorState } from '../../components/states/StateViews';
import { ListSkeleton } from '../../components/states/Skeleton';
import StaleNote from '../../components/states/StaleNote';
import { loadWithCache, clearCache } from '../../config/cache';
import { Eyebrow, GlassCard } from '../../features/mission/ui';
import WorkoutPlayer, { FinishedSession } from '../../features/train/WorkoutPlayer';
import { CATEGORY_LABELS, Category, Routine, TEMPLATES, Template, activityRecords, dayKeyOf, estimateMinutes, fmtDuration, groupByDay, personalRecords, templateToRoutineInput, weekMinutes } from '../../features/train/trainLogic';
import { ChallengeStrip, CoachCard, MyWorkouts, TodayPlan } from '../../features/train/PlanSections';
import type { DayChallenge } from '../../features/challenges/challengeLogic';
import { coach } from '../../services/coachService';
import { useReadiness } from '../../features/health/useReadiness';
import { syncRemindersSoon } from '../../services/notifications';
import { dayChallenges } from '../../services/dayChallengeService';

const TABS = ['Workout', 'Records', 'History'];

// Quick log: one tap to record a short session. The calories are rough estimates, and are shown as such.
const QUICK_LOG = [
  { name: 'Push-ups', duration: 10, cal: 50, icon: 'body-outline' },
  { name: 'Running', duration: 30, cal: 300, icon: 'walk-outline' },
  { name: 'Plank', duration: 5, cal: 30, icon: 'timer-outline' },
  { name: 'Squats', duration: 15, cal: 100, icon: 'barbell-outline' },
  { name: 'Burpees', duration: 10, cal: 120, icon: 'flame-outline' },
  { name: 'Jumping Jacks', duration: 10, cal: 80, icon: 'pulse-outline' },
];

export default function TrainScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [savedAt, setSavedAt] = useState<number | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [quickBusy, setQuickBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<Template | null>(null);
  const [playing, setPlaying] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [challenges, setChallenges] = useState<DayChallenge[]>([]);
  const [cat, setCat] = useState<Category | 'all'>('all');
  const { readiness } = useReadiness();

  const load = useCallback(async () => {
    const r = await loadWithCache('workouts', async () => ((await api.get('/workouts')).data.data || []) as Workout[]);
    if (r.data) setWorkouts(r.data);
    setFailed(!r.data);
    setSavedAt(r.fromCache ? r.savedAt ?? Date.now() : undefined);
    setLoading(false);
    // Plan and challenges are extras: if they cannot load, the rest of the screen still works.
    coach.routines().then(setRoutines).catch(() => {});
    dayChallenges.list().then(setChallenges).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const quickLog = async (q: typeof QUICK_LOG[number]) => {
    setQuickBusy(q.name);
    try {
      const res = await api.post('/workouts', { exercise: q.name, duration: q.duration, calories: q.cal, completed: true });
      setWorkouts((w) => [res.data.data, ...w]);
      await clearCache();
      dayChallenges.list().then(setChallenges).catch(() => {});
    } catch (e: any) { Alert.alert('Could not log', e?.response?.data?.message || 'Check your connection and try again.'); }
    finally { setQuickBusy(null); }
  };

  const saveSession = async (s: FinishedSession) => {
    setSaving(true);
    try {
      const res = await api.post('/workouts', { exercise: s.name, duration: Math.max(1, Math.round(s.elapsedSec / 60)), completed: true, volume: Math.round(s.volume), sets: s.sets });
      setWorkouts((w) => [res.data.data, ...w]);
      await clearCache();
      setPlaying(null);
      dayChallenges.list().then(setChallenges).catch(() => {});
      syncRemindersSoon();
      const saved = res.data.data as Workout;
      Alert.alert('Workout saved', 'Collect your daily mission XP on the Home screen. Share your results with your friends?', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Share', onPress: () => navigation.navigate('Social', { screen: 'Compose', params: { mode: 'post', attach: { kind: 'workout', id: saved._id, label: `${saved.exercise} · ${saved.duration} min` } } }) },
      ]);
    } catch (e: any) { Alert.alert('Could not save', e?.response?.data?.message || 'Check your connection and try again. Your sets are still here.'); }
    finally { setSaving(false); }
  };

  const remove = (w: Workout) => Alert.alert('Delete this workout?', `${w.exercise} will be removed from your history and records.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await api.delete(`/workouts/${w._id}`); setWorkouts((x) => x.filter((y) => y._id !== w._id)); await clearCache(); }
      catch { Alert.alert('Could not delete', 'Try again in a moment.'); }
    } },
  ]);

  const saveTemplate = async (tpl: Template) => {
    try {
      const r = await coach.create(templateToRoutineInput(tpl));
      setRoutines((x) => [r, ...x]);
      Alert.alert('Saved', `${tpl.name} is in My workouts. Pick the days you want to do it from there.`);
    } catch (e: any) { Alert.alert('Could not save', e?.response?.data?.message || 'Check your connection and try again.'); }
  };

  const todayKey = dayKeyOf(new Date());
  const todays = workouts.filter((w) => dayKeyOf(new Date(w.timestamp)) === todayKey);
  const week = weekMinutes(workouts);
  const maxMin = Math.max(...week.map((d) => d.minutes), 1);
  const prs = personalRecords(workouts);
  const act = activityRecords(workouts);
  const groups = groupByDay(workouts);

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.header}>
          <Text style={s.title}>Train</Text>
          <View style={s.streak}><Ionicons name="flame" size={16} color={colors.accent} /><Text style={s.streakText}>{user?.streak ?? 0} day streak</Text></View>
        </View>

        <View style={s.tabs}>
          {TABS.map((t, i) => (
            <TouchableOpacity key={t} onPress={() => setTab(i)} style={[s.tab, tab === i && s.tabOn]} activeOpacity={0.8} accessibilityRole="button" accessibilityState={{ selected: tab === i }}>
              <Text style={[s.tabText, tab === i && { color: '#fff' }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.brand} />}>
          {savedAt !== undefined && <StaleNote savedAt={savedAt} what="Your workouts are" />}
          {loading && workouts.length === 0 ? <ListSkeleton rows={3} /> : failed && workouts.length === 0 ? <ErrorState onRetry={() => { setLoading(true); load(); }} /> : (
            <>
              {tab === 0 && (
                <>
                  <ChallengeStrip challenges={challenges} onOpen={(id) => navigation.navigate('Social', { screen: 'ChallengeDetail', params: { id } })} onBrowse={() => navigation.navigate('Social', { screen: 'Challenges' })} />
                  <TodayPlan routines={routines} weekday={new Date().getDay()} readiness={readiness} onStart={setPlaying} onCoach={() => navigation.navigate('Coach')} />
                  <CoachCard onPress={() => navigation.navigate('Coach')} />
                  <MyWorkouts routines={routines} onChange={setRoutines} onStart={setPlaying} />

                  <Eyebrow right={`${TEMPLATES.length} workouts`}>Start a workout</Eyebrow>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12 }}>
                    {(['all', 'strength', 'bodyweight', 'conditioning', 'mobility'] as const).map((c) => (
                      <TouchableOpacity key={c} onPress={() => setCat(c)} style={[s.filter, cat === c && s.filterOn]} accessibilityRole="button" accessibilityState={{ selected: cat === c }}>
                        <Text style={[s.filterText, cat === c && { color: '#fff' }]}>{c === 'all' ? 'All' : CATEGORY_LABELS[c]}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {TEMPLATES.filter((x) => cat === 'all' || x.category === cat).map((t) => (
                    <GlassCard key={t.id} style={{ paddingVertical: 14 }}>
                      <TouchableOpacity onPress={() => setOpen(open?.id === t.id ? null : t)} activeOpacity={0.85} style={s.tplHead} accessibilityRole="button">
                        <View style={s.tplIcon}><Ionicons name={t.icon as any} size={22} color={colors.brandBright} /></View>
                        <View style={{ flex: 1 }}><Text style={s.tplName}>{t.name}</Text><Text style={s.tplFocus}>{t.focus} · {t.exercises.length} exercises · ~{estimateMinutes(t)} min</Text></View>
                        <Ionicons name={open?.id === t.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.faint} />
                      </TouchableOpacity>
                      {open?.id === t.id && (
                        <View style={{ marginTop: 12 }}>
                          {t.exercises.map((e) => <View key={e.name} style={s.exRow}><Text style={s.exName}>{e.name}</Text><Text style={s.exSets}>{e.sets} × {e.reps}</Text></View>)}
                          <TouchableOpacity onPress={() => setPlaying(t)} activeOpacity={0.88} style={{ marginTop: 14 }}>
                            <LinearGradient colors={['#d62839', '#ff7a1a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.start}><Ionicons name="flash" size={18} color="#fff" /><Text style={s.startText}>Start guided workout</Text></LinearGradient>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => saveTemplate(t)} style={s.saveTpl} accessibilityRole="button"><Ionicons name="bookmark-outline" size={17} color={colors.brandBright} /><Text style={s.saveTplText}>Save to my workouts</Text></TouchableOpacity>
                        </View>
                      )}
                    </GlassCard>
                  ))}

                  <Eyebrow right="rough calorie estimates">Quick log</Eyebrow>
                  <View style={s.grid}>
                    {QUICK_LOG.map((q) => (
                      <TouchableOpacity key={q.name} style={s.quick} disabled={quickBusy !== null} onPress={() => quickLog(q)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Log ${q.name}`}>
                        <Ionicons name={q.icon as any} size={22} color={colors.brandBright} />
                        <Text style={s.quickName}>{q.name}</Text>
                        <Text style={s.quickMeta}>{quickBusy === q.name ? 'Logging…' : `${q.duration} min · ~${q.cal} kcal`}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Eyebrow>Today</Eyebrow>
                  <GlassCard>
                    <View style={s.row3}>
                      {[{ v: todays.length, l: 'Sessions' }, { v: todays.reduce((m, w) => m + w.duration, 0), l: 'Minutes' }, { v: todays.reduce((m, w) => m + (w.calories || 0), 0) || '—', l: 'Calories' }].map((x) => (
                        <View key={x.l} style={s.stat}><Text style={s.statV}>{x.v}</Text><Text style={s.statL}>{x.l}</Text></View>
                      ))}
                    </View>
                  </GlassCard>

                  <Eyebrow right={`${week.reduce((m, d) => m + d.minutes, 0)} min`}>Last 7 days</Eyebrow>
                  <GlassCard>
                    <View style={s.chart}>
                      {week.map((d, i) => (
                        <View key={d.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                          {d.minutes > 0 && <Text style={s.barVal}>{d.minutes}</Text>}
                          <LinearGradient colors={i === 6 ? ['#ffd9a0', '#ff5a36'] : ['#ff9a4d', '#c4182f']} style={{ width: 22, height: d.minutes > 0 ? Math.max(6, (d.minutes / maxMin) * 90) : 4, borderRadius: 6, opacity: d.minutes > 0 ? 1 : 0.3 }} />
                          <Text style={[s.barLabel, i === 6 && { color: colors.brandBright }]}>{d.label}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={s.note}>Minutes trained each day, from your logged workouts.</Text>
                  </GlassCard>
                </>
              )}

              {tab === 1 && (
                <>
                  <Eyebrow right={prs.length ? `${prs.length} lift${prs.length === 1 ? '' : 's'}` : undefined}>Personal records</Eyebrow>
                  {prs.length === 0 ? (
                    <GlassCard><Text style={s.empty}>Finish a guided workout and your best lifts appear here. Records are your own sets, never estimates made up for you.</Text></GlassCard>
                  ) : (
                    <GlassCard style={{ padding: 0 }}>
                      {prs.map((p, i) => (
                        <View key={p.exercise} style={[s.prRow, i > 0 && s.rowBorder]}>
                          <View style={{ flex: 1 }}><Text style={s.prName}>{p.exercise}</Text><Text style={s.prDate}>{new Date(p.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Text></View>
                          <View style={{ alignItems: 'flex-end' }}><Text style={s.prVal}>{p.weight} kg × {p.reps}</Text><Text style={s.prEst}>est. max {Math.round(p.est1RM)} kg</Text></View>
                        </View>
                      ))}
                    </GlassCard>
                  )}
                  <Eyebrow>Your totals</Eyebrow>
                  <GlassCard>
                    <View style={s.row3}>
                      {[{ v: act.sessions, l: 'Workouts' }, { v: act.minutes, l: 'Minutes' }, { v: act.longest || '—', l: 'Longest (min)' }].map((x) => <View key={x.l} style={s.stat}><Text style={s.statV}>{x.v}</Text><Text style={s.statL}>{x.l}</Text></View>)}
                    </View>
                    <View style={[s.row3, { marginTop: 16 }]}>
                      {[{ v: act.bestWeek || '—', l: 'Best week' }, { v: act.mostCalories || '—', l: 'Most kcal' }, { v: user?.streak ?? 0, l: 'Streak' }].map((x) => <View key={x.l} style={s.stat}><Text style={s.statV}>{x.v}</Text><Text style={s.statL}>{x.l}</Text></View>)}
                    </View>
                  </GlassCard>
                </>
              )}

              {tab === 2 && (
                groups.length === 0 ? (
                  <GlassCard><Text style={s.empty}>No workouts yet. Start one from the Workout tab, or log a quick session.</Text></GlassCard>
                ) : groups.map((g) => (
                  <View key={g.label}>
                    <Eyebrow>{g.label}</Eyebrow>
                    <GlassCard style={{ padding: 0 }}>
                      {g.items.map((w, i) => (
                        <View key={w._id ?? i} style={[s.hRow, i > 0 && s.rowBorder]}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.prName}>{w.exercise}</Text>
                            <Text style={s.prDate}>{w.duration} min{w.sets?.length ? ` · ${w.sets.length} sets` : ''}{w.volume ? ` · ${(w.volume / 1000).toFixed(1)} t` : ''}{w.calories ? ` · ~${w.calories} kcal` : ''}</Text>
                          </View>
                          <TouchableOpacity onPress={() => remove(w as Workout)} hitSlop={10} accessibilityLabel={`Delete ${w.exercise}`}><Ionicons name="trash-outline" size={18} color={colors.faint} /></TouchableOpacity>
                        </View>
                      ))}
                    </GlassCard>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <WorkoutPlayer visible={playing !== null} template={playing} history={workouts} saving={saving} onClose={() => setPlaying(null)} onSave={saveSession} />
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,122,26,0.12)', borderWidth: 1, borderColor: 'rgba(255,122,26,0.35)' },
  streakText: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  tabOn: { backgroundColor: colors.brand, borderColor: '#ff9a4d' },
  tabText: { color: colors.inkSoft, fontWeight: '800', fontSize: 13.5 },
  filter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  filterOn: { backgroundColor: colors.brand, borderColor: '#ff9a4d' }, filterText: { color: colors.inkSoft, fontWeight: '800', fontSize: 13 },
  saveTpl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, height: 44, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,154,77,0.5)', backgroundColor: 'rgba(255,122,26,0.08)' }, saveTplText: { color: colors.brandBright, fontWeight: '800', fontSize: 14 },
  tplHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tplIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,122,26,0.12)', borderWidth: 1, borderColor: 'rgba(255,122,26,0.3)' },
  tplName: { fontSize: 17, fontWeight: '800', color: colors.ink }, tplFocus: { fontSize: 12, color: colors.muted, marginTop: 2 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  exName: { color: colors.inkSoft, fontSize: 14.5, fontWeight: '600' }, exSets: { color: colors.muted, fontSize: 13.5, fontWeight: '700' },
  start: { height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, startText: { color: '#fff', fontWeight: '900', fontSize: 15.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  quick: { width: '47.5%', padding: 14, borderRadius: 18, backgroundColor: 'rgba(10,18,38,0.88)', borderWidth: 1, borderColor: 'rgba(255,190,140,0.2)', gap: 4 },
  quickName: { color: colors.ink, fontWeight: '800', fontSize: 15, marginTop: 4 }, quickMeta: { color: colors.muted, fontSize: 12 },
  row3: { flexDirection: 'row' }, stat: { flex: 1, alignItems: 'center', gap: 3 },
  statV: { fontSize: 22, fontWeight: '900', color: colors.ink }, statL: { fontSize: 10.5, fontWeight: '700', color: colors.muted, letterSpacing: 0.5 },
  chart: { flexDirection: 'row', height: 130, alignItems: 'flex-end' }, barVal: { fontSize: 10, color: colors.muted, marginBottom: 3, fontWeight: '700' }, barLabel: { fontSize: 11, color: colors.muted, marginTop: 6, fontWeight: '600' },
  note: { fontSize: 11.5, color: colors.faint, marginTop: 10 },
  empty: { fontSize: 14, lineHeight: 21, color: colors.muted },
  prRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 }, hRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  prName: { fontSize: 15.5, fontWeight: '800', color: colors.ink }, prDate: { fontSize: 12, color: colors.muted, marginTop: 3 },
  prVal: { fontSize: 15.5, fontWeight: '900', color: colors.brandBright }, prEst: { fontSize: 11.5, color: colors.muted, marginTop: 3 },
});
