import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { levelProgress } from './missionLogic';
import { GlassCard } from './ui';

/** Your rank, level and XP: the first thing you see, and the reason to come back. */
export default function RankCard({ xp, streak }: { xp: number; streak: number }) {
  const p = levelProgress(xp);
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fill, { toValue: p.pct, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [p.pct, fill]);
  const width = fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <GlassCard glow>
      <View style={s.top}>
        <LinearGradient colors={['#ffb37a', '#ff5a36', '#8f1d2a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.medalRing}>
          <View style={s.medal}><Ionicons name={p.rank.icon as any} size={30} color={colors.brandBright} /></View>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={s.rank}>{p.rank.name.toUpperCase()}</Text>
          <Text style={s.level}>Level {p.level}</Text>
        </View>
        <View style={s.streak}>
          <Ionicons name="flame" size={16} color={colors.accent} />
          <Text style={s.streakNum}>{streak}</Text>
          <Text style={s.streakLabel}>day{streak === 1 ? '' : 's'}</Text>
        </View>
      </View>

      <View style={s.track}>
        <Animated.View style={[s.fillWrap, { width }]}>
          <LinearGradient colors={['#ff5a36', '#ff9a4d', '#ffd9a0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>
      <View style={s.foot}>
        <Text style={s.footLeft}>{p.xpInLevel} / 500 XP</Text>
        <Text style={s.footRight}>{p.xpToNext} to Level {p.level + 1}{p.next ? ` · ${p.next.name} at Level ${p.next.fromLevel}` : ''}</Text>
      </View>
    </GlassCard>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  medalRing: { width: 62, height: 62, borderRadius: 31, padding: 2.5, shadowColor: '#ff7a1a', shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  medal: { flex: 1, borderRadius: 30, backgroundColor: '#0b1226', alignItems: 'center', justifyContent: 'center' },
  rank: { fontSize: 22, fontWeight: '900', letterSpacing: 4, color: colors.ink },
  level: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 2, letterSpacing: 0.5 },
  streak: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,122,26,0.12)', borderWidth: 1, borderColor: 'rgba(255,122,26,0.35)' },
  streakNum: { fontSize: 18, fontWeight: '900', color: colors.ink, lineHeight: 22 },
  streakLabel: { fontSize: 10, color: colors.muted, fontWeight: '700', letterSpacing: 0.6 },
  track: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.09)', overflow: 'hidden' },
  fillWrap: { height: '100%', borderRadius: 5, overflow: 'hidden' },
  foot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9, gap: 10 },
  footLeft: { fontSize: 12, fontWeight: '800', color: colors.brandBright },
  footRight: { flex: 1, textAlign: 'right', fontSize: 11.5, color: colors.muted },
});
