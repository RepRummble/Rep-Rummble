import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/** Rumi: a round helmet with a dark visor and two glowing orange eyes, and a little red antenna. */
export default function Pilot({ size = 36 }: { size?: number }) {
  const rim = Math.max(2, size * 0.06);
  return (
    <LinearGradient colors={['#ff4d4d', '#ff7a1a', '#4da3ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, padding: rim, shadowColor: '#ff7a1a', shadowOpacity: 0.55, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }}>
      <View style={{ flex: 1, borderRadius: size / 2, backgroundColor: '#0b1226', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: size * 0.62, height: size * 0.36, borderRadius: size * 0.18, backgroundColor: '#05070d', borderWidth: 1.2, borderColor: '#ff7a1a', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: size * 0.06 }}>
          <View style={{ width: size * 0.1, height: size * 0.1, borderRadius: size, backgroundColor: '#ff7a1a' }} />
          <View style={{ width: size * 0.1, height: size * 0.1, borderRadius: size, backgroundColor: '#ff7a1a' }} />
        </View>
        <View style={{ position: 'absolute', top: size * 0.04, width: 2, height: size * 0.14, backgroundColor: '#ff4d4d' }} />
      </View>
    </LinearGradient>
  );
}
