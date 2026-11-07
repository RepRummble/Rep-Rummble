import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useKeepAwake } from 'expo-keep-awake';
import { colors } from '../../theme/colors';
import SpaceBackground from '../../components/fx/SpaceBackground';
import { GlassCard } from '../mission/ui';
import { LoggedSet, Template, WorkoutRec, fmtDuration, lastPerformance, newRecords, sessionVolume } from './trainLogic';

export interface FinishedSession { name: string; elapsedSec: number; sets: LoggedSet[]; volume: number }

/** Keeps the phone awake while a workout is running. */
function Awake() { useKeepAwake(); return null; }

/**
 * A guided workout: one set at a time, with a rest timer. Every set you complete is recorded for real (exercise, reps, weight),
 * so your records are your own lifts. The weights start from what you lifted last time; change them as you go.
 */
export default function WorkoutPlayer({ visible, template, history, saving, onClose, onSave }: {
  visible: boolean; template: Template | null; history: WorkoutRec[]; saving: boolean;
  onClose: () => void; onSave: (s: FinishedSession) => void;
}) {
  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [reps, setReps] = useState(8);
  const [weight, setWeight] = useState(0);
  const [phase, setPhase] = useState<'active' | 'resting' | 'summary'>('active');
  const [rest, setRest] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [logged, setLogged] = useState<LoggedSet[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const last = useRef(new Map<string, { weight: number; reps: number }>());

  // What you did last time for each exercise (so the weights start where you left off).
  useEffect(() => {
    if (!visible || !template) return;
    const m = lastPerformance(history);
    last.current = m;
    setExIdx(0); setSetIdx(0); setLogged([]); setElapsed(0); setPhase('active');
    const first = template.exercises[0];
    setReps(first.reps); setWeight(m.get(first.name)?.weight ?? first.startWeight);
  }, [visible, template, history]);

  useEffect(() => {
    if (!visible || phase === 'summary') return;
    timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [visible, phase]);

  useEffect(() => () => { if (restTimer.current) clearInterval(restTimer.current); }, []);

  if (!template) return null;
  const ex = template.exercises[exIdx];
  const totalSets = template.exercises.reduce((n, e) => n + e.sets, 0);
  const prevBest = last.current.get(ex.name);
  const volume = sessionVolume(logged);
  const isTime = ex.name.includes('(seconds)');

  const goNext = () => {
    if (restTimer.current) clearInterval(restTimer.current);
    const nextSet = setIdx + 1;
    if (nextSet < ex.sets) { setSetIdx(nextSet); setPhase('active'); return; }
    const nextEx = exIdx + 1;
    if (nextEx >= template.exercises.length) { setPhase('summary'); return; }
    const e = template.exercises[nextEx];
    setExIdx(nextEx); setSetIdx(0); setReps(e.reps); setWeight(last.current.get(e.name)?.weight ?? e.startWeight); setPhase('active');
  };

  const completeSet = () => {
    setLogged((l) => [...l, { exercise: ex.name, reps, weight }]);
    const isLast = exIdx === template.exercises.length - 1 && setIdx === ex.sets - 1;
    if (isLast) { setPhase('summary'); return; }
    setRest(ex.rest); setPhase('resting');
    if (restTimer.current) clearInterval(restTimer.current);
    restTimer.current = setInterval(() => setRest((r) => { if (r <= 1) { clearInterval(restTimer.current!); setTimeout(goNext, 0); return 0; } return r - 1; }), 1000);
  };

  const finishEarly = () => {
    if (logged.length === 0) { Alert.alert('End workout?', 'Nothing has been logged yet.', [{ text: 'Keep going', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: onClose }]); return; }
    Alert.alert('Finish now?', `You have logged ${logged.length} set${logged.length === 1 ? '' : 's'}.`, [
      { text: 'Keep going', style: 'cancel' }, { text: 'Save what I did', onPress: () => setPhase('summary') }, { text: 'Discard', style: 'destructive', onPress: onClose },
    ]);
  };

  const records = phase === 'summary' ? newRecords(history, logged) : [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={finishEarly}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <SpaceBackground quiet />
        {visible && <Awake />}
        <SafeAreaView style={{ flex: 1 }}>
          <View style={s.top}>
            <TouchableOpacity onPress={phase === 'summary' ? onClose : finishEarly} style={s.endBtn} accessibilityLabel="End workout"><Ionicons name="close" size={18} color={colors.muted} /><Text style={s.endText}>{phase === 'summary' ? 'Close' : 'End'}</Text></TouchableOpacity>
            <View style={s.timer}><Ionicons name="timer-outline" size={14} color={colors.brandBright} /><Text style={s.timerText}>{fmtDuration(elapsed)}</Text></View>
            <Text style={s.vol}>{(volume / 1000).toFixed(2)} t</Text>
          </View>

          {phase !== 'summary' && (
            <View style={s.dots}>{Array.from({ length: totalSets }, (_, i) => <View key={i} style={[s.dot, i < logged.length && s.dotOn]} />)}</View>
          )}

          {phase === 'active' && (
            <ScrollView contentContainerStyle={s.body}>
              <Text style={s.exName}>{ex.name}</Text>
              <Text style={s.setOf}>Set {setIdx + 1} of {ex.sets}</Text>
              {prevBest ? <Text style={s.last}>Last time: {prevBest.weight} kg × {prevBest.reps}</Text> : <Text style={s.last}>First time here: set a weight that feels right</Text>}
              <GlassCard glow style={{ marginHorizontal: 0, marginTop: 18 }}>
                <Stepper label={isTime ? 'Seconds' : 'Reps'} value={reps} onChange={setReps} min={1} max={isTime ? 600 : 100} step={isTime ? 5 : 1} />
                {!isTime && <Stepper label="Weight (kg)" value={weight} onChange={setWeight} min={0} max={1000} step={2.5} />}
              </GlassCard>
              <TouchableOpacity onPress={completeSet} activeOpacity={0.88} style={{ marginTop: 22 }}>
                <LinearGradient colors={['#d62839', '#ff7a1a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.main}><Ionicons name="checkmark-circle" size={22} color="#fff" /><Text style={s.mainText}>Complete set</Text></LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          )}

          {phase === 'resting' && (
            <View style={s.restWrap}>
              <Text style={s.restLabel}>REST</Text>
              <Text style={s.restNum}>{rest}</Text>
              <Text style={s.last}>Next: {setIdx + 1 < ex.sets ? `${ex.name}, set ${setIdx + 2}` : template.exercises[exIdx + 1]?.name}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                <TouchableOpacity style={s.ghost} onPress={() => setRest((r) => r + 15)}><Text style={s.ghostText}>+15 s</Text></TouchableOpacity>
                <TouchableOpacity style={[s.ghost, { backgroundColor: colors.brand, borderColor: '#ff9a4d' }]} onPress={goNext}><Text style={[s.ghostText, { color: '#fff' }]}>Skip rest</Text></TouchableOpacity>
              </View>
            </View>
          )}

          {phase === 'summary' && (
            <ScrollView contentContainerStyle={s.body}>
              <Text style={s.exName}>{logged.length === 0 ? 'Nothing to save' : 'Workout complete'}</Text>
              <GlassCard glow style={{ marginHorizontal: 0, marginTop: 14 }}>
                <View style={s.sumRow}>
                  {[{ v: fmtDuration(elapsed), l: 'Time' }, { v: logged.length, l: 'Sets' }, { v: `${(volume / 1000).toFixed(2)} t`, l: 'Volume' }].map((x) => <View key={x.l} style={{ flex: 1, alignItems: 'center' }}><Text style={s.sumV}>{x.v}</Text><Text style={s.sumL}>{x.l}</Text></View>)}
                </View>
              </GlassCard>
              {records.length > 0 && (
                <GlassCard style={{ marginHorizontal: 0 }}>
                  <Text style={s.recTitle}>New personal records</Text>
                  {records.map((r) => <View key={r} style={s.recRow}><Ionicons name="trophy" size={16} color={colors.gold} /><Text style={s.recText}>{r}</Text></View>)}
                </GlassCard>
              )}
              {logged.length > 0 && (
                <TouchableOpacity disabled={saving} onPress={() => onSave({ name: template.name, elapsedSec: elapsed, sets: logged, volume })} activeOpacity={0.88} style={{ marginTop: 10 }}>
                  <LinearGradient colors={['#d62839', '#ff7a1a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.main}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={s.mainText}>Save workout</Text>}</LinearGradient>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', padding: 16 }}><Text style={{ color: colors.muted, fontWeight: '700' }}>{logged.length > 0 ? 'Discard' : 'Close'}</Text></TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function Stepper({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <View style={s.stepRow}>
      <Text style={s.stepLabel}>{label}</Text>
      <TouchableOpacity style={s.stepBtn} onPress={() => onChange(Math.max(min, +(value - step).toFixed(2)))} accessibilityLabel={`Less ${label}`}><Ionicons name="remove" size={22} color="#fff" /></TouchableOpacity>
      <Text style={s.stepVal}>{value}</Text>
      <TouchableOpacity style={[s.stepBtn, { backgroundColor: colors.brand }]} onPress={() => onChange(Math.min(max, +(value + step).toFixed(2)))} accessibilityLabel={`More ${label}`}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  endBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 }, endText: { color: colors.muted, fontWeight: '700' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,122,26,0.12)', borderWidth: 1, borderColor: 'rgba(255,122,26,0.35)' },
  timerText: { color: colors.ink, fontWeight: '900', fontSize: 16, fontVariant: ['tabular-nums'] },
  vol: { color: colors.brandBright, fontWeight: '800', width: 70, textAlign: 'right' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingHorizontal: 20, paddingBottom: 6 },
  dot: { width: 14, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)' }, dotOn: { backgroundColor: colors.brand },
  body: { padding: 20, paddingBottom: 40 },
  exName: { fontSize: 30, fontWeight: '900', color: colors.ink, letterSpacing: -0.6 },
  setOf: { fontSize: 14, fontWeight: '800', color: colors.brandBright, letterSpacing: 1.4, marginTop: 6 },
  last: { fontSize: 13, color: colors.muted, marginTop: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  stepLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.inkSoft },
  stepBtn: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  stepVal: { minWidth: 64, textAlign: 'center', fontSize: 26, fontWeight: '900', color: colors.ink, fontVariant: ['tabular-nums'] },
  main: { height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  mainText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },
  restWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  restLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 3, color: colors.brandBright },
  restNum: { fontSize: 110, fontWeight: '900', color: colors.ink, fontVariant: ['tabular-nums'] },
  ghost: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  ghostText: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  sumRow: { flexDirection: 'row' }, sumV: { fontSize: 24, fontWeight: '900', color: colors.ink }, sumL: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 0.6, marginTop: 3 },
  recTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 1.2, color: colors.gold, marginBottom: 10 },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 }, recText: { fontSize: 16, fontWeight: '700', color: colors.ink },
});
