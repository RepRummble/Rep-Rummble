import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { isOnline, subscribeConnectivity } from '../../config/connectivity';

/** Slides in from the top when requests stop reaching the server, and says "back online" when they do again. */
export default function OfflineBanner() {
  const [online, setOnlineState] = useState(isOnline());
  const [justBack, setJustBack] = useState(false);
  const slide = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = subscribeConnectivity((next) => {
      setOnlineState(next);
      if (next) { setJustBack(true); timer = setTimeout(() => setJustBack(false), 3000); }
      else { setJustBack(false); if (timer) clearTimeout(timer); }
    });
    return () => { off(); if (timer) clearTimeout(timer); };
  }, []);

  const visible = !online || justBack;
  useEffect(() => {
    Animated.spring(slide, { toValue: visible ? 0 : -80, useNativeDriver: true, speed: 14, bounciness: 6 }).start();
  }, [visible, slide]);

  return (
    <Animated.View pointerEvents="none" style={[s.wrap, { transform: [{ translateY: slide }] }]}>
      <SafeAreaView edges={['top']} style={s.safe}>
        <Animated.View style={[s.pill, online ? s.ok : s.off]} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Ionicons name={online ? 'checkmark-circle' : 'cloud-offline'} size={16} color={colors.white} />
          <Text style={s.text}>{online ? 'Back online' : 'You are offline. Showing what we saved.'}</Text>
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, alignItems: 'center' },
  safe: { alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, marginTop: 6 },
  off: { backgroundColor: '#1d2939' },
  ok: { backgroundColor: '#067647' },
  text: { color: colors.white, fontSize: 13.5, fontWeight: '600' },
});
