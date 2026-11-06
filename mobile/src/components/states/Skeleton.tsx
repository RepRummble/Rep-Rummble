import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import { colors, radius } from '../../theme/colors';

/** A pulsing placeholder, so a screen shows the shape of what is coming instead of a spinner. */
export function Skeleton({ w = '100%', h = 14, r = 8, style }: { w?: DimensionValue; h?: number; r?: number; style?: ViewStyle }) {
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.55, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View accessibilityElementsHidden style={[{ width: w, height: h, borderRadius: r, backgroundColor: colors.surfaceAlt, opacity: pulse }, style]} />;
}

/** The home screen's shape: greeting, ring card, quick actions, list. */
export function HomeSkeleton() {
  return (
    <View style={sk.page} accessibilityRole="progressbar" accessibilityLabel="Loading your day">
      <Skeleton w="46%" h={14} /><Skeleton w="62%" h={28} r={10} style={{ marginTop: 8 }} />
      <View style={sk.card}>
        <Skeleton w="34%" h={14} />
        <View style={sk.rings}>{[0, 1, 2].map((i) => <Skeleton key={i} w={92} h={92} r={46} />)}</View>
      </View>
      <View style={sk.grid}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} w="48%" h={64} r={18} />)}</View>
      {[0, 1].map((i) => <View key={i} style={sk.row}><Skeleton w={42} h={42} r={13} /><View style={{ flex: 1, gap: 8 }}><Skeleton w="60%" h={12} /><Skeleton w="34%" h={10} /></View></View>)}
    </View>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View style={sk.page} accessibilityRole="progressbar" accessibilityLabel="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={sk.row}><Skeleton w={44} h={44} r={22} /><View style={{ flex: 1, gap: 8 }}><Skeleton w="55%" h={13} /><Skeleton w="30%" h={10} /></View><Skeleton w={44} h={14} /></View>
      ))}
    </View>
  );
}

/** A few message bubbles while a conversation starts. */
export function ChatSkeleton() {
  return (
    <View style={sk.page} accessibilityRole="progressbar" accessibilityLabel="Starting chat">
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}><Skeleton w={30} h={30} r={15} /><Skeleton w="64%" h={64} r={18} /></View>
      <View style={{ alignItems: 'flex-end' }}><Skeleton w="48%" h={40} r={18} /></View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}><Skeleton w={30} h={30} r={15} /><Skeleton w="72%" h={90} r={18} /></View>
    </View>
  );
}

const sk = StyleSheet.create({
  page: { padding: 20, gap: 14 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, padding: 18, gap: 16, marginTop: 12 },
  rings: { flexDirection: 'row', justifyContent: 'space-around' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
});
