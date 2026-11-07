import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { Badge } from './missionLogic';
import { Eyebrow } from './ui';

/** Medals you have earned and the ones still ahead, with real progress toward each. */
export default function BadgesRow({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.unlocked).length;
  return (
    <View>
      <Eyebrow right={`${earned} of ${badges.length} earned`}>Achievements</Eyebrow>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 18 }}>
        {badges.map((b) => (
          <View key={b.id} style={[s.card, b.unlocked && s.cardOn]} accessible accessibilityLabel={`${b.title}: ${b.unlocked ? 'earned' : `${b.progress} of ${b.target}`}`}>
            <LinearGradient colors={b.unlocked ? ['#ffb37a', '#ff5a36', '#8f1d2a'] : ['#2a3550', '#1a2338']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.medal}>
              <Ionicons name={(b.unlocked ? b.icon : 'lock-closed') as any} size={24} color={b.unlocked ? '#fff' : colors.faint} />
            </LinearGradient>
            <Text style={[s.title, !b.unlocked && { color: colors.muted }]} numberOfLines={1}>{b.title}</Text>
            <Text style={s.desc} numberOfLines={2}>{b.unlocked ? 'Earned' : b.desc}</Text>
            {!b.unlocked && (
              <View style={s.track}><View style={[s.fill, { width: `${(b.progress / b.target) * 100}%` }]} /></View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: { width: 128, padding: 14, borderRadius: 20, backgroundColor: 'rgba(10,18,38,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  cardOn: { borderColor: 'rgba(255,140,80,0.5)', shadowColor: '#ff4d2e', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  medal: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title: { fontSize: 13.5, fontWeight: '800', color: colors.ink },
  desc: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 3, minHeight: 28 },
  track: { alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.09)', marginTop: 8, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.brand, borderRadius: 2 },
});
