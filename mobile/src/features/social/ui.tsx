import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { MealSnap, WorkoutSnap, avatarColors, initials, mealFacts, streakLabel, workoutFacts } from './socialLogic';

/** A round avatar with the person's initials. A coloured ring shows an unseen status. */
export function Avatar({ name, size = 44, ring }: { name: string; size?: number; ring?: 'new' | 'seen' | null }) {
  const [c1, c2] = avatarColors(name);
  const inner = (
    <LinearGradient colors={[c1, c2]} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: size * 0.38 }}>{initials(name)}</Text>
    </LinearGradient>
  );
  if (!ring) return inner;
  const gap = Math.max(2, size * 0.06);
  return (
    <LinearGradient colors={ring === 'new' ? ['#ffd9a0', '#ff5a36', '#c4182f'] : ['#3a4663', '#3a4663']} style={{ width: size + gap * 4, height: size + gap * 4, borderRadius: (size + gap * 4) / 2, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size + gap * 2, height: size + gap * 2, borderRadius: (size + gap * 2) / 2, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>{inner}</View>
    </LinearGradient>
  );
}

/** The card for a shared workout, meal or streak. The facts come from the person's real record. */
export function ShareCard({ kind, snapshot, compact }: { kind: 'workout' | 'meal' | 'streak'; snapshot: any; compact?: boolean }) {
  if (!snapshot) return null;
  if (kind === 'streak') {
    return (
      <LinearGradient colors={['#8f1d2a', '#3a0b16']} style={[s.card, compact && s.cardCompact]}>
        <Ionicons name="flame" size={compact ? 36 : 46} color={colors.accent} />
        <Text style={s.big}>{snapshot.streak}</Text>
        <Text style={s.cap}>{streakLabel(snapshot.streak)}</Text>
      </LinearGradient>
    );
  }
  const f = kind === 'workout' ? workoutFacts(snapshot as WorkoutSnap) : mealFacts(snapshot as MealSnap);
  return (
    <LinearGradient colors={kind === 'workout' ? ['#2a0f1c', '#0c1730'] : ['#102a2a', '#0c1730']} style={[s.card, compact && s.cardCompact]}>
      <View style={s.kindRow}><Ionicons name={kind === 'workout' ? 'barbell' : 'restaurant'} size={14} color={colors.brandBright} /><Text style={s.kind}>{kind === 'workout' ? 'WORKOUT' : 'MEAL'}</Text></View>
      <Text style={s.title} numberOfLines={2}>{f.title}</Text>
      {f.subtitle ? <Text style={s.sub} numberOfLines={2}>{f.subtitle}</Text> : null}
      <View style={s.stats}>{f.stats.map((x) => <View key={x.label} style={s.stat}><Text style={s.statV}>{x.value}</Text><Text style={s.statL}>{x.label}</Text></View>)}</View>
    </LinearGradient>
  );
}

export function IconButton({ icon, onPress, badge, label, color = colors.ink }: { icon: string; onPress: () => void; badge?: number; label: string; color?: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.iconBtn} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <Ionicons name={icon as any} size={24} color={color} />
      {badge ? <View style={s.badge}><Text style={s.badgeText}>{badge > 9 ? '9+' : badge}</Text></View> : null}
    </TouchableOpacity>
  );
}

export function Empty({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon as any} size={44} color={colors.brandBright} />
      <Text style={s.emptyT}>{title}</Text>
      <Text style={s.emptyB}>{body}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,190,140,0.2)' }, cardCompact: { padding: 14 },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, kind: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.6, color: colors.brandBright },
  title: { fontSize: 20, fontWeight: '900', color: colors.ink, marginTop: 6 }, sub: { fontSize: 13, color: colors.muted, marginTop: 3 },
  stats: { flexDirection: 'row', gap: 18, marginTop: 14, flexWrap: 'wrap' }, stat: {}, statV: { fontSize: 22, fontWeight: '900', color: colors.ink }, statL: { fontSize: 10.5, fontWeight: '700', color: colors.muted, letterSpacing: 0.4 },
  big: { fontSize: 56, fontWeight: '900', color: colors.ink, lineHeight: 60 }, cap: { fontSize: 14, fontWeight: '800', color: '#ffd5c4', letterSpacing: 0.5 },
  iconBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }, badgeText: { color: '#fff', fontSize: 10.5, fontWeight: '900' },
  empty: { alignItems: 'center', padding: 36, gap: 8 }, emptyT: { fontSize: 18, fontWeight: '900', color: colors.ink, marginTop: 6 }, emptyB: { fontSize: 13.5, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
