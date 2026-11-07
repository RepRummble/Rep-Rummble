import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from './useMotion';

/** A short burst of light streaks, like jumping to hyperspace. Play it by changing `trigger`. */
export default function WarpFlash({ trigger }: { trigger: number }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const p = useRef(new Animated.Value(0)).current;
  const first = useRef(true);
  const S = Math.max(width, height) * 1.7;

  const streaks = useMemo(() => {
    let s = 7;
    const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    return Array.from({ length: 44 }, (_, i) => ({ id: i, angle: (360 / 44) * i + r() * 6, start: 0.22 + r() * 0.2, len: 0.12 + r() * 0.28, warm: r() > 0.5, o: 0.45 + r() * 0.5 }));
  }, []);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduced) return;
    p.setValue(0);
    Animated.timing(p, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [trigger, reduced, p]);

  const opacity = p.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, 1, 0] });
  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.1] });
  const rotate = p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '12deg'] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{ position: 'absolute', left: (width - S) / 2, top: (height - S) / 2, width: S, height: S, opacity, transform: [{ scale }, { rotate }] }}>
        {streaks.map((k) => (
          <View key={k.id} style={{ position: 'absolute', left: 0, top: 0, width: S, height: S, transform: [{ rotate: `${k.angle}deg` }] }}>
            <View style={{ position: 'absolute', left: S / 2 - 1, top: (S / 2) * k.start, width: 2, height: (S / 2) * k.len, borderRadius: 1, opacity: k.o, backgroundColor: k.warm ? '#ffb48a' : '#ff5a5a' }} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
