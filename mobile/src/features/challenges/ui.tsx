import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { Avatar } from '../social/ui';
import { Cell, DayChallenge, Member, Tone, gridCells, standing } from './challengeLogic';

const TONE: Record<Tone, string> = { good: colors.success, warn: colors.warning, bad: colors.danger, muted: colors.muted };

/** One person's bar: their name, how many of the days they have done, and a filled bar. */
export function StatusBar({ member, challenge, compact }: { member: Member; challenge: Pick<DayChallenge, 'state'>; compact?: boolean }) {
  const st = standing(member, challenge);
  const pct = member.progress?.pct ?? 0;
  return (
    <View style={s.row}>
      <Avatar name={member.displayName} size={compact ? 30 : 38} />
      <View style={{ flex: 1 }}>
        <View style={s.line}>
          <Text style={[s.name, member.isMe && { color: colors.brandBright }]} numberOfLines={1}>{member.isMe ? 'You' : member.displayName}</Text>
          <Text style={[s.pct, { color: TONE[st.tone] }]}>{member.progress ? `${pct}%` : ''}</Text>
        </View>
        <View style={s.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
          {pct > 0 ? <LinearGradient colors={member.isMe ? ['#ff9a4d', '#ff5a36'] : ['#4da3ff', '#1f6fe0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.fill, { width: `${Math.max(pct, 3)}%` }]} /> : null}
        </View>
        <Text style={[s.sub, { color: TONE[st.tone] }]} numberOfLines={1}>{st.text}{member.progress?.todayDone ? ' · today ✓' : ''}</Text>
      </View>
    </View>
  );
}

const CELL: Record<Cell, string> = { done: '#1ec98a', missed: 'rgba(214,40,57,0.55)', today: colors.brandBright, future: 'rgba(255,255,255,0.1)' };

/** The day-by-day tracker: one square per day of the challenge. */
export function TrackerGrid({ grid, size = 18 }: { grid: string; size?: number }) {
  const cells = gridCells(grid);
  return (
    <View style={s.grid} accessibilityLabel={`${cells.filter((c) => c === 'done').length} days done`}>
      {cells.map((c, i) => <View key={i} style={[s.cell, { width: size, height: size, backgroundColor: CELL[c] }, c === 'today' && s.today]} />)}
    </View>
  );
}

export function Legend() {
  return (
    <View style={s.legend}>
      {([['done', 'Trained'], ['missed', 'Missed'], ['today', 'Today'], ['future', 'To come']] as [Cell, string][]).map(([k, l]) => (
        <View key={k} style={s.legendItem}><View style={[s.legendDot, { backgroundColor: CELL[k] }]} /><Text style={s.legendText}>{l}</Text></View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }, name: { color: colors.ink, fontWeight: '800', fontSize: 14.5, flex: 1 }, pct: { fontWeight: '900', fontSize: 13 },
  track: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.09)', marginTop: 5, overflow: 'hidden' }, fill: { height: 10, borderRadius: 5 },
  sub: { fontSize: 11.5, fontWeight: '700', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 }, cell: { borderRadius: 5 }, today: { borderWidth: 2, borderColor: '#fff' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, legendDot: { width: 10, height: 10, borderRadius: 3 }, legendText: { color: colors.muted, fontSize: 11.5, fontWeight: '600' },
});
