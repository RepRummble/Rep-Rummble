import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { Mission, claimableXp } from './missionLogic';
import { Eyebrow, GlassCard } from './ui';

/** Today's missions, worked out from what you really logged. Finish one, then collect its XP. */
export default function MissionsCard({ missions, claimed, onClaim }: { missions: Mission[]; claimed: string[]; onClaim: (ids: string[]) => Promise<boolean> }) {
  const [busy, setBusy] = useState(false);
  const doneCount = missions.filter((m) => m.done).length;
  const ready = missions.filter((m) => m.done && !claimed.includes(m.id));
  const xpReady = claimableXp(missions, claimed);

  const collect = async (ids: string[]) => {
    if (busy || ids.length === 0) return;
    setBusy(true);
    try { await onClaim(ids); } finally { setBusy(false); }
  };

  return (
    <View>
      <Eyebrow right={`${doneCount} of ${missions.length} complete`}>Daily missions</Eyebrow>
      <GlassCard>
        {missions.map((m, i) => {
          const isClaimed = claimed.includes(m.id);
          const pct = m.target ? Math.min(100, (m.progress / m.target) * 100) : 0;
          return (
            <View key={m.id} style={[s.row, i > 0 && s.rowBorder]}>
              <View style={[s.icon, m.done && s.iconDone]}>
                <Ionicons name={(isClaimed ? 'checkmark' : m.icon) as any} size={20} color={m.done ? '#fff' : colors.brandBright} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.title, isClaimed && s.titleDone]}>{m.title}</Text>
                <Text style={s.hint}>{m.done ? 'Complete' : m.unit ? `${m.progress} / ${m.target} ${m.unit}` : m.hint}</Text>
                <View style={s.track}><LinearGradient colors={['#ff5a36', '#ff9a4d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.fill, { width: `${pct}%` }]} /></View>
              </View>
              {isClaimed ? (
                <Text style={s.claimed}>+{m.xp} XP</Text>
              ) : m.done ? (
                <TouchableOpacity onPress={() => collect([m.id])} disabled={busy} style={s.claimBtn} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`Collect ${m.xp} XP for ${m.title}`}>
                  <Text style={s.claimText}>Collect +{m.xp}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={s.xp}>+{m.xp} XP</Text>
              )}
            </View>
          );
        })}
        {ready.length > 1 && (
          <TouchableOpacity onPress={() => collect(ready.map((m) => m.id))} disabled={busy} activeOpacity={0.9} style={{ marginTop: 14 }}>
            <LinearGradient colors={['#d62839', '#ff7a1a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.all}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.allText}>Collect all · +{xpReady} XP</Text>}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </GlassCard>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,122,26,0.12)', borderWidth: 1, borderColor: 'rgba(255,122,26,0.3)' },
  iconDone: { backgroundColor: '#e0451f', borderColor: '#ff9a4d' },
  title: { fontSize: 15, fontWeight: '800', color: colors.ink },
  titleDone: { color: colors.muted },
  hint: { fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: 7 },
  track: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.09)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  xp: { fontSize: 12, fontWeight: '800', color: colors.faint, letterSpacing: 0.4 },
  claimed: { fontSize: 12, fontWeight: '800', color: colors.success },
  claimBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: colors.brand, shadowColor: '#ff4d2e', shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  claimText: { color: '#fff', fontSize: 12.5, fontWeight: '900' },
  all: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  allText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.4 },
});
