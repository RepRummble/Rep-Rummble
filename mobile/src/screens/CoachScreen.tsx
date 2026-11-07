import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import SpaceBackground from '../components/fx/SpaceBackground';
import { Eyebrow, GlassCard } from '../features/mission/ui';
import {
  AVOID, BODY_STYLES, Brief, Choice, DAYS_PER_WEEK, DEFAULT_BRIEF, EQUIPMENT, FOCUS, GOALS, LEVELS, SESSION_MINUTES, aiBrief, aiErrorMessage, briefReady, briefSummary, scheduleFor,
} from '../features/coach/coachLogic';
import { ExerciseEditor, LibrarySheet } from '../features/coach/EditUI';
import { generatePlan, ctxOf, type PlanDay } from '../features/coach/planGenerator';
import { exerciseFromLib, insertAt, moveAt, removeAt, replaceAt, swapExercise } from '../features/coach/planEdit';
import type { LibExercise } from '../features/coach/exerciseLibrary';
import { Routine, RoutineExercise, WEEKDAYS, weekdaysLabel } from '../features/train/trainLogic';
import { coach } from '../services/coachService';

interface EditablePlan { summary: string; days: PlanDay[]; tips: string[]; source: 'ai' | 'offline'; notes: string[] }
const BRIEF_KEY = 'rr_coach_brief';

function Chips({ list, value, onPick, multi, wide }: { list: Choice[]; value: string | string[] | undefined; onPick: (k: string) => void; multi?: boolean; wide?: boolean }) {
  const on = (k: string) => (multi ? (value as string[]).includes(k) : value === k);
  return (
    <View style={s.chips}>
      {list.map((c) => (
        <TouchableOpacity key={c.key} onPress={() => onPick(c.key)} style={[s.chip, wide && s.chipWide, on(c.key) && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on(c.key) }}>
          {c.icon ? <Ionicons name={c.icon as any} size={18} color={on(c.key) ? '#fff' : colors.brandBright} /> : null}
          <Text style={[s.chipText, on(c.key) && { color: '#fff' }]}>{c.label}</Text>
          {c.hint && wide ? <Text style={[s.chipHint, on(c.key) && { color: 'rgba(255,255,255,0.8)' }]}>{c.hint}</Text> : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const Seg = ({ values, value, onPick, suffix }: { values: number[]; value: number; onPick: (n: number) => void; suffix?: string }) => (
  <View style={s.seg}>{values.map((v) => (
    <TouchableOpacity key={v} style={[s.segItem, value === v && s.segOn]} onPress={() => onPick(v)} accessibilityRole="button" accessibilityState={{ selected: value === v }}>
      <Text style={[s.segText, value === v && { color: '#fff' }]}>{v}{suffix}</Text>
    </TouchableOpacity>
  ))}</View>
);

/**
 * Tell the coach what you want to become. It suggests a week of workouts; you save the ones you like
 * (or single exercises) to your own plan, scheduled on the days you choose.
 */
export default function CoachScreen() {
  const nav = useNavigation<any>();
  const [brief, setBrief] = useState<Brief>(DEFAULT_BRIEF);
  const [phase, setPhase] = useState<'form' | 'loading' | 'result'>('form');
  const [plan, setPlan] = useState<EditablePlan | null>(null);
  const [seed, setSeed] = useState(0);
  const [why, setWhy] = useState('');
  const [openEx, setOpenEx] = useState<string | null>(null);
  const [lib, setLib] = useState<{ mode: 'swap' | 'add'; day: number; ex?: number } | null>(null);
  const [days, setDays] = useState<number[][]>([]);          // chosen weekdays for each suggested day
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [adding, setAdding] = useState<RoutineExercise | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<Brief>) => setBrief((b) => ({ ...b, ...patch }));

  useEffect(() => { coach.routines().then(setRoutines).catch(() => {}); }, []);
  // Remember the last answers, so coming back is one tap.
  useEffect(() => { AsyncStorage.getItem(BRIEF_KEY).then((v) => { if (v) { try { setBrief({ ...DEFAULT_BRIEF, ...JSON.parse(v) }); } catch { /* ignore a damaged value */ } } }).catch(() => {}); }, []);
  const remember = (b: Brief) => { AsyncStorage.setItem(BRIEF_KEY, JSON.stringify(b)).catch(() => {}); };
  const ctx = useMemo(() => ctxOf({ ...brief, goal: brief.goal ?? 'general_fitness', bodyStyle: brief.bodyStyle ?? '' }), [brief]);

  const showPlan = (p: EditablePlan) => {
    setPlan(p); setSaved({}); setOpenEx(null);
    const sched = scheduleFor(p.days.length);
    setDays(p.days.map((_, i) => [sched[i]]));
    setPhase('result');
  };

  /** The offline coach: instant, free, no network. `n` changes the picks (the shuffle). */
  const buildOffline = (n = 0, reason = '') => {
    remember(brief); setSeed(n); setWhy(reason);
    const p = generatePlan(brief, n);
    showPlan({ summary: p.summary, days: p.days, tips: p.tips, source: 'offline', notes: p.notes });
  };

  /** The AI coach. If it cannot answer (down, over its daily limit, or no connection), the offline coach builds the plan instead. */
  const build = async () => {
    remember(brief); setPhase('loading');
    try {
      const p = await coach.suggest(aiBrief(brief) as Brief);
      setWhy(''); showPlan({ summary: p.summary, days: p.days, tips: p.tips, source: 'ai', notes: brief.avoid.length ? ['Told the coach to avoid exercises that stress your ' + brief.avoid.join(', ') + '.'] : [] });
    } catch (e: any) {
      const status = e?.response?.status, code = e?.response?.data?.code;
      if (status === 400) { setPhase('form'); Alert.alert('Check your answers', e?.response?.data?.message || 'Please check your answers and try again.'); return; }
      buildOffline(0, code === 'quota_exceeded' ? 'You have used today’s AI plans, so the offline coach built this one.' : status === 503 ? 'The AI coach is not available right now, so the offline coach built this plan.' : 'No connection to the AI coach, so the offline coach built this plan.');
    }
  };

  const patchDay = (di: number, fn: (exs: PlanDay['exercises']) => PlanDay['exercises']) =>
    setPlan((p) => p && ({ ...p, days: p.days.map((d, i) => (i === di ? { ...d, exercises: fn(d.exercises) } : d)) }));
  const exclude = (di: number) => plan?.days[di]?.exercises.map((e) => e.name) ?? [];
  const onLibPick = (e: LibExercise) => {
    if (!lib) return;
    if (lib.mode === 'swap' && lib.ex !== undefined) patchDay(lib.day, (xs) => replaceAt(xs, lib.ex!, swapExercise(xs[lib.ex!], e, ctx)));
    else patchDay(lib.day, (xs) => insertAt(xs, xs.length, exerciseFromLib(e, ctx)));
    setLib(null);
  };

  const saveDay = async (i: number, d: PlanDay) => {
    setBusy(true);
    try {
      const r = await coach.create({ name: d.name, focus: d.focus, exercises: d.exercises, weekdays: days[i], source: 'coach' });
      setRoutines((x) => [r, ...x]); setSaved((x) => ({ ...x, [i]: true }));
    } catch (e: any) { Alert.alert('Could not save', e?.response?.data?.message || 'Check your connection and try again.'); } finally { setBusy(false); }
  };

  const saveAll = async () => {
    if (!plan) return;
    setBusy(true);
    let ok = 0;
    for (let i = 0; i < plan.days.length; i++) {
      if (saved[i]) continue;
      try { const r = await coach.create({ name: plan.days[i].name, focus: plan.days[i].focus, exercises: plan.days[i].exercises, weekdays: days[i], source: 'coach' }); setRoutines((x) => [r, ...x]); setSaved((x) => ({ ...x, [i]: true })); ok++; }
      catch (e: any) { Alert.alert('Could not save everything', e?.response?.data?.message || 'Check your connection and try again.'); break; }
    }
    setBusy(false);
    if (ok) Alert.alert('Plan saved', 'Your week is in Train. Today’s workout shows at the top on the days you chose.', [{ text: 'View in Train', onPress: () => nav.goBack() }, { text: 'Stay', style: 'cancel' }]);
  };

  const addTo = async (routine: Routine | null) => {
    const ex = adding; setAdding(null);
    if (!ex) return;
    try {
      if (routine) { const r = await coach.addExercises(routine._id, [ex]); setRoutines((x) => x.map((y) => y._id === routine._id ? r.routine : y)); Alert.alert(r.added ? 'Added' : 'Already there', r.added ? `${ex.name} is now in ${routine.name}.` : `${ex.name} is already in ${routine.name}.`); }
      else { const r = await coach.create({ name: 'My workout', exercises: [ex], source: 'coach' }); setRoutines((x) => [r, ...x]); Alert.alert('Saved', `Started a new workout with ${ex.name}. Rename it and pick its days in Train.`); }
    } catch (e: any) { Alert.alert('Could not add', e?.response?.data?.message || 'Try again.'); }
  };

  return (
    <View style={{ flex: 1 }}>
      <SpaceBackground quiet />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.top}>
          <TouchableOpacity onPress={() => (phase === 'result' ? setPhase('form') : nav.goBack())} hitSlop={10} accessibilityLabel="Back"><Ionicons name="chevron-back" size={28} color={colors.ink} /></TouchableOpacity>
          <Text style={s.title}>Workout coach</Text><View style={{ width: 28 }} />
        </View>

        {phase === 'loading' ? (
          <View style={s.center}><ActivityIndicator size="large" color={colors.brandBright} /><Text style={s.centerT}>Building your plan…</Text><Text style={s.centerS}>{briefSummary(brief)}</Text></View>
        ) : phase === 'form' ? (
          <>
            <ScrollView contentContainerStyle={{ paddingBottom: 130 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={s.lead}>Tell the coach what you want to become. The AI coach suggests your exercises, sets and reps. If it is unavailable, or you tap Quick plan, the offline coach builds one on your phone. Either way you can change anything before you save.</Text>
              <Eyebrow>Your goal</Eyebrow><View style={s.pad}><Chips list={GOALS} value={brief.goal} onPick={(k) => set({ goal: k })} /></View>
              <Eyebrow>The body you want</Eyebrow><View style={s.pad}><Chips list={BODY_STYLES} value={brief.bodyStyle} onPick={(k) => set({ bodyStyle: k })} wide /></View>
              <Eyebrow>Your experience</Eyebrow><View style={s.pad}><Chips list={LEVELS} value={brief.level} onPick={(k) => set({ level: k })} /></View>
              <Eyebrow>Equipment</Eyebrow><View style={s.pad}><Chips list={EQUIPMENT} value={brief.equipment} onPick={(k) => set({ equipment: k })} /></View>
              <Eyebrow>Days a week</Eyebrow><View style={s.pad}><Seg values={DAYS_PER_WEEK} value={brief.daysPerWeek} onPick={(n) => set({ daysPerWeek: n })} /></View>
              <Eyebrow>Minutes per workout</Eyebrow><View style={s.pad}><Seg values={SESSION_MINUTES} value={brief.minutes} onPick={(n) => set({ minutes: n })} /></View>
              <Eyebrow right="optional">Extra focus</Eyebrow><View style={s.pad}><Chips list={FOCUS} value={brief.focus} multi onPick={(k) => set({ focus: brief.focus.includes(k) ? brief.focus.filter((x) => x !== k) : brief.focus.length >= 4 ? brief.focus : [...brief.focus, k] })} /></View>
              <Eyebrow right="optional">Anything that hurts?</Eyebrow><View style={s.pad}><Chips list={AVOID} value={brief.avoid} multi onPick={(k) => set({ avoid: brief.avoid.includes(k) ? brief.avoid.filter((x) => x !== k) : [...brief.avoid, k] })} /></View>
              <Text style={s.fine}>The coach leaves out exercises that stress what you tick.</Text>
              <Eyebrow right="optional">Anything to know?</Eyebrow>
              <TextInput style={s.input} value={brief.notes} onChangeText={(v) => set({ notes: v })} placeholder="For example: sore left knee, no jumping" placeholderTextColor={colors.faint} maxLength={200} multiline />
              <Text style={s.fine}>Suggestions come from AI. They are general guidance, not medical advice. Stop if something hurts.</Text>
            </ScrollView>
            <View style={s.bar}>
              <TouchableOpacity onPress={build} disabled={!briefReady(brief)} activeOpacity={0.9} accessibilityRole="button">
                <LinearGradient colors={['#ff7a1a', '#d62839']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.go, !briefReady(brief) && { opacity: 0.4 }]}>
                  <Ionicons name="sparkles" size={18} color="#fff" /><Text style={s.goText}>{briefReady(brief) ? 'Build my plan with AI' : 'Choose a goal and a body style'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => buildOffline(0)} disabled={!briefReady(brief)} style={[s.offline, !briefReady(brief) && { opacity: 0.4 }]} accessibilityRole="button">
                <Ionicons name="flash-outline" size={17} color={colors.brandBright} /><Text style={s.offlineText}>Quick plan · works offline</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : plan ? (
          <>
            <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
              <GlassCard glow>
                <View style={s.srcRow}>
                  <View style={s.src}><Ionicons name={plan.source === 'ai' ? 'sparkles' : 'flash-outline'} size={13} color={colors.brandBright} /><Text style={s.srcText}>{plan.source === 'ai' ? 'AI coach' : 'Offline coach'}</Text></View>
                  {plan.source === 'offline' ? <TouchableOpacity onPress={() => buildOffline(seed + 1, why)} style={s.shuffle} accessibilityRole="button"><Ionicons name="shuffle" size={15} color={colors.brandBright} /><Text style={s.shuffleText}>Shuffle</Text></TouchableOpacity> : null}
                </View>
                {why ? <Text style={s.why}>{why}</Text> : null}
                <Text style={s.sumEyebrow}>YOUR PLAN</Text>
                <Text style={s.sumTitle}>{briefSummary(brief)}</Text>
                {plan.summary ? <Text style={s.sumBody}>{plan.summary}</Text> : null}
                {plan.notes.map((n, i) => <Text key={i} style={s.note}>{n}</Text>)}
                <Text style={s.editHint}>Tap any exercise to change its sets, reps and rest, swap it, or remove it.</Text>
              </GlassCard>

              {plan.days.map((d, i) => (
                <View key={i}>
                  <Eyebrow right={`${d.exercises.length} exercises`}>{`Day ${i + 1}`}</Eyebrow>
                  <GlassCard>
                    <TextInput style={s.dayName} value={d.name} editable={!saved[i]} maxLength={40} onChangeText={(v) => setPlan((p) => p && ({ ...p, days: p.days.map((x, k) => (k === i ? { ...x, name: v } : x)) }))} accessibilityLabel="Workout name" />
                    {d.focus ? <Text style={s.dayFocus}>{d.focus}</Text> : null}
                    {d.exercises.map((e, j) => {
                      const key = `${i}-${j}`; const open = openEx === key && !saved[i];
                      return (
                        <View key={`${e.name}-${j}`} style={[s.exWrap, j > 0 && s.exBorder]}>
                          <TouchableOpacity style={s.ex} activeOpacity={0.8} onPress={() => !saved[i] && setOpenEx(open ? null : key)} accessibilityRole="button">
                            <View style={{ flex: 1 }}>
                              <Text style={s.exName}>{e.name}</Text>
                              <Text style={s.exMeta}>{e.sets} × {e.reps}{e.unit === 'sec' ? ' sec' : ''}{e.muscle ? ` · ${e.muscle}` : ''} · rest {e.restSec}s</Text>
                              {e.tip && !open ? <Text style={s.exTip}>{e.tip}</Text> : null}
                            </View>
                            <TouchableOpacity onPress={() => setAdding(e)} style={s.add} accessibilityRole="button" accessibilityLabel={`Add ${e.name} to a saved workout`}><Ionicons name="bookmark-outline" size={17} color="#fff" /></TouchableOpacity>
                            {!saved[i] ? <Ionicons name={open ? 'chevron-up' : 'create-outline'} size={18} color={colors.faint} /> : null}
                          </TouchableOpacity>
                          {open ? (
                            <ExerciseEditor ex={e}
                              onChange={(x) => patchDay(i, (xs) => replaceAt(xs, j, x))}
                              onSwap={() => setLib({ mode: 'swap', day: i, ex: j })}
                              onMove={(dir) => { patchDay(i, (xs) => moveAt(xs, j, dir)); setOpenEx(`${i}-${Math.min(d.exercises.length - 1, Math.max(0, j + dir))}`); }}
                              onRemove={() => { if (d.exercises.length <= 2) { Alert.alert('Keep at least two', 'A day needs a couple of exercises. Remove the whole day by not saving it.'); return; } patchDay(i, (xs) => removeAt(xs, j)); setOpenEx(null); }} />
                          ) : null}
                        </View>
                      );
                    })}
                    {!saved[i] ? <TouchableOpacity onPress={() => setLib({ mode: 'add', day: i })} style={s.addEx} accessibilityRole="button"><Ionicons name="add-circle-outline" size={18} color={colors.brandBright} /><Text style={s.addExText}>Add an exercise</Text></TouchableOpacity> : null}
                    <Text style={s.when}>On these days</Text>
                    <View style={s.wd}>
                      {WEEKDAYS.map((w, k) => {
                        const on = days[i]?.includes(k);
                        return <TouchableOpacity key={w} disabled={saved[i]} onPress={() => setDays((x) => x.map((a, idx) => idx === i ? (on ? a.filter((y) => y !== k) : [...a, k]) : a))} style={[s.wdItem, on && s.wdOn]}><Text style={[s.wdText, on && { color: '#fff' }]}>{w[0]}</Text></TouchableOpacity>;
                      })}
                    </View>
                    <Text style={s.whenLabel}>{weekdaysLabel(days[i] ?? [])}</Text>
                    <TouchableOpacity disabled={busy || saved[i]} onPress={() => saveDay(i, d)} style={[s.saveDay, saved[i] && { opacity: 0.6 }]} accessibilityRole="button">
                      <Ionicons name={saved[i] ? 'checkmark-circle' : 'bookmark-outline'} size={18} color={colors.brandBright} /><Text style={s.saveDayText}>{saved[i] ? 'Saved to your plan' : 'Save this workout'}</Text>
                    </TouchableOpacity>
                  </GlassCard>
                </View>
              ))}

              {plan.tips.length ? (
                <>
                  <Eyebrow>Coach tips</Eyebrow>
                  <GlassCard>{plan.tips.map((t, i) => <View key={i} style={s.tip}><Ionicons name="bulb-outline" size={18} color={colors.brandBright} /><Text style={s.tipText}>{t}</Text></View>)}</GlassCard>
                </>
              ) : null}
            </ScrollView>
            <View style={s.bar}>
              <TouchableOpacity onPress={saveAll} disabled={busy || plan.days.every((_, i) => saved[i])} activeOpacity={0.9} accessibilityRole="button">
                <LinearGradient colors={['#ff7a1a', '#d62839']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.go, plan.days.every((_, i) => saved[i]) && { opacity: 0.5 }]}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.goText}>{plan.days.every((_, i) => saved[i]) ? 'Plan saved' : 'Add the whole week to my plan'}</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </SafeAreaView>

      <LibrarySheet mode={lib?.mode ?? null} current={lib?.ex !== undefined && plan ? plan.days[lib.day]?.exercises[lib.ex] : undefined} ctx={ctx} exclude={lib ? exclude(lib.day) : []} onPick={onLibPick} onClose={() => setLib(null)} />

      <Modal visible={!!adding} transparent animationType="slide" onRequestClose={() => setAdding(null)}>
        <View style={s.back}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setAdding(null)} />
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Add {adding?.name} to…</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {routines.map((r) => (
                <TouchableOpacity key={r._id} style={s.sheetRow} onPress={() => addTo(r)}><View style={{ flex: 1 }}><Text style={s.sheetName}>{r.name}</Text><Text style={s.sheetSub}>{r.exercises.length} exercises · {weekdaysLabel(r.weekdays)}</Text></View><Ionicons name="add-circle-outline" size={22} color={colors.brandBright} /></TouchableOpacity>
              ))}
              <TouchableOpacity style={s.sheetRow} onPress={() => addTo(null)}><View style={{ flex: 1 }}><Text style={s.sheetName}>A new workout</Text><Text style={s.sheetSub}>Starts with this exercise</Text></View><Ionicons name="sparkles-outline" size={22} color={colors.brandBright} /></TouchableOpacity>
            </ScrollView>
            <TouchableOpacity onPress={() => setAdding(null)} style={{ alignItems: 'center', padding: 14 }}><Text style={{ color: colors.muted, fontWeight: '800' }}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 }, title: { fontSize: 20, fontWeight: '900', color: colors.ink },
  lead: { color: colors.muted, fontSize: 14, lineHeight: 20, marginHorizontal: 22, marginBottom: 4 }, pad: { paddingHorizontal: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.05)' },
  chipWide: { width: '48.5%', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }, chipOn: { backgroundColor: colors.brand, borderColor: colors.brandBright },
  chipText: { color: colors.inkSoft, fontWeight: '800', fontSize: 14 }, chipHint: { color: colors.muted, fontSize: 11.5 },
  seg: { flexDirection: 'row', gap: 8 }, segItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.05)' }, segOn: { backgroundColor: colors.brand, borderColor: colors.brandBright }, segText: { color: colors.inkSoft, fontWeight: '900', fontSize: 15 },
  input: { marginHorizontal: 20, minHeight: 64, borderRadius: 14, padding: 14, color: colors.ink, fontSize: 15, backgroundColor: 'rgba(10,18,38,0.88)', borderWidth: 1, borderColor: 'rgba(255,190,140,0.2)', textAlignVertical: 'top' },
  fine: { color: colors.faint, fontSize: 11.5, lineHeight: 16, marginHorizontal: 24, marginTop: 14 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 26, backgroundColor: 'rgba(5,10,20,0.96)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  go: { height: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, goText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 30 }, centerT: { color: colors.ink, fontSize: 20, fontWeight: '900' }, centerS: { color: colors.muted, textAlign: 'center' },
  offline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,154,77,0.45)', backgroundColor: 'rgba(255,122,26,0.08)' }, offlineText: { color: colors.brandBright, fontWeight: '800', fontSize: 14.5 },
  srcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, src: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(255,122,26,0.14)' }, srcText: { color: colors.brandBright, fontWeight: '800', fontSize: 12 },
  shuffle: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,154,77,0.45)' }, shuffleText: { color: colors.brandBright, fontWeight: '800', fontSize: 13 },
  why: { color: colors.warning, fontSize: 12.5, lineHeight: 18, marginBottom: 8 }, note: { color: colors.muted, fontSize: 12.5, lineHeight: 18, marginTop: 8 }, editHint: { color: colors.faint, fontSize: 12, marginTop: 10 },
  dayName: { color: colors.ink, fontSize: 19, fontWeight: '900', paddingVertical: 2, marginBottom: 2 },
  exWrap: { paddingVertical: 4 }, addEx: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, justifyContent: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' }, addExText: { color: colors.brandBright, fontWeight: '800', fontSize: 14 },
  sumEyebrow: { color: colors.brandBright, fontSize: 11, fontWeight: '900', letterSpacing: 2 }, sumTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: 6 }, sumBody: { color: colors.inkSoft, fontSize: 14.5, lineHeight: 21, marginTop: 8 },
  dayFocus: { color: colors.muted, fontSize: 13, marginBottom: 6 },
  ex: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 }, exBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  exName: { color: colors.ink, fontWeight: '800', fontSize: 15.5 }, exMeta: { color: colors.muted, fontSize: 12.5, marginTop: 2 }, exTip: { color: colors.faint, fontSize: 12, marginTop: 3, fontStyle: 'italic' },
  add: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  when: { color: colors.muted, fontSize: 11.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
  wd: { flexDirection: 'row', gap: 6 }, wdItem: { flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }, wdOn: { backgroundColor: colors.brand, borderColor: colors.brandBright }, wdText: { color: colors.inkSoft, fontWeight: '900' },
  whenLabel: { color: colors.faint, fontSize: 12, marginTop: 6 },
  saveDay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 14, marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,154,77,0.5)', backgroundColor: 'rgba(255,122,26,0.1)' }, saveDayText: { color: colors.brandBright, fontWeight: '900', fontSize: 14.5 },
  tip: { flexDirection: 'row', gap: 10, paddingVertical: 5 }, tipText: { flex: 1, color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0a1226', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }, sheetTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginBottom: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' }, sheetName: { color: colors.ink, fontWeight: '800', fontSize: 15.5 }, sheetSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
