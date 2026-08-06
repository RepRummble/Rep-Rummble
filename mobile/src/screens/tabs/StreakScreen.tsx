import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { Workout } from '../../types';

const { width: SW } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════

interface ExercisePlan {
  name: string; emoji: string; sets: number; reps: string;
  weight: number; rest: number; muscles: string[]; color: string;
  prevBest?: string;
}

const AI_WORKOUT: { name: string; type: string; readiness: number; duration: number; calories: number; exercises: ExercisePlan[] } = {
  name: 'Power Push Day', type: 'Strength', readiness: 89, duration: 55, calories: 520,
  exercises: [
    { name: 'Bench Press',     emoji: '🏋️', sets: 4, reps: '6–8',   weight: 90, rest: 120, muscles: ['Chest', 'Triceps'],    color: '#7c3aed', prevBest: '87.5 kg × 8' },
    { name: 'Incline DB Press',emoji: '💪', sets: 3, reps: '8–10',  weight: 32, rest: 90,  muscles: ['Upper Chest'],          color: '#a78bfa', prevBest: '30 kg × 10' },
    { name: 'Cable Flyes',     emoji: '🔗', sets: 3, reps: '12–15', weight: 15, rest: 60,  muscles: ['Chest'],                color: '#7c3aed', prevBest: '14 kg × 14' },
    { name: 'Shoulder Press',  emoji: '⬆️', sets: 4, reps: '8–10',  weight: 60, rest: 90,  muscles: ['Shoulders'],            color: '#3b82f6', prevBest: '57.5 kg × 9' },
    { name: 'Lateral Raises',  emoji: '↔️', sets: 3, reps: '15–20', weight: 12, rest: 60,  muscles: ['Side Delts'],           color: '#60a5fa', prevBest: '11 kg × 18' },
    { name: 'Tricep Pushdown', emoji: '⬇️', sets: 3, reps: '12–15', weight: 40, rest: 60,  muscles: ['Triceps'],              color: '#f97316', prevBest: '37.5 kg × 13' },
  ],
};

const POWER_DNA = {
  archetype: 'IRON WARRIOR', emoji: '⚡', color: '#7c3aed',
  desc: 'Raw strength and progressive overload is your weapon. You consistently increase weight and dominate compound lifts.',
  attrs: [
    { label: 'Strength',  value: 88, color: '#7c3aed' },
    { label: 'Power',     value: 82, color: '#ef4444' },
    { label: 'Endurance', value: 45, color: '#22c55e' },
    { label: 'Recovery',  value: 71, color: '#3b82f6' },
    { label: 'Mobility',  value: 58, color: '#eab308' },
  ],
};

const MUSCLES = [
  { name: 'Chest',      status: 'primed',     icon: 'body-outline',    days: '3d ago' },
  { name: 'Back',       status: 'sore',       icon: 'body-outline',    days: 'Yesterday' },
  { name: 'Shoulders',  status: 'primed',     icon: 'body-outline',    days: '3d ago' },
  { name: 'Biceps',     status: 'primed',     icon: 'body-outline',    days: '4d ago' },
  { name: 'Triceps',    status: 'primed',     icon: 'body-outline',    days: '3d ago' },
  { name: 'Quads',      status: 'sore',       icon: 'body-outline',    days: 'Yesterday' },
  { name: 'Hamstrings', status: 'recovering', icon: 'body-outline',    days: '2d ago' },
  { name: 'Glutes',     status: 'recovering', icon: 'body-outline',    days: '2d ago' },
  { name: 'Core',       status: 'primed',     icon: 'body-outline',    days: '4d ago' },
  { name: 'Calves',     status: 'primed',     icon: 'body-outline',    days: '4d ago' },
];

const MUSCLE_STATUS = {
  primed:     { color: '#22c55e', label: 'Primed',    dot: '#22c55e' },
  recovering: { color: '#eab308', label: 'Recovering',dot: '#eab308' },
  sore:       { color: '#ef4444', label: 'Sore',      dot: '#ef4444' },
};

const PRS = [
  { name: 'Bench Press',   value: '100 kg',  reps: '5 reps', date: '3 months ago', isNew: false, emoji: '🏋️' },
  { name: 'Back Squat',    value: '140 kg',  reps: '3 reps', date: 'Last week',    isNew: true,  emoji: '🦵' },
  { name: 'Deadlift',      value: '165 kg',  reps: '1 rep',  date: '2 weeks ago',  isNew: false, emoji: '💀' },
  { name: 'Pull-ups',      value: '20 reps', reps: 'BW',     date: '1 month ago',  isNew: false, emoji: '🤸' },
  { name: 'OHP',           value: '72.5 kg', reps: '5 reps', date: '3 weeks ago',  isNew: false, emoji: '⬆️' },
  { name: 'Session Volume',value: '18.4 t',  reps: 'total',  date: 'Yesterday',    isNew: true,  emoji: '📊' },
];

const HISTORY = [
  { label: 'Yesterday',  name: 'Leg Day',       type: 'Strength', duration: 62, cal: 480, score: 91, emoji: '🦵', vol: '14.2t' },
  { label: '2 days ago', name: 'Active Rest',   type: 'Recovery', duration: 30, cal: 180, score: 74, emoji: '🧘', vol: '—' },
  { label: '3 days ago', name: 'Pull Day',      type: 'Strength', duration: 58, cal: 450, score: 88, emoji: '💪', vol: '12.8t' },
  { label: '4 days ago', name: 'HIIT Circuit',  type: 'HIIT',     duration: 35, cal: 520, score: 95, emoji: '🔥', vol: '—' },
  { label: '5 days ago', name: 'Push Day',      type: 'Strength', duration: 55, cal: 420, score: 85, emoji: '⬆️', vol: '11.4t' },
  { label: '6 days ago', name: 'Run 5K',        type: 'Cardio',   duration: 28, cal: 380, score: 78, emoji: '🏃', vol: '—' },
  { label: '7 days ago', name: 'Full Body',     type: 'Strength', duration: 70, cal: 550, score: 92, emoji: '⚡', vol: '16.0t' },
];

const PROGRAMS = [
  { name: 'Push Pull Legs',      weeks: 8,  days: 6, level: 'Intermediate', color: '#7c3aed', emoji: '🔱', desc: 'Classic hypertrophy split targeting each muscle twice per week.' },
  { name: 'Powerlifting 5/3/1',  weeks: 12, days: 4, level: 'Advanced',     color: '#ef4444', emoji: '🏋️', desc: 'Wendler\'s legendary strength program based on percentage training.' },
  { name: 'Hypertrophy Blitz',   weeks: 6,  days: 5, level: 'Intermediate', color: '#f97316', emoji: '💪', desc: 'High-volume muscle-building program with daily progressive overload.' },
  { name: 'Athletic Performance',weeks: 8,  days: 4, level: 'All Levels',   color: '#22c55e', emoji: '⚡', desc: 'Speed, power, and strength combined for athletic performance gains.' },
];

const QUICK_LOG = [
  { name: 'Push-ups',        emoji: '💪', duration: 10, cal: 50,  type: 'strength', color: '#7c3aed', bg: ['#3b0d6b', '#1e0545'] as const },
  { name: 'Running',         emoji: '🏃', duration: 30, cal: 300, type: 'cardio',   color: '#22c55e', bg: ['#052e16', '#021208'] as const },
  { name: 'Plank',           emoji: '🧘', duration: 5,  cal: 30,  type: 'core',     color: '#3b82f6', bg: ['#1e3a5f', '#0c1f3a'] as const },
  { name: 'Squats',          emoji: '🦵', duration: 15, cal: 100, type: 'strength', color: '#7c3aed', bg: ['#3b0d6b', '#1e0545'] as const },
  { name: 'Burpees',         emoji: '🔥', duration: 10, cal: 120, type: 'hiit',     color: '#ef4444', bg: ['#450a0a', '#220505'] as const },
  { name: 'Jumping Jacks',   emoji: '⭐', duration: 10, cal: 80,  type: 'cardio',   color: '#eab308', bg: ['#422006', '#1f1005'] as const },
  { name: 'Lunges',          emoji: '🚶', duration: 15, cal: 90,  type: 'strength', color: '#f97316', bg: ['#431407', '#1f0a03'] as const },
  { name: 'Mountain Climbers',emoji: '🏔️', duration: 10, cal: 100, type: 'hiit',   color: '#ef4444', bg: ['#450a0a', '#220505'] as const },
];

const WEEK_VOLUMES = [
  { day: 'Sun', v: 12.4 }, { day: 'Mon', v: 14.2 }, { day: 'Tue', v: 0 },
  { day: 'Wed', v: 11.8 }, { day: 'Thu', v: 16.0 }, { day: 'Fri', v: 0 },
  { day: 'Sat', v: 18.4 },
];

// ═══════════════════════════════════════════════════════════
// ACTIVE WORKOUT MODAL
// ═══════════════════════════════════════════════════════════

function fmtTime(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

interface ActiveWorkoutProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (score: number, volume: number, duration: number) => void;
}

function ActiveWorkoutModal({ visible, onClose, onComplete }: ActiveWorkoutProps) {
  const insets = useSafeAreaInsets();
  const exercises = AI_WORKOUT.exercises;
  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [reps, setReps] = useState(parseInt(exercises[0]?.reps ?? '8'));
  const [weight, setWeight] = useState(exercises[0]?.weight ?? 0);
  const [phase, setPhase] = useState<'active' | 'resting' | 'done'>('active');
  const [elapsed, setElapsed] = useState(0);
  const [restCount, setRestCount] = useState(0);
  const [momentum, setMomentum] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);

  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const momentumPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    setExIdx(0); setSetIdx(0); setElapsed(0); setMomentum(0);
    setTotalVolume(0); setCompletedSets(0); setPhase('active');
    setReps(parseInt(exercises[0]?.reps ?? '8'));
    setWeight(exercises[0]?.weight ?? 0);
  }, [visible]);

  useEffect(() => {
    if (!visible || phase === 'done') return;
    elapsedRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [visible, phase]);

  const pulseMomentum = () => {
    Animated.sequence([
      Animated.timing(momentumPulse, { toValue: 1.15, duration: 100, useNativeDriver: true }),
      Animated.timing(momentumPulse, { toValue: 1,   duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const startRest = (seconds: number) => {
    setPhase('resting');
    setRestCount(seconds);
    restRef.current = setInterval(() => {
      setRestCount(prev => {
        if (prev <= 1) {
          clearInterval(restRef.current!);
          goNextSet();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const skipRest = () => {
    if (restRef.current) clearInterval(restRef.current);
    goNextSet();
  };

  const goNextSet = () => {
    const ex = exercises[exIdx];
    const totalSets = ex.sets;
    const newSetIdx = setIdx + 1;

    if (newSetIdx >= totalSets) {
      // next exercise
      const newExIdx = exIdx + 1;
      if (newExIdx >= exercises.length) {
        setPhase('done');
        if (elapsedRef.current) clearInterval(elapsedRef.current);
      } else {
        setExIdx(newExIdx);
        setSetIdx(0);
        setReps(parseInt(exercises[newExIdx].reps));
        setWeight(exercises[newExIdx].weight);
        setPhase('active');
      }
    } else {
      setSetIdx(newSetIdx);
      setPhase('active');
    }
  };

  const completeSet = () => {
    const vol = reps * weight;
    const newVolume = totalVolume + vol;
    const newCompleted = completedSets + 1;
    const newMomentum = Math.min(100, momentum + Math.round(100 / (exercises.reduce((s, e) => s + e.sets, 0))));
    setTotalVolume(newVolume);
    setCompletedSets(newCompleted);
    setMomentum(newMomentum);
    pulseMomentum();
    startRest(exercises[exIdx].rest);
  };

  const finishWorkout = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (restRef.current) clearInterval(restRef.current);
    const totalPlanned = exercises.reduce((s, e) => s + e.sets, 0);
    const score = Math.round((completedSets / totalPlanned) * 70 + (momentum / 100) * 30);
    onComplete(Math.min(100, score), totalVolume, elapsed);
  };

  const ex = exercises[exIdx] ?? exercises[0];
  const totalSets = exercises.reduce((s, e) => s + e.sets, 0);
  const overallPct = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const momentumColor = momentum >= 70 ? '#22c55e' : momentum >= 40 ? '#eab308' : '#7c3aed';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#080b14' }}>
        <LinearGradient colors={['#120823', '#0d0f1a', '#080b14']} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>

          {/* ── Top bar ── */}
          <View style={am.topBar}>
            <TouchableOpacity onPress={onClose} style={am.endBtn}>
              <Ionicons name="close" size={18} color="#94a3b8" />
              <Text style={am.endBtnText}>End</Text>
            </TouchableOpacity>
            <View style={am.timerBox}>
              <Ionicons name="timer-outline" size={14} color="#a78bfa" />
              <Text style={am.timerText}>{fmtTime(elapsed)}</Text>
            </View>
            <View style={am.volBox}>
              <Text style={am.volText}>{(totalVolume / 1000).toFixed(2)}t</Text>
              <Text style={am.volLabel}>volume</Text>
            </View>
          </View>

          {/* ── Overall progress ── */}
          <View style={am.progressWrap}>
            <View style={am.progressTrack}>
              <LinearGradient colors={['#7c3aed', '#a78bfa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[am.progressFill, { width: `${overallPct}%` }]} />
            </View>
            <Text style={am.progressLabel}>{completedSets} / {totalSets} sets · Exercise {exIdx + 1}/{exercises.length}</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>

            {phase === 'done' ? (
              /* ── Completion Screen ── */
              <View style={am.doneCard}>
                <Text style={{ fontSize: 60 }}>🏆</Text>
                <Text style={am.doneTitle}>Workout Complete!</Text>
                <Text style={am.doneSub}>You crushed it in {fmtTime(elapsed)}</Text>
                <View style={am.doneStatsRow}>
                  {[
                    { label: 'Sets', value: completedSets },
                    { label: 'Volume', value: `${(totalVolume / 1000).toFixed(1)}t` },
                    { label: 'Momentum', value: `${momentum}%` },
                  ].map((s, i) => (
                    <View key={i} style={am.doneStat}>
                      <Text style={am.doneStatV}>{s.value}</Text>
                      <Text style={am.doneStatL}>{s.label}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity onPress={finishWorkout} activeOpacity={0.85} style={{ marginTop: 8 }}>
                  <LinearGradient colors={['#7c3aed', '#4f1d9a']} style={am.doneBtn}>
                    <Text style={am.doneBtnText}>Save Workout  +10 XP</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : phase === 'resting' ? (
              /* ── Rest Timer ── */
              <View style={am.restCard}>
                <Text style={am.restLabel}>REST</Text>
                <Text style={am.restCount}>{fmtTime(restCount)}</Text>
                <Text style={am.restNext}>Next: {ex.name} — Set {setIdx + 2}/{ex.sets}</Text>
                <View style={am.restTrack}>
                  <LinearGradient
                    colors={['#22c55e', '#15803d']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[am.restFill, { width: `${(restCount / (exercises[exIdx]?.rest ?? 60)) * 100}%` }]}
                  />
                </View>
                <TouchableOpacity onPress={skipRest} style={am.skipBtn} activeOpacity={0.8}>
                  <Text style={am.skipBtnText}>Skip Rest →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ── Active Set ── */
              <>
                {/* Exercise card */}
                <LinearGradient colors={[ex.color + '25', ex.color + '08', '#161b2e']} style={am.exCard}>
                  <View style={am.exHeader}>
                    <Text style={am.exEmoji}>{ex.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[am.exName, { color: ex.color }]}>{ex.name}</Text>
                      <Text style={am.exMuscles}>{ex.muscles.join(' · ')}</Text>
                    </View>
                    <View style={[am.setCircle, { borderColor: ex.color }]}>
                      <Text style={[am.setNum, { color: ex.color }]}>{setIdx + 1}</Text>
                      <Text style={am.setOf}>/{ex.sets}</Text>
                    </View>
                  </View>
                  {ex.prevBest && (
                    <View style={am.prevBest}>
                      <Ionicons name="trending-up-outline" size={13} color="#22c55e" />
                      <Text style={am.prevBestText}>Previous best: <Text style={{ color: '#22c55e', fontWeight: '700' }}>{ex.prevBest}</Text> — beat it!</Text>
                    </View>
                  )}
                </LinearGradient>

                {/* Reps + Weight steppers */}
                <View style={am.steppersRow}>
                  {[
                    { label: 'REPS', value: reps, set: setReps, step: 1, min: 1 },
                    { label: 'WEIGHT (kg)', value: weight, set: setWeight, step: 2.5, min: 0 },
                  ].map((s, i) => (
                    <View key={i} style={am.stepperCard}>
                      <Text style={am.stepperLabel}>{s.label}</Text>
                      <View style={am.stepperRow}>
                        <TouchableOpacity style={am.stepBtn} onPress={() => s.set(v => Math.max(s.min, parseFloat((v - s.step).toFixed(1))))}>
                          <Ionicons name="remove" size={22} color="#fff" />
                        </TouchableOpacity>
                        <Text style={am.stepValue}>{s.value}</Text>
                        <TouchableOpacity style={am.stepBtn} onPress={() => s.set(v => parseFloat((v + s.step).toFixed(1)))}>
                          <Ionicons name="add" size={22} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Momentum bar */}
                <View style={am.momentumWrap}>
                  <View style={am.momentumHeader}>
                    <Animated.View style={{ transform: [{ scale: momentumPulse }] }}>
                      <Ionicons name="flash" size={15} color={momentumColor} />
                    </Animated.View>
                    <Text style={[am.momentumLabel, { color: momentumColor }]}>MOMENTUM</Text>
                    <Text style={[am.momentumVal, { color: momentumColor }]}>{momentum}/100</Text>
                  </View>
                  <View style={am.momentumTrack}>
                    <LinearGradient
                      colors={[momentumColor + 'cc', momentumColor]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[am.momentumFill, { width: `${momentum}%` }]}
                    />
                  </View>
                  <Text style={am.momentumHint}>
                    {momentum >= 70 ? '🔥 You\'re on fire! Keep pushing!' : momentum >= 40 ? '⚡ Building momentum — stay focused!' : '💪 Start building your momentum!'}
                  </Text>
                </View>

                {/* Complete Set CTA */}
                <TouchableOpacity onPress={completeSet} activeOpacity={0.85}>
                  <LinearGradient colors={['#7c3aed', '#4f1d9a']} style={am.completeBtn}>
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text style={am.completeBtnText}>Complete Set {setIdx + 1}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Exercise list mini */}
                <View style={am.exerciseMini}>
                  {exercises.map((e, i) => (
                    <View key={i} style={[am.miniRow, i === exIdx && am.miniRowActive]}>
                      {i === exIdx && <LinearGradient colors={[e.color + '20', 'transparent']} style={[StyleSheet.absoluteFill, { borderRadius: 10 }]} />}
                      <Text style={am.miniEmoji}>{e.emoji}</Text>
                      <Text style={[am.miniName, i === exIdx && { color: e.color }]}>{e.name}</Text>
                      <Text style={am.miniSets}>{e.sets}×{e.reps}</Text>
                      {i < exIdx && <Ionicons name="checkmark-circle" size={16} color="#22c55e" />}
                      {i === exIdx && <View style={[am.miniDot, { backgroundColor: e.color }]} />}
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════

const TABS = ['Today', 'Build', 'Records', 'History'];
const TYPE_COLORS: Record<string, string> = {
  Strength: '#7c3aed', Cardio: '#22c55e', HIIT: '#ef4444', Recovery: '#3b82f6',
};

export default function StreakScreen() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState(0);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);
  const [activeWorkout, setActiveWorkout] = useState(false);
  const [lastScore, setLastScore] = useState<{ score: number; volume: number; duration: number } | null>(null);
  const prScale = useRef(new Animated.Value(1)).current;

  useEffect(() => { fetchWorkouts(); }, []);

  const fetchWorkouts = async () => {
    try {
      const res = await api.get('/workouts');
      setWorkouts(res.data.data || []);
    } catch {}
  };

  const handleQuickLog = async (ex: typeof QUICK_LOG[0]) => {
    setQuickLoading(ex.name);
    try {
      const res = await api.post('/workouts', { exercise: ex.name, duration: ex.duration, calories: ex.cal, completed: true });
      setWorkouts([res.data.data, ...workouts]);
      if (user) {
        const xp = (user.xp || 0) + 10;
        const streak = (user.streak || 0) + 1;
        updateUser({ xp, streak });
        await api.put('/users/profile', { xp, streak });
      }
      Alert.alert('Logged! 💪', `${ex.name} · +10 XP`);
    } catch { Alert.alert('Error', 'Failed to log workout.'); }
    finally { setQuickLoading(null); }
  };

  const handleWorkoutComplete = (score: number, volume: number, duration: number) => {
    setActiveWorkout(false);
    setLastScore({ score, volume, duration });
    Animated.sequence([
      Animated.timing(prScale, { toValue: 1.1, duration: 200, useNativeDriver: true }),
      Animated.timing(prScale, { toValue: 1,   duration: 300, useNativeDriver: true }),
    ]).start();
    if (user) {
      const xp = (user.xp || 0) + score;
      updateUser({ xp });
    }
    Alert.alert(`Workout Score: ${score}/100 🏆`, `You lifted ${(volume / 1000).toFixed(1)} tonnes in ${fmtTime(duration)}! +${score} XP earned.`);
  };

  const today = new Date().toDateString();
  const todayW = workouts.filter(w => new Date(w.timestamp).toDateString() === today);
  const todayMins = todayW.reduce((s, w) => s + w.duration, 0);
  const todayCals = todayW.reduce((s, w) => s + (w.calories || 0), 0);

  const maxVol = Math.max(...WEEK_VOLUMES.map(v => v.v), 1);

  return (
    <View style={s.root}>
      <LinearGradient colors={['#120823', '#0d0f1a', '#080b14']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Workout Intelligence</Text>
            <Text style={s.subtitle}>AI-powered training system</Text>
          </View>
          <LinearGradient colors={['#f9731625', '#f9731608']} style={s.streakPill}>
            <Text style={{ fontSize: 16 }}>🔥</Text>
            <Text style={s.streakText}>{user?.streak || 0} day streak</Text>
          </LinearGradient>
        </View>

        {/* Tabs */}
        <View style={[s.tabRow, { flexDirection: 'row', paddingHorizontal: 12 }]}>
          {TABS.map((t, i) => (
            <TouchableOpacity key={i} onPress={() => setTab(i)} activeOpacity={0.8} style={[s.tabPill, { flex: 1 }, tab === i && s.tabPillActive]}>
              {tab === i && (
                <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}>
                  <LinearGradient colors={['#7c3aed', '#4f1d9a']} style={{ flex: 1 }} />
                </View>
              )}
              <Text style={[s.tabText, tab === i && s.tabTextActive]} numberOfLines={1}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>

          {/* ══════════════════════════════════════
              TAB 0 — TODAY
          ══════════════════════════════════════ */}
          {tab === 0 && (
            <>
              {/* Today's session score if just finished */}
              {lastScore && (
                <Animated.View style={{ transform: [{ scale: prScale }] }}>
                  <LinearGradient colors={['#eab30820', '#eab30805']} style={s.lastScoreCard}>
                    <Ionicons name="trophy" size={22} color="#eab308" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.lastScoreTitle}>Last Workout Score</Text>
                      <Text style={s.lastScoreBody}>{(lastScore.volume / 1000).toFixed(1)}t lifted · {fmtTime(lastScore.duration)}</Text>
                    </View>
                    <Text style={s.lastScoreNum}>{lastScore.score}</Text>
                  </LinearGradient>
                </Animated.View>
              )}

              {/* AI Mission Card */}
              <LinearGradient colors={['#2a0a4a', '#1a0533', '#0d0f1a']} style={s.missionCard}>
                <View style={s.glowOrb} />
                <View style={s.missionHeader}>
                  <View style={s.aiBadge}>
                    <Ionicons name="sparkles" size={11} color="#a78bfa" />
                    <Text style={s.aiBadgeText}>AI MISSION · TODAY</Text>
                  </View>
                  <View style={s.readinessBadge}>
                    <Text style={s.readinessText}>Readiness: <Text style={{ color: '#22c55e', fontWeight: '800' }}>{AI_WORKOUT.readiness}%</Text></Text>
                  </View>
                </View>
                <Text style={s.missionName}>{AI_WORKOUT.name}</Text>
                <View style={s.missionMeta}>
                  <View style={s.missionMetaPill}><Ionicons name="time-outline" size={12} color="#7c3aed" /><Text style={s.missionMetaText}>{AI_WORKOUT.duration} min</Text></View>
                  <View style={s.missionMetaPill}><Ionicons name="flame-outline" size={12} color="#f97316" /><Text style={s.missionMetaText}>{AI_WORKOUT.calories} cal</Text></View>
                  <View style={s.missionMetaPill}><Ionicons name="barbell-outline" size={12} color="#22c55e" /><Text style={s.missionMetaText}>{AI_WORKOUT.exercises.length} exercises</Text></View>
                </View>
                {/* Exercise preview */}
                {AI_WORKOUT.exercises.slice(0, 4).map((ex, i) => (
                  <View key={i} style={s.exPreviewRow}>
                    <Text style={s.exPreviewEmoji}>{ex.emoji}</Text>
                    <Text style={s.exPreviewName}>{ex.name}</Text>
                    <Text style={s.exPreviewSets}>{ex.sets} × {ex.reps}</Text>
                    <Text style={[s.exPreviewWeight, { color: ex.color }]}>{ex.weight}kg</Text>
                  </View>
                ))}
                {AI_WORKOUT.exercises.length > 4 && (
                  <Text style={s.moreEx}>+{AI_WORKOUT.exercises.length - 4} more exercises</Text>
                )}
                <TouchableOpacity onPress={() => setActiveWorkout(true)} activeOpacity={0.85} style={{ marginTop: 16 }}>
                  <LinearGradient colors={['#7c3aed', '#4f1d9a']} style={s.startBtn}>
                    <Ionicons name="flash" size={20} color="#fff" />
                    <Text style={s.startBtnText}>Start Guided Workout</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>

              {/* Power DNA */}
              <LinearGradient colors={[POWER_DNA.color + '20', POWER_DNA.color + '05', '#161b2e']} style={s.dnaCard}>
                <View style={s.dnaHeader}>
                  <View style={[s.dnaIcon, { backgroundColor: POWER_DNA.color + '25' }]}>
                    <Text style={{ fontSize: 24 }}>{POWER_DNA.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.dnaLabel}>POWER DNA</Text>
                    <Text style={[s.dnaArchetype, { color: POWER_DNA.color }]}>{POWER_DNA.archetype}</Text>
                  </View>
                </View>
                <Text style={s.dnaDesc}>{POWER_DNA.desc}</Text>
                <View style={s.attrGrid}>
                  {POWER_DNA.attrs.map((a, i) => (
                    <View key={i} style={{ width: '47%' }}>
                      <View style={s.attrRow}>
                        <Text style={s.attrLabel}>{a.label}</Text>
                        <Text style={[s.attrVal, { color: a.color }]}>{a.value}%</Text>
                      </View>
                      <View style={s.attrTrack}>
                        <LinearGradient colors={[a.color, a.color + '80']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.attrFill, { width: `${a.value}%` }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </LinearGradient>

              {/* Muscle Recovery Map */}
              <View style={s.sectionHeader}>
                <Ionicons name="body-outline" size={14} color="#f97316" />
                <Text style={s.sectionTitle}>Muscle Recovery Map</Text>
              </View>
              <View style={s.muscleGrid}>
                {MUSCLES.map((m, i) => {
                  const cfg = MUSCLE_STATUS[m.status as keyof typeof MUSCLE_STATUS];
                  return (
                    <LinearGradient key={i} colors={[cfg.color + '18', cfg.color + '05']} style={s.muscleCard}>
                      <View style={[s.muscleDot, { backgroundColor: cfg.dot }]} />
                      <Text style={s.muscleName}>{m.name}</Text>
                      <Text style={[s.muscleStatus, { color: cfg.color }]}>{cfg.label}</Text>
                      <Text style={s.muscleDate}>{m.days}</Text>
                    </LinearGradient>
                  );
                })}
              </View>
              <View style={s.muscleLegend}>
                {Object.entries(MUSCLE_STATUS).map(([k, v]) => (
                  <View key={k} style={s.muscleLegendItem}>
                    <View style={[s.muscleLegendDot, { backgroundColor: v.dot }]} />
                    <Text style={s.muscleLegendText}>{v.label}</Text>
                  </View>
                ))}
              </View>

              {/* Today Summary */}
              <View style={s.sectionHeader}>
                <Ionicons name="stats-chart-outline" size={14} color="#22c55e" />
                <Text style={s.sectionTitle}>Today's Progress</Text>
              </View>
              <LinearGradient colors={['#1e0545', '#0d0f1a']} style={s.summaryCard}>
                <View style={s.glowOrb} />
                <View style={s.summaryRow}>
                  {[
                    { v: todayW.length, l: 'Sessions',  color: '#7c3aed', icon: 'barbell' },
                    { v: todayMins,     l: 'Minutes',   color: '#22c55e', icon: 'time'    },
                    { v: todayCals,     l: 'Calories',  color: '#f97316', icon: 'flame'   },
                  ].map(st => (
                    <View key={st.l} style={s.summaryStat}>
                      <Ionicons name={st.icon as any} size={18} color={st.color} />
                      <Text style={[s.summaryVal, { color: st.color }]}>{st.v}</Text>
                      <Text style={s.summaryLabel}>{st.l}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </>
          )}

          {/* ══════════════════════════════════════
              TAB 1 — BUILD
          ══════════════════════════════════════ */}
          {tab === 1 && (
            <>
              {/* Quick Log */}
              <View style={s.sectionHeader}>
                <Ionicons name="flash-outline" size={14} color="#7c3aed" />
                <Text style={s.sectionTitle}>Quick Log</Text>
              </View>
              <View style={s.quickGrid}>
                {QUICK_LOG.map((ex, i) => {
                  const busy = quickLoading === ex.name;
                  return (
                    <TouchableOpacity
                      key={i} style={{ width: '47%' }}
                      onPress={() => handleQuickLog(ex)}
                      disabled={quickLoading !== null}
                      activeOpacity={0.75}
                    >
                      <LinearGradient
                        colors={busy ? ['#2d3561', '#1e2a4a'] : ex.bg}
                        style={[s.quickCard, quickLoading !== null && !busy && { opacity: 0.4 }]}
                      >
                        <View style={[s.quickCardInner, { borderColor: ex.color + '60' }]}>
                          <Text style={s.quickEmoji}>{ex.emoji}</Text>
                          <Text style={s.quickName}>{ex.name}</Text>
                          <Text style={[s.quickMeta, { color: ex.color }]}>{ex.duration} min · {ex.cal} cal</Text>
                          {busy && (
                            <View style={s.logOverlay}>
                              <Text style={s.logOverlayText}>Logging…</Text>
                            </View>
                          )}
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Weekly Volume Chart */}
              <View style={[s.sectionHeader, { marginTop: 24 }]}>
                <Ionicons name="bar-chart-outline" size={14} color="#3b82f6" />
                <Text style={s.sectionTitle}>Weekly Volume Load</Text>
              </View>
              <View style={s.miniCard}>
                <View style={s.volChart}>
                  {WEEK_VOLUMES.map((d, i) => {
                    const h = d.v > 0 ? (d.v / maxVol) * 72 : 4;
                    const isToday = i === WEEK_VOLUMES.length - 1;
                    return (
                      <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                        {isToday && <Text style={{ fontSize: 8, color: '#7c3aed', fontWeight: '800', marginBottom: 2 }}>NOW</Text>}
                        <LinearGradient
                          colors={d.v === 0 ? ['#2d356140', '#2d356120'] : isToday ? ['#7c3aed', '#4f1d9a'] : ['#7c3aed80', '#7c3aed40']}
                          style={{ width: '80%', height: Math.max(h, 4), borderRadius: 4 }}
                          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                        />
                        <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 4 }}>{d.day}</Text>
                        {d.v > 0 && <Text style={{ fontSize: 8, color: '#a78bfa', fontWeight: '700' }}>{d.v}t</Text>}
                      </View>
                    );
                  })}
                </View>
                <Text style={s.chartSub}>Total this week: <Text style={{ color: '#7c3aed', fontWeight: '700' }}>{WEEK_VOLUMES.reduce((s, v) => s + v.v, 0).toFixed(1)} tonnes</Text></Text>
              </View>

              {/* Workout Programs */}
              <View style={[s.sectionHeader, { marginTop: 24 }]}>
                <Ionicons name="calendar-outline" size={14} color="#eab308" />
                <Text style={s.sectionTitle}>Workout Programs</Text>
              </View>
              {PROGRAMS.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => Alert.alert(`Start ${p.name}?`, `${p.desc}\n\n${p.weeks} weeks · ${p.days} days/week · ${p.level}`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Start Program 🚀', onPress: () => Alert.alert('Program Started!', `You've started ${p.name}. Your first session is scheduled for tomorrow.`) },
                  ])}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={[p.color + '20', p.color + '06', '#161b2e']} style={s.programCard}>
                    <Text style={s.programEmoji}>{p.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.programName, { color: p.color }]}>{p.name}</Text>
                      <Text style={s.programDesc} numberOfLines={2}>{p.desc}</Text>
                      <View style={s.programMeta}>
                        <Text style={s.programMetaText}>{p.weeks}wk · {p.days}d/wk · {p.level}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={p.color} />
                  </LinearGradient>
                </TouchableOpacity>
              ))}

              {/* Progressive Overload Advisor */}
              <View style={[s.sectionHeader, { marginTop: 24 }]}>
                <Ionicons name="trending-up-outline" size={14} color="#22c55e" />
                <Text style={s.sectionTitle}>Progressive Overload Advisor</Text>
              </View>
              <View style={s.miniCard}>
                {[
                  { ex: 'Bench Press',  curr: 90,  rec: 92.5, ready: true  },
                  { ex: 'Squat',        curr: 140, rec: 142.5,ready: true  },
                  { ex: 'Deadlift',     curr: 165, rec: 167.5,ready: false },
                  { ex: 'OHP',          curr: 72.5,rec: 75,   ready: true  },
                ].map((r, i) => (
                  <View key={i} style={[s.overloadRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#2d356120', paddingTop: 12, marginTop: 12 }]}>
                    <Text style={s.overloadEx}>{r.ex}</Text>
                    <Text style={s.overloadCurr}>{r.curr}kg</Text>
                    <Ionicons name="arrow-forward" size={14} color="#6b7280" />
                    <Text style={[s.overloadRec, { color: r.ready ? '#22c55e' : '#6b7280' }]}>{r.rec}kg</Text>
                    <View style={[s.overloadBadge, { backgroundColor: r.ready ? '#22c55e20' : '#6b728020', borderColor: r.ready ? '#22c55e40' : '#6b728040' }]}>
                      <Text style={[s.overloadBadgeText, { color: r.ready ? '#22c55e' : '#6b7280' }]}>{r.ready ? 'Ready ✓' : 'Not yet'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ══════════════════════════════════════
              TAB 2 — RECORDS
          ══════════════════════════════════════ */}
          {tab === 2 && (
            <>
              <LinearGradient colors={['#3d280020', '#161b2e']} style={s.prHero}>
                <Ionicons name="trophy" size={36} color="#ffd700" />
                <View>
                  <Text style={s.prHeroTitle}>{PRS.length} Personal Records</Text>
                  <Text style={s.prHeroSub}>{PRS.filter(p => p.isNew).length} new PR{PRS.filter(p => p.isNew).length !== 1 ? 's' : ''} this week</Text>
                </View>
              </LinearGradient>

              <View style={s.sectionHeader}>
                <Ionicons name="medal-outline" size={14} color="#ffd700" />
                <Text style={s.sectionTitle}>All-Time Personal Records</Text>
              </View>
              {PRS.map((pr, i) => (
                <View key={i} style={s.prRow}>
                  {pr.isNew && <LinearGradient colors={['#ffd70015', 'transparent']} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />}
                  <Text style={s.prEmoji}>{pr.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={s.prNameRow}>
                      <Text style={s.prName}>{pr.name}</Text>
                      {pr.isNew && (
                        <LinearGradient colors={['#ffd700', '#b45309']} style={s.prNewBadge}>
                          <Text style={s.prNewBadgeText}>NEW PR 🔥</Text>
                        </LinearGradient>
                      )}
                    </View>
                    <Text style={s.prDate}>{pr.date}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.prValue, { color: pr.isNew ? '#ffd700' : '#f1f5f9' }]}>{pr.value}</Text>
                    <Text style={s.prReps}>{pr.reps}</Text>
                  </View>
                </View>
              ))}

              {/* Workout Score History */}
              <View style={[s.sectionHeader, { marginTop: 24 }]}>
                <Ionicons name="star-outline" size={14} color="#eab308" />
                <Text style={s.sectionTitle}>Workout Score History</Text>
              </View>
              <View style={s.miniCard}>
                {HISTORY.slice(0, 5).map((h, i) => (
                  <View key={i} style={[s.scoreHistRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#2d356120', paddingTop: 10, marginTop: 10 }]}>
                    <Text style={s.scoreHistEmoji}>{h.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.scoreHistName}>{h.name}</Text>
                      <Text style={s.scoreHistDate}>{h.label}</Text>
                    </View>
                    <View style={s.scoreHistBar}>
                      <View style={s.scoreHistTrack}>
                        <LinearGradient
                          colors={h.score >= 90 ? ['#22c55e', '#15803d'] : h.score >= 75 ? ['#eab308', '#92400e'] : ['#7c3aed', '#4f1d9a']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={[s.scoreHistFill, { width: `${h.score}%` }]}
                        />
                      </View>
                    </View>
                    <Text style={[s.scoreHistVal, { color: h.score >= 90 ? '#22c55e' : h.score >= 75 ? '#eab308' : '#a78bfa' }]}>{h.score}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ══════════════════════════════════════
              TAB 3 — HISTORY
          ══════════════════════════════════════ */}
          {tab === 3 && (
            <>
              {/* Streak calendar */}
              <LinearGradient colors={['#1e0545', '#0d0f1a']} style={s.calCard}>
                <View style={s.glowOrb} />
                <Text style={s.calTitle}>🔥 {user?.streak || 0}-Day Streak</Text>
                <View style={s.calDots}>
                  {Array.from({ length: 14 }).map((_, i) => {
                    const worked = i !== 1 && i !== 5 && i !== 8;
                    return (
                      <View key={i} style={[s.calDot, { backgroundColor: worked ? '#7c3aed' : '#2d3561', opacity: i > 6 ? 1 : 0.5 }]} />
                    );
                  })}
                </View>
                <Text style={s.calSub}>Last 14 days · Keep it going!</Text>
              </LinearGradient>

              <View style={s.sectionHeader}>
                <Ionicons name="time-outline" size={14} color="#94a3b8" />
                <Text style={s.sectionTitle}>Workout Timeline</Text>
              </View>
              {HISTORY.map((h, i) => {
                const typeColor = TYPE_COLORS[h.type] || '#6b7280';
                return (
                  <View key={i} style={s.histItem}>
                    {/* Timeline line */}
                    {i < HISTORY.length - 1 && <View style={s.histLine} />}
                    <View style={[s.histDot, { backgroundColor: typeColor }]} />
                    <View style={s.histContent}>
                      <LinearGradient colors={[typeColor + '15', '#161b2e']} style={s.histCard}>
                        <View style={s.histCardHeader}>
                          <Text style={s.histEmoji}>{h.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={s.histName}>{h.name}</Text>
                            <Text style={s.histDate}>{h.label}</Text>
                          </View>
                          <View style={[s.histTypePill, { borderColor: typeColor + '50', backgroundColor: typeColor + '15' }]}>
                            <Text style={[s.histTypeText, { color: typeColor }]}>{h.type}</Text>
                          </View>
                        </View>
                        <View style={s.histStats}>
                          {[
                            { icon: 'time-outline',   color: '#94a3b8', v: `${h.duration}m` },
                            { icon: 'flame-outline',  color: '#f97316', v: `${h.cal} cal` },
                            { icon: 'barbell-outline',color: '#7c3aed', v: h.vol },
                            { icon: 'star-outline',   color: '#eab308', v: `${h.score}/100` },
                          ].map((st, j) => (
                            <View key={j} style={s.histStat}>
                              <Ionicons name={st.icon as any} size={12} color={st.color} />
                              <Text style={[s.histStatText, { color: st.color }]}>{st.v}</Text>
                            </View>
                          ))}
                        </View>
                      </LinearGradient>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <ActiveWorkoutModal
        visible={activeWorkout}
        onClose={() => setActiveWorkout(false)}
        onComplete={handleWorkoutComplete}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES — Main Screen
// ═══════════════════════════════════════════════════════════

const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#f9731630' },
  streakText: { color: '#f97316', fontWeight: '700', fontSize: 13 },

  tabRow: { marginBottom: 8, gap: 6 },
  tabPill: { paddingHorizontal: 4, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: '#2d356150', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tabPillActive: { borderColor: '#7c3aed' },
  tabText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#e2e8f0' },

  glowOrb: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#7c3aed', opacity: 0.08, top: -60, right: -40 },

  // Today
  lastScoreCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#eab30840' },
  lastScoreTitle: { fontSize: 13, fontWeight: '700', color: '#eab308' },
  lastScoreBody: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  lastScoreNum: { fontSize: 28, fontWeight: '900', color: '#eab308' },

  missionCard: { borderRadius: 22, padding: 20, marginBottom: 4, borderWidth: 1, borderColor: '#3b1e6b60', overflow: 'hidden' },
  missionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7c3aed20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#7c3aed40' },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: '#a78bfa', letterSpacing: 0.5 },
  readinessBadge: { backgroundColor: '#22c55e10', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#22c55e30' },
  readinessText: { fontSize: 11, color: '#94a3b8' },
  missionName: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 10 },
  missionMeta: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  missionMetaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffffff08', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  missionMetaText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  exPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#ffffff08' },
  exPreviewEmoji: { fontSize: 16, width: 24, textAlign: 'center' },
  exPreviewName: { flex: 1, fontSize: 13, color: '#e2e8f0', fontWeight: '600' },
  exPreviewSets: { fontSize: 12, color: '#6b7280' },
  exPreviewWeight: { fontSize: 12, fontWeight: '800', width: 44, textAlign: 'right' },
  moreEx: { fontSize: 12, color: '#6b7280', marginTop: 8, textAlign: 'center' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, padding: 16 },
  startBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  dnaCard: { borderRadius: 20, padding: 18, marginBottom: 4, borderWidth: 1, borderColor: '#2d356150' },
  dnaHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  dnaIcon: { width: 52, height: 52, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  dnaLabel: { fontSize: 10, fontWeight: '800', color: '#6b7280', letterSpacing: 1.5 },
  dnaArchetype: { fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  dnaDesc: { fontSize: 13, color: '#94a3b8', lineHeight: 19, marginBottom: 14 },
  attrGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  attrRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  attrLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  attrVal: { fontSize: 11, fontWeight: '800' },
  attrTrack: { height: 5, backgroundColor: '#2d3561', borderRadius: 3, overflow: 'hidden' },
  attrFill: { height: '100%', borderRadius: 3 },

  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muscleCard: { width: (SW - 48) / 2, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#2d356140' },
  muscleDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  muscleName: { fontSize: 13, fontWeight: '700', color: '#f1f5f9', marginBottom: 2 },
  muscleStatus: { fontSize: 11, fontWeight: '700' },
  muscleDate: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  muscleLegend: { flexDirection: 'row', gap: 16, marginTop: 10, justifyContent: 'center' },
  muscleLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  muscleLegendDot: { width: 8, height: 8, borderRadius: 4 },
  muscleLegendText: { fontSize: 11, color: '#6b7280', fontWeight: '500' },

  summaryCard: { borderRadius: 20, padding: 20, marginBottom: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#3b1e6b50' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryStat: { alignItems: 'center', gap: 4 },
  summaryVal: { fontSize: 32, fontWeight: '900' },
  summaryLabel: { fontSize: 11, color: '#94a3b8' },

  // Build
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickCard: { borderRadius: 16, overflow: 'hidden' },
  quickCardInner: { padding: 16, alignItems: 'center', borderWidth: 1, borderRadius: 16 },
  quickEmoji: { fontSize: 32, marginBottom: 6 },
  quickName: { fontSize: 12, fontWeight: '700', color: '#fff', marginBottom: 3, textAlign: 'center' },
  quickMeta: { fontSize: 10, fontWeight: '600' },
  logOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000070', justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  logOverlayText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  miniCard: { backgroundColor: '#161b2e', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2d356150' },
  volChart: { flexDirection: 'row', alignItems: 'flex-end', height: 96, gap: 4, marginBottom: 10 },
  chartSub: { fontSize: 12, color: '#6b7280', marginTop: 4 },

  programCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#2d356140' },
  programEmoji: { fontSize: 28 },
  programName: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  programDesc: { fontSize: 12, color: '#94a3b8', lineHeight: 17 },
  programMeta: { marginTop: 6 },
  programMetaText: { fontSize: 11, color: '#6b7280', fontWeight: '500' },

  overloadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overloadEx: { flex: 1, fontSize: 13, fontWeight: '700', color: '#f1f5f9' },
  overloadCurr: { fontSize: 13, color: '#6b7280' },
  overloadRec: { fontSize: 13, fontWeight: '800' },
  overloadBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  overloadBadgeText: { fontSize: 11, fontWeight: '700' },

  // Records
  prHero: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 20, padding: 20, marginBottom: 4, borderWidth: 1, borderColor: '#ffd70030' },
  prHeroTitle: { fontSize: 18, fontWeight: '800', color: '#ffd700' },
  prHeroSub: { fontSize: 13, color: '#94a3b8', marginTop: 3 },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#161b2e', borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#2d356150', overflow: 'hidden' },
  prEmoji: { fontSize: 24 },
  prNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  prName: { fontSize: 14, fontWeight: '700', color: '#f1f5f9' },
  prNewBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  prNewBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  prDate: { fontSize: 11, color: '#6b7280', marginTop: 3 },
  prValue: { fontSize: 17, fontWeight: '900' },
  prReps: { fontSize: 11, color: '#6b7280', marginTop: 2 },

  scoreHistRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreHistEmoji: { fontSize: 20 },
  scoreHistName: { fontSize: 13, fontWeight: '700', color: '#f1f5f9' },
  scoreHistDate: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  scoreHistBar: { flex: 1 },
  scoreHistTrack: { height: 5, backgroundColor: '#2d3561', borderRadius: 3, overflow: 'hidden' },
  scoreHistFill: { height: '100%', borderRadius: 3 },
  scoreHistVal: { fontSize: 14, fontWeight: '800', width: 30, textAlign: 'right' },

  // History
  calCard: { borderRadius: 20, padding: 20, marginBottom: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#7c3aed40' },
  calTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 14 },
  calDots: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  calDot: { width: 16, height: 16, borderRadius: 8 },
  calSub: { fontSize: 12, color: '#6b7280' },

  histItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  histLine: { position: 'absolute', left: 7, top: 20, width: 2, bottom: -4, backgroundColor: '#2d3561' },
  histDot: { width: 16, height: 16, borderRadius: 8, marginTop: 18, marginRight: 12, zIndex: 1, flexShrink: 0 },
  histContent: { flex: 1, paddingBottom: 8 },
  histCard: { borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#2d356140' },
  histCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  histEmoji: { fontSize: 22 },
  histName: { fontSize: 14, fontWeight: '700', color: '#f1f5f9' },
  histDate: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  histTypePill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  histTypeText: { fontSize: 10, fontWeight: '700' },
  histStats: { flexDirection: 'row', gap: 14 },
  histStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  histStatText: { fontSize: 11, fontWeight: '600' },
});

// ═══════════════════════════════════════════════════════════
// STYLES — Active Workout Modal
// ═══════════════════════════════════════════════════════════

const am = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2d356130' },
  endBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef444420', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#ef444440' },
  endBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
  timerBox: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timerText: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  volBox: { alignItems: 'flex-end' },
  volText: { fontSize: 16, fontWeight: '800', color: '#7c3aed' },
  volLabel: { fontSize: 10, color: '#6b7280' },

  progressWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  progressTrack: { height: 5, backgroundColor: '#2d3561', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 11, color: '#6b7280' },

  exCard: { borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#2d356150' },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  exEmoji: { fontSize: 32 },
  exName: { fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
  exMuscles: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  setCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  setNum: { fontSize: 20, fontWeight: '900', lineHeight: 24 },
  setOf: { fontSize: 11, color: '#6b7280', lineHeight: 13 },
  prevBest: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#22c55e10', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#22c55e25' },
  prevBestText: { flex: 1, fontSize: 12, color: '#94a3b8' },

  steppersRow: { flexDirection: 'row', gap: 12 },
  stepperCard: { flex: 1, backgroundColor: '#161b2e', borderRadius: 18, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2d356150' },
  stepperLabel: { fontSize: 10, fontWeight: '800', color: '#6b7280', letterSpacing: 1, marginBottom: 12 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#2d3561', justifyContent: 'center', alignItems: 'center' },
  stepValue: { fontSize: 28, fontWeight: '900', color: '#fff', minWidth: 56, textAlign: 'center' },

  momentumWrap: { backgroundColor: '#161b2e', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2d356150' },
  momentumHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  momentumLabel: { flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  momentumVal: { fontSize: 14, fontWeight: '900' },
  momentumTrack: { height: 8, backgroundColor: '#2d3561', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  momentumFill: { height: '100%', borderRadius: 4 },
  momentumHint: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },

  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 18, paddingVertical: 18 },
  completeBtnText: { fontSize: 17, fontWeight: '900', color: '#fff' },

  exerciseMini: { backgroundColor: '#161b2e', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#2d356150' },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, overflow: 'hidden' },
  miniRowActive: { backgroundColor: '#00000020' },
  miniEmoji: { fontSize: 18, width: 26, textAlign: 'center' },
  miniName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  miniSets: { fontSize: 11, color: '#6b7280' },
  miniDot: { width: 8, height: 8, borderRadius: 4 },

  restCard: { backgroundColor: '#052e16', borderRadius: 24, padding: 32, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#22c55e40' },
  restLabel: { fontSize: 13, fontWeight: '800', color: '#22c55e', letterSpacing: 2 },
  restCount: { fontSize: 72, fontWeight: '900', color: '#fff', lineHeight: 80 },
  restNext: { fontSize: 13, color: '#94a3b8' },
  restTrack: { width: '100%', height: 6, backgroundColor: '#2d3561', borderRadius: 3, overflow: 'hidden' },
  restFill: { height: '100%', borderRadius: 3 },
  skipBtn: { backgroundColor: '#2d3561', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  skipBtnText: { color: '#a78bfa', fontWeight: '700', fontSize: 14 },

  doneCard: { backgroundColor: '#161b2e', borderRadius: 24, padding: 32, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#eab30840' },
  doneTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginTop: 8 },
  doneSub: { fontSize: 14, color: '#94a3b8' },
  doneStatsRow: { flexDirection: 'row', gap: 24, marginVertical: 12 },
  doneStat: { alignItems: 'center' },
  doneStatV: { fontSize: 24, fontWeight: '900', color: '#7c3aed' },
  doneStatL: { fontSize: 11, color: '#6b7280', marginTop: 3 },
  doneBtn: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 36 },
  doneBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
