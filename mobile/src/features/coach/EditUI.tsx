import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import type { RoutineExercise } from '../train/trainLogic';
import { ALL_MUSCLES, MUSCLE_LABEL, type LibExercise, type Muscle } from './exerciseLibrary';
import { alternativesFor, searchLibrary, step, type Field } from './planEdit';
import type { Ctx } from './planGenerator';

const FIELD: { f: Field; label: string; show: (e: RoutineExercise) => string }[] = [
  { f: 'sets', label: 'Sets', show: (e) => String(e.sets) },
  { f: 'reps', label: 'Reps', show: (e) => (e.unit === 'sec' ? `${e.reps}s` : String(e.reps)) },
  { f: 'restSec', label: 'Rest', show: (e) => `${e.restSec}s` },
];

/** Change one exercise: sets, reps and rest with + and −, swap it, move it, or remove it. */
export function ExerciseEditor({ ex, onChange, onSwap, onRemove, onMove }: {
  ex: RoutineExercise; onChange: (e: RoutineExercise) => void; onSwap?: () => void; onRemove: () => void; onMove?: (dir: 1 | -1) => void;
}) {
  return (
    <View style={s.editor}>
      <View style={s.steppers}>
        {FIELD.map(({ f, label, show }) => (
          <View key={f} style={s.stepper}>
            <Text style={s.stepLabel}>{label}</Text>
            <View style={s.stepRow}>
              <TouchableOpacity onPress={() => onChange(step(ex, f, -1))} style={s.stepBtn} hitSlop={6} accessibilityLabel={`Less ${label}`}><Ionicons name="remove" size={18} color={colors.ink} /></TouchableOpacity>
              <Text style={s.stepVal}>{show(ex)}</Text>
              <TouchableOpacity onPress={() => onChange(step(ex, f, 1))} style={s.stepBtn} hitSlop={6} accessibilityLabel={`More ${label}`}><Ionicons name="add" size={18} color={colors.ink} /></TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
      <View style={s.tools}>
        {onSwap ? <Tool icon="swap-horizontal" label="Swap" onPress={onSwap} /> : null}
        {onMove ? <><Tool icon="arrow-up" label="Up" onPress={() => onMove(-1)} /><Tool icon="arrow-down" label="Down" onPress={() => onMove(1)} /></> : null}
        <Tool icon="trash-outline" label="Remove" danger onPress={onRemove} />
      </View>
    </View>
  );
}

const Tool = ({ icon, label, onPress, danger }: { icon: string; label: string; onPress: () => void; danger?: boolean }) => (
  <TouchableOpacity onPress={onPress} style={s.tool} accessibilityRole="button" accessibilityLabel={label}>
    <Ionicons name={icon as any} size={16} color={danger ? '#ff6b7a' : colors.brandBright} /><Text style={[s.toolText, danger && { color: '#ff6b7a' }]}>{label}</Text>
  </TouchableOpacity>
);

/**
 * Pick an exercise from the library: to swap for the one you have (similar ones first) or to add.
 * Only exercises your equipment, level and injuries allow are listed.
 */
export function LibrarySheet({ mode, current, ctx, exclude, onPick, onClose }: {
  mode: 'swap' | 'add' | null; current?: RoutineExercise; ctx: Ctx; exclude: string[]; onPick: (e: LibExercise) => void; onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<Muscle | 'all'>('all');
  const similar = useMemo(() => (mode === 'swap' && current ? alternativesFor(current, ctx, exclude) : []), [mode, current, ctx, exclude]);
  const results = useMemo(() => searchLibrary(q, ctx, muscle, exclude), [q, muscle, ctx, exclude]);
  const searching = q.trim().length > 0 || muscle !== 'all';
  if (!mode) return null;
  const list = mode === 'swap' && !searching ? similar : results;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.back}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.head}><Text style={s.title}>{mode === 'swap' ? `Swap ${current?.name ?? ''}` : 'Add an exercise'}</Text><TouchableOpacity onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={colors.ink} /></TouchableOpacity></View>
          <TextInput style={s.search} value={q} onChangeText={setQ} placeholder="Search exercises" placeholderTextColor={colors.faint} autoCorrect={false} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 8 }}>
            {(['all', ...ALL_MUSCLES] as const).map((m) => (
              <TouchableOpacity key={m} onPress={() => setMuscle(m)} style={[s.chip, muscle === m && s.chipOn]}><Text style={[s.chipText, muscle === m && { color: '#fff' }]}>{m === 'all' ? 'All' : MUSCLE_LABEL[m]}</Text></TouchableOpacity>
            ))}
          </ScrollView>
          {mode === 'swap' && !searching ? <Text style={s.hint}>{similar.length ? 'Similar exercises you can do' : 'No similar exercises found. Search above.'}</Text> : null}
          <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
            {list.length === 0 ? <Text style={s.none}>Nothing matches. Try another word.</Text> : list.map((e) => (
              <TouchableOpacity key={e.id} style={s.row} onPress={() => onPick(e)} accessibilityRole="button">
                <View style={{ flex: 1 }}><Text style={s.name}>{e.name}</Text><Text style={s.meta}>{MUSCLE_LABEL[e.muscle]} · {e.gear === 'bar' ? 'pull-up bar' : e.gear} · {e.level === 1 ? 'beginner' : e.level === 2 ? 'intermediate' : 'advanced'}</Text></View>
                <Ionicons name={mode === 'swap' ? 'swap-horizontal' : 'add-circle-outline'} size={22} color={colors.brandBright} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  editor: { marginTop: 8, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  steppers: { flexDirection: 'row', gap: 8 }, stepper: { flex: 1, alignItems: 'center' }, stepLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }, stepBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' }, stepVal: { color: colors.ink, fontWeight: '900', fontSize: 16, minWidth: 34, textAlign: 'center' },
  tools: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 6 }, toolText: { color: colors.brandBright, fontWeight: '800', fontSize: 13 },
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0a1226', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, title: { color: colors.ink, fontSize: 18, fontWeight: '900', flex: 1, marginRight: 8 },
  search: { height: 44, borderRadius: 14, paddingHorizontal: 14, color: colors.ink, fontSize: 15, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }, chipOn: { backgroundColor: colors.brand, borderColor: colors.brandBright }, chipText: { color: colors.inkSoft, fontWeight: '800', fontSize: 12.5 },
  hint: { color: colors.muted, fontSize: 12, marginBottom: 4 }, none: { color: colors.muted, textAlign: 'center', padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' }, name: { color: colors.ink, fontWeight: '800', fontSize: 15 }, meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
