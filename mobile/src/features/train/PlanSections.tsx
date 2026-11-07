import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { Eyebrow, GlassCard } from '../mission/ui';
import { DayChallenge, daysLeftLabel, paceLabel } from '../challenges/challengeLogic';
import { StatusBar } from '../challenges/ui';
import { Routine, RoutineExercise, WEEKDAYS, routineToTemplate, routinesFor, weekdaysLabel, Template } from './trainLogic';
import { ExerciseEditor, LibrarySheet } from '../coach/EditUI';
import { ctxOf } from '../coach/planGenerator';
import { exerciseFromLib, insertAt, moveAt, removeAt, replaceAt, sameExercises, swapExercise } from '../coach/planEdit';
import type { LibExercise } from '../coach/exerciseLibrary';
import { coach } from '../../services/coachService';

/** Your active challenges with everyone's bar, right where you start your workouts. */
export function ChallengeStrip({ challenges, onOpen, onBrowse }: { challenges: DayChallenge[]; onOpen: (id: string) => void; onBrowse: () => void }) {
  const active = challenges.filter((c) => c.myStatus === 'joined' && c.state === 'active').slice(0, 2);
  const invites = challenges.filter((c) => c.myStatus === 'invited').length;
  if (active.length === 0) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onBrowse} accessibilityRole="button" style={{ marginHorizontal: 20, marginBottom: 14 }}>
        <LinearGradient colors={['rgba(214,40,57,0.35)', 'rgba(12,23,48,0.9)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cta}>
          <Ionicons name="trophy-outline" size={26} color={colors.brandBright} />
          <View style={{ flex: 1 }}>
            <Text style={s.ctaTitle}>{invites ? `${invites} challenge invitation${invites === 1 ? '' : 's'}` : '30, 60 or 90 day challenge'}</Text>
            <Text style={s.ctaSub}>{invites ? 'Tap to join your friends.' : 'Train with friends and watch each other’s progress.'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.faint} />
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  return (
    <>
      <Eyebrow right={invites ? `${invites} invite${invites === 1 ? '' : 's'}` : undefined}>Challenges</Eyebrow>
      {active.map((c) => (
        <TouchableOpacity key={c._id} activeOpacity={0.9} onPress={() => onOpen(c._id)} accessibilityRole="button">
          <GlassCard>
            <View style={s.cHead}>
              <View style={{ flex: 1 }}><Text style={s.cTitle}>{c.title}</Text><Text style={s.cMeta}>Day {c.dayNumber} of {c.days} · {daysLeftLabel(c)} · {paceLabel(c.perWeek)}</Text></View>
              <Ionicons name="chevron-forward" size={20} color={colors.faint} />
            </View>
            {c.members.filter((m) => m.status === 'joined').slice(0, 4).map((m) => <StatusBar key={m._id} member={m} challenge={c} compact />)}
          </GlassCard>
        </TouchableOpacity>
      ))}
    </>
  );
}

/** What is planned for today, with a Start button. When nothing is planned it points at the coach. */
export function TodayPlan({ routines, weekday, onStart, onCoach }: { routines: Routine[]; weekday: number; onStart: (t: Template) => void; onCoach: () => void }) {
  const today = routinesFor(routines, weekday);
  return (
    <>
      <Eyebrow right={WEEKDAYS[weekday]}>Today’s plan</Eyebrow>
      {today.length > 0 ? today.map((r) => (
        <GlassCard key={r._id} glow>
          <Text style={s.cTitle}>{r.name}</Text>
          <Text style={s.cMeta}>{r.focus ? `${r.focus} · ` : ''}{r.exercises.length} exercises</Text>
          <Text style={s.preview} numberOfLines={2}>{r.exercises.map((e) => e.name).join(' · ')}</Text>
          <TouchableOpacity onPress={() => onStart(routineToTemplate(r))} activeOpacity={0.88} style={{ marginTop: 12 }} accessibilityRole="button">
            <LinearGradient colors={['#d62839', '#ff7a1a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.start}><Ionicons name="flash" size={18} color="#fff" /><Text style={s.startText}>Start today’s workout</Text></LinearGradient>
          </TouchableOpacity>
        </GlassCard>
      )) : (
        <GlassCard>
          <Text style={s.cMeta}>{routines.length ? 'Nothing planned for today. Rest, or pick any workout below.' : 'You have no plan yet. Tell the coach what you want to become and it will suggest your week.'}</Text>
          {routines.length === 0 ? <TouchableOpacity onPress={onCoach} style={s.link} accessibilityRole="button"><Text style={s.linkText}>Build my plan</Text></TouchableOpacity> : null}
        </GlassCard>
      )}
    </>
  );
}

export function CoachCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} accessibilityRole="button" style={{ marginHorizontal: 20, marginBottom: 14 }}>
      <LinearGradient colors={['#ff7a1a', '#d62839', '#3a0b16']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.coach}>
        <View style={s.coachIcon}><Ionicons name="sparkles" size={24} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.coachTitle}>Workout coach</Text>
          <Text style={s.coachSub}>Pick your goal and the body you want. Get a plan from the AI, or an instant one that works offline. Then change anything you like.</Text>
        </View>
        <Ionicons name="arrow-forward" size={22} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

/** Saved workouts: edit them, schedule them on weekdays, start them, delete them. */
export function MyWorkouts({ routines, onChange, onStart }: { routines: Routine[]; onChange: (r: Routine[]) => void; onStart: (t: Template) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, { name: string; exercises: RoutineExercise[] }>>({});
  const [openEx, setOpenEx] = useState<string | null>(null);
  const [lib, setLib] = useState<{ mode: 'swap' | 'add'; id: string; ex?: number } | null>(null);
  const [saving, setSaving] = useState(false);
  // Saved workouts are not tied to a gym or a level, so every exercise is on offer when swapping or adding.
  const ctx = useMemo(() => ctxOf({ equipment: 'full_gym', level: 'advanced', avoid: [], goal: 'general_fitness', bodyStyle: '' }), []);
  if (routines.length === 0) return null;

  const replace = (r: Routine) => onChange(routines.map((x) => (x._id === r._id ? r : x)));
  const fail = (e: any) => Alert.alert('Could not save', e?.response?.data?.message || 'Check your connection and try again.');
  const expand = (r: Routine) => {
    if (open === r._id) { setOpen(null); return; }
    setOpen(r._id); setOpenEx(null);
    setDraft((d) => ({ ...d, [r._id]: d[r._id] ?? { name: r.name, exercises: r.exercises } }));
  };
  const dr = (r: Routine) => draft[r._id] ?? { name: r.name, exercises: r.exercises };
  const setEx = (r: Routine, fn: (xs: RoutineExercise[]) => RoutineExercise[]) => setDraft((d) => ({ ...d, [r._id]: { ...dr(r), exercises: fn(dr(r).exercises) } }));
  const dirty = (r: Routine) => dr(r).name.trim() !== r.name || !sameExercises(dr(r).exercises, r.exercises);

  const toggleDay = async (r: Routine, d: number) => {
    const next = r.weekdays.includes(d) ? r.weekdays.filter((x) => x !== d) : [...r.weekdays, d];
    replace({ ...r, weekdays: next });
    try { replace({ ...(await coach.update(r._id, { weekdays: next })), weekdays: next }); } catch (e) { replace(r); fail(e); }
  };
  const saveChanges = async (r: Routine) => {
    const { name, exercises } = dr(r);
    if (!name.trim()) { Alert.alert('Give the workout a name'); return; }
    setSaving(true);
    try { const saved = await coach.update(r._id, { name: name.trim(), exercises }); replace(saved); setDraft((d) => ({ ...d, [r._id]: { name: saved.name, exercises: saved.exercises } })); setOpenEx(null); }
    catch (e) { fail(e); } finally { setSaving(false); }
  };
  const del = (r: Routine) => Alert.alert(`Delete ${r.name}?`, 'It is removed from your plan. Your workout history stays.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await coach.remove(r._id); onChange(routines.filter((x) => x._id !== r._id)); } catch (e) { fail(e); } } },
  ]);
  const onPick = (e: LibExercise) => {
    if (!lib) return;
    const r = routines.find((x) => x._id === lib.id);
    if (r) setEx(r, (xs) => (lib.mode === 'swap' && lib.ex !== undefined ? replaceAt(xs, lib.ex, swapExercise(xs[lib.ex], e, ctx)) : insertAt(xs, xs.length, exerciseFromLib(e, ctx))));
    setLib(null);
  };
  const libRoutine = lib ? routines.find((x) => x._id === lib.id) : undefined;

  return (
    <>
      <Eyebrow right={`${routines.length} saved`}>My workouts</Eyebrow>
      {routines.map((r) => (
        <GlassCard key={r._id} style={{ paddingVertical: 14 }}>
          <TouchableOpacity onPress={() => expand(r)} activeOpacity={0.85} style={s.rHead} accessibilityRole="button">
            <View style={s.rIcon}><Ionicons name={r.source === 'coach' ? 'sparkles' : 'albums-outline'} size={20} color={colors.brandBright} /></View>
            <View style={{ flex: 1 }}><Text style={s.cTitle}>{r.name}</Text><Text style={s.cMeta}>{r.exercises.length} exercises · {weekdaysLabel(r.weekdays)}</Text></View>
            <Ionicons name={open === r._id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.faint} />
          </TouchableOpacity>
          {open === r._id ? (
            <View style={{ marginTop: 12 }}>
              <TextInput style={s.nameInput} value={dr(r).name} onChangeText={(v) => setDraft((d) => ({ ...d, [r._id]: { ...dr(r), name: v } }))} maxLength={60} accessibilityLabel="Workout name" />
              {dr(r).exercises.map((e, j) => {
                const key = `${r._id}-${j}`; const editing = openEx === key;
                return (
                  <View key={`${e.name}-${j}`} style={s.exWrap}>
                    <TouchableOpacity style={s.exRow} onPress={() => setOpenEx(editing ? null : key)} accessibilityRole="button">
                      <View style={{ flex: 1 }}><Text style={s.exName}>{e.name}</Text>{e.muscle ? <Text style={s.exMuscle}>{e.muscle}</Text> : null}</View>
                      <Text style={s.exSets}>{e.sets} × {e.reps}{e.unit === 'sec' ? 's' : ''}</Text>
                      <Ionicons name={editing ? 'chevron-up' : 'create-outline'} size={18} color={colors.faint} style={{ marginLeft: 10 }} />
                    </TouchableOpacity>
                    {editing ? (
                      <ExerciseEditor ex={e}
                        onChange={(x) => setEx(r, (xs) => replaceAt(xs, j, x))}
                        onSwap={() => setLib({ mode: 'swap', id: r._id, ex: j })}
                        onMove={(dir) => { setEx(r, (xs) => moveAt(xs, j, dir)); setOpenEx(`${r._id}-${Math.min(dr(r).exercises.length - 1, Math.max(0, j + dir))}`); }}
                        onRemove={() => { if (dr(r).exercises.length <= 1) { Alert.alert('A workout needs an exercise', 'Delete the whole workout instead.'); return; } setEx(r, (xs) => removeAt(xs, j)); setOpenEx(null); }} />
                    ) : null}
                  </View>
                );
              })}
              <TouchableOpacity onPress={() => setLib({ mode: 'add', id: r._id })} style={s.addEx} accessibilityRole="button"><Ionicons name="add-circle-outline" size={18} color={colors.brandBright} /><Text style={s.addExText}>Add an exercise</Text></TouchableOpacity>
              {dirty(r) ? (
                <TouchableOpacity onPress={() => saveChanges(r)} disabled={saving} style={s.saveBtn} accessibilityRole="button"><Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save changes'}</Text></TouchableOpacity>
              ) : null}

              <Text style={s.when}>Plan it on</Text>
              <View style={s.wd}>{WEEKDAYS.map((w, d) => { const on = r.weekdays.includes(d); return <TouchableOpacity key={w} onPress={() => toggleDay(r, d)} style={[s.wdItem, on && s.wdOn]} accessibilityRole="button" accessibilityState={{ selected: on }}><Text style={[s.wdText, on && { color: '#fff' }]}>{w[0]}</Text></TouchableOpacity>; })}</View>
              <TouchableOpacity onPress={() => onStart(routineToTemplate(r))} activeOpacity={0.88} style={{ marginTop: 14 }} accessibilityRole="button">
                <LinearGradient colors={['#d62839', '#ff7a1a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.start}><Ionicons name="flash" size={18} color="#fff" /><Text style={s.startText}>{dirty(r) ? 'Start (saved version)' : 'Start guided workout'}</Text></LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => del(r)} style={{ alignItems: 'center', padding: 12 }}><Text style={{ color: '#ff6b7a', fontWeight: '800' }}>Delete workout</Text></TouchableOpacity>
            </View>
          ) : null}
        </GlassCard>
      ))}
      <LibrarySheet mode={lib?.mode ?? null} current={lib?.ex !== undefined && libRoutine ? dr(libRoutine).exercises[lib.ex] : undefined} ctx={ctx} exclude={libRoutine ? dr(libRoutine).exercises.map((e) => e.name) : []} onPick={onPick} onClose={() => setLib(null)} />
    </>
  );
}

const s = StyleSheet.create({
  cta: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,190,140,0.25)' }, ctaTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' }, ctaSub: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
  cHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }, cTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' }, cMeta: { color: colors.muted, fontSize: 12.5, marginTop: 3, lineHeight: 18 }, preview: { color: colors.faint, fontSize: 12.5, marginTop: 8, lineHeight: 18 },
  start: { height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, startText: { color: '#fff', fontWeight: '900', fontSize: 15.5 },
  link: { marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.brand }, linkText: { color: '#fff', fontWeight: '800' },
  coach: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,190,140,0.35)' }, coachIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  coachTitle: { color: '#fff', fontSize: 19, fontWeight: '900' }, coachSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  rHead: { flexDirection: 'row', alignItems: 'center', gap: 12 }, rIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,122,26,0.12)', borderWidth: 1, borderColor: 'rgba(255,122,26,0.3)' },
  nameInput: { color: colors.ink, fontSize: 17, fontWeight: '900', paddingVertical: 6, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)' },
  exWrap: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  addEx: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, justifyContent: 'center' }, addExText: { color: colors.brandBright, fontWeight: '800', fontSize: 14 },
  saveBtn: { height: 46, borderRadius: 14, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 4 }, saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  exRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }, exName: { color: colors.inkSoft, fontSize: 14.5, fontWeight: '600' }, exMuscle: { color: colors.faint, fontSize: 11.5, marginTop: 1 }, exSets: { color: colors.muted, fontSize: 13.5, fontWeight: '700' },
  when: { color: colors.muted, fontSize: 11.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
  wd: { flexDirection: 'row', gap: 6 }, wdItem: { flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }, wdOn: { backgroundColor: colors.brand, borderColor: colors.brandBright }, wdText: { color: colors.inkSoft, fontWeight: '900' },
});
