import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

/** The one card style of Mission Control: dark glass, a hairline of warm light, soft depth. */
export function GlassCard({ children, style, glow = false }: { children: React.ReactNode; style?: ViewStyle; glow?: boolean }) {
  return (
    <View style={[s.card, glow && s.cardGlow, style]}>
      <LinearGradient colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.sheen} pointerEvents="none" />
      {children}
    </View>
  );
}

/** A small, spaced-out label above a section, like the engraving on a cockpit panel. */
export function Eyebrow({ children, right }: { children: string; right?: string }) {
  return (
    <View style={s.eyebrowRow}>
      <Text style={s.eyebrow}>{children.toUpperCase()}</Text>
      {right ? <Text style={s.eyebrowRight}>{right}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(10, 18, 38, 0.88)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255, 190, 140, 0.2)',
    padding: 18, marginHorizontal: 20, marginBottom: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6,
  },
  cardGlow: { borderColor: 'rgba(255, 140, 80, 0.45)', shadowColor: '#ff4d2e', shadowOpacity: 0.35 },
  sheen: { position: 'absolute', left: 0, right: 0, top: 0, height: 60 },
  eyebrowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: 22, marginBottom: 10, marginTop: 6 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 2.2, color: colors.brandBright },
  eyebrowRight: { fontSize: 12, fontWeight: '600', color: colors.muted },
});
