import React, { useEffect } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { useLoop, useReducedMotion } from '../fx/useMotion';

interface ChatFABProps {
  onPress: () => void;
  unreadCount?: number;
}

/** The launch button for support chat: a rocket with a flickering flame and a light circling it. */
export default function ChatFAB({ onPress, unreadCount = 0 }: ChatFABProps) {
  const reduced = useReducedMotion();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const spin = React.useRef(new Animated.Value(0)).current;
  const hover = useLoop(2400, 0, !reduced);
  const flame = useLoop(180, 0, !reduced);

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [reduced, spin]);

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const floatY = hover.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const flameScale = flame.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.25] });

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: floatY }, { scale: scaleAnim }] }]}>
      <Animated.View style={[styles.flame, { transform: [{ scaleY: flameScale }] }]} />
      <Animated.View style={[styles.orbit, { transform: [{ rotate }] }]} pointerEvents="none">
        <View style={styles.orbitDot} />
      </Animated.View>
      <TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.9}
        accessibilityRole="button" accessibilityLabel="Open support chat">
        <LinearGradient colors={['#ff9a4d', '#e63946', '#7a1224']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.fab}>
          <Ionicons name="rocket" size={28} color={colors.white} />
        </LinearGradient>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 24, right: 24, zIndex: 999, width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: 62, height: 62, borderRadius: 31, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#ff4d2e', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.75, shadowRadius: 14, elevation: 10,
  },
  flame: { position: 'absolute', bottom: -16, width: 14, height: 22, borderRadius: 8, backgroundColor: '#ff9a2e', opacity: 0.85, shadowColor: '#ff7a1a', shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  orbit: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,190,150,0.45)' },
  orbitDot: { position: 'absolute', top: -4, left: 36, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4da3ff', shadowColor: '#4da3ff', shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#4da3ff', minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, borderWidth: 2, borderColor: colors.surface },
  badgeText: { color: '#05070d', fontSize: 12, fontWeight: 'bold' },
});
