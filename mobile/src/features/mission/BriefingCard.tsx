import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Insight } from './missionLogic';
import { Eyebrow, GlassCard } from './ui';

const TONE = { go: colors.brandBright, warn: colors.warning, good: colors.success } as const;

/** What your own numbers say right now. Every line comes from what you logged, not from a script. */
export default function BriefingCard({ insights, onAsk }: { insights: Insight[]; onAsk: () => void }) {
  const shown = insights.slice(0, 3);
  return (
    <View>
      <Eyebrow>Mission briefing</Eyebrow>
      <GlassCard>
        {shown.length === 0 ? (
          <Text style={s.empty}>Log a meal or a workout and your briefing appears here.</Text>
        ) : shown.map((i, n) => (
          <View key={i.id} style={[s.row, n > 0 && s.border]}>
            <View style={[s.icon, { borderColor: TONE[i.tone] + '66', backgroundColor: TONE[i.tone] + '1f' }]}><Ionicons name={i.icon as any} size={18} color={TONE[i.tone]} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{i.title}</Text>
              <Text style={s.body}>{i.body}</Text>
            </View>
          </View>
        ))}
        <TouchableOpacity onPress={onAsk} style={s.ask} activeOpacity={0.85}>
          <Ionicons name="rocket" size={15} color={colors.brandBright} />
          <Text style={s.askText}>Ask Rumi for more</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.brandBright} />
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingVertical: 11 },
  border: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 14.5, fontWeight: '800', color: colors.ink },
  body: { fontSize: 12.5, color: colors.inkSoft, marginTop: 3, lineHeight: 18 },
  empty: { fontSize: 13.5, color: colors.muted, paddingVertical: 6 },
  ask: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,154,77,0.4)', backgroundColor: 'rgba(255,122,26,0.08)' },
  askText: { color: colors.brandBright, fontSize: 13.5, fontWeight: '800' },
});
