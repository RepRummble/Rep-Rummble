import React, { useMemo } from 'react';
import { Animated, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { colors } from '../../theme/colors';
import { useLoop, useReducedMotion } from './useMotion';

/* The night sky behind the app: twinkling stars, drifting red and orange light, and gym equipment floating through it.
   Built from plain views and the built-in Animated API (no native modules), so it runs in the current build.
   It sits behind everything and ignores touches. */

const STEEL = '#1a2030';
const RIM = '#ff7a1a';

/** A small, repeatable "random": the same sky every time. */
function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function Stars({ count, size, seed, duration, delay, enabled }: { count: number; size: number; seed: number; duration: number; delay: number; enabled: boolean }) {
  const dots = useMemo(() => {
    const r = seeded(seed);
    return Array.from({ length: count }, (_, i) => ({ id: i, x: r() * 100, y: r() * 100, warm: r() > 0.7 }));
  }, [count, seed]);
  const v = useLoop(duration, delay, enabled);
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      {dots.map((d) => (
        <View key={d.id} style={{ position: 'absolute', left: `${d.x}%`, top: `${d.y}%`, width: size, height: size, borderRadius: size, backgroundColor: d.warm ? '#ffd9c2' : '#ffffff' }} />
      ))}
    </Animated.View>
  );
}

/** Soft light made of stacked circles (no blur needed). */
function Glow({ size, rgb, style, duration, dx, dy, enabled }: { size: number; rgb: string; style: ViewStyle; duration: number; dx: number; dy: number; enabled: boolean }) {
  const v = useLoop(duration, 0, enabled);
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  return (
    <Animated.View style={[{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ translateX }, { translateY }] }, style]} pointerEvents="none">
      {Array.from({ length: 7 }, (_, i) => {
        const d = size * (1 - i * 0.14);
        return <View key={i} style={{ position: 'absolute', width: d, height: d, borderRadius: d, backgroundColor: `rgba(${rgb}, 0.06)` }} />;
      })}
    </Animated.View>
  );
}

/** Floats, drifts and tumbles slowly. */
function Floating({ children, style, period, dx, dy, rot, delay, enabled }: { children: React.ReactNode; style: ViewStyle; period: number; dx: number; dy: number; rot: [number, number]; delay: number; enabled: boolean }) {
  const v = useLoop(period, delay, enabled);
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: [`${rot[0]}deg`, `${rot[1]}deg`] });
  return (
    <Animated.View style={[{ position: 'absolute' }, style, { transform: [{ translateX }, { translateY }, { rotate }] }]} pointerEvents="none">
      {children}
    </Animated.View>
  );
}

const glow = { shadowColor: '#ff4d2e', shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } } as const;

function Slab({ x, y, w, h, r }: { x: number; y: number; w: number; h: number; r: number }) {
  return <View style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, backgroundColor: STEEL, borderWidth: 1.2, borderColor: RIM }} />;
}

export function Dumbbell({ width }: { width: number }) {
  const W = width; const H = W * 0.5; const bar = W * 0.07;
  return (
    <View style={[{ width: W, height: H }, glow]}>
      <View style={{ position: 'absolute', left: W * 0.22, right: W * 0.22, top: (H - bar) / 2, height: bar, borderRadius: bar / 2, backgroundColor: '#262c3b', borderWidth: 1, borderColor: RIM }} />
      <Slab x={W * 0.06} y={H * 0.22} w={W * 0.1} h={H * 0.56} r={W * 0.03} />
      <Slab x={W * 0.15} y={H * 0.1} w={W * 0.09} h={H * 0.8} r={W * 0.03} />
      <Slab x={W * 0.76} y={H * 0.1} w={W * 0.09} h={H * 0.8} r={W * 0.03} />
      <Slab x={W * 0.84} y={H * 0.22} w={W * 0.1} h={H * 0.56} r={W * 0.03} />
    </View>
  );
}

export function Kettlebell({ size }: { size: number }) {
  const D = size; const hb = D * 0.08;
  return (
    <View style={[{ width: D, height: D * 1.1 }, glow]}>
      <View style={{ position: 'absolute', top: 0, left: D * 0.2, width: D * 0.6, height: D * 0.55, borderWidth: hb, borderBottomWidth: 0, borderTopLeftRadius: D * 0.3, borderTopRightRadius: D * 0.3, borderColor: RIM }} />
      <View style={{ position: 'absolute', bottom: 0, width: D, height: D * 0.84, borderRadius: D / 2, backgroundColor: STEEL, borderWidth: 1.4, borderColor: RIM }}>
        <View style={{ position: 'absolute', left: D * 0.18, top: D * 0.14, width: D * 0.18, height: D * 0.3, borderRadius: D * 0.1, backgroundColor: 'rgba(255,255,255,0.08)', transform: [{ rotate: '25deg' }] }} />
      </View>
    </View>
  );
}

export function WeightPlate({ size }: { size: number }) {
  const D = size;
  const ring = (k: number, c: string, w = 1.2) => <View style={{ position: 'absolute', width: D * k, height: D * k, borderRadius: D, borderWidth: w, borderColor: c }} />;
  return (
    <View style={[{ width: D, height: D, borderRadius: D / 2, backgroundColor: STEEL, borderWidth: 1.6, borderColor: RIM, alignItems: 'center', justifyContent: 'center' }, glow]}>
      {ring(0.74, 'rgba(255,122,26,0.5)')}
      {ring(0.5, 'rgba(255,255,255,0.14)', 1)}
      <View style={{ width: D * 0.16, height: D * 0.16, borderRadius: D, backgroundColor: '#05070d', borderWidth: 1.4, borderColor: RIM }} />
    </View>
  );
}

export function Barbell({ width }: { width: number }) {
  const W = width; const H = W * 0.24; const bar = W * 0.03;
  return (
    <View style={[{ width: W, height: H }, glow]}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: (H - bar) / 2, height: bar, borderRadius: bar / 2, backgroundColor: '#262c3b', borderWidth: 1, borderColor: RIM }} />
      <Slab x={W * 0.06} y={H * 0.1} w={W * 0.045} h={H * 0.8} r={W * 0.015} />
      <Slab x={W * 0.11} y={H * 0.22} w={W * 0.04} h={H * 0.56} r={W * 0.015} />
      <Slab x={W * 0.85} y={H * 0.22} w={W * 0.04} h={H * 0.56} r={W * 0.015} />
      <Slab x={W * 0.895} y={H * 0.1} w={W * 0.045} h={H * 0.8} r={W * 0.015} />
    </View>
  );
}

export default function SpaceBackground({ quiet = false }: { quiet?: boolean }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const on = !reduced;
  const fade = quiet ? 0.55 : 1; // data-heavy screens get the equipment a little dimmer

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} pointerEvents="none">
      <Glow size={width * 1.3} rgb="214, 40, 57" style={{ left: -width * 0.55, top: -width * 0.35 }} duration={9000} dx={60} dy={50} enabled={on} />
      <Glow size={width * 1.2} rgb="255, 122, 26" style={{ right: -width * 0.55, bottom: -width * 0.3 }} duration={11000} dx={-50} dy={-60} enabled={on} />
      <Glow size={width * 0.9} rgb="31, 111, 255" style={{ left: width * 0.2, top: height * 0.4 }} duration={13000} dx={30} dy={-40} enabled={on} />
      <Stars count={34} size={1.4} seed={11} duration={2600} delay={0} enabled={on} />
      <Stars count={20} size={2} seed={29} duration={3400} delay={900} enabled={on} />
      <Stars count={8} size={3} seed={47} duration={4200} delay={1700} enabled={on} />

      <Floating style={{ left: width * 0.04, top: height * 0.1, opacity: 0.5 * fade }} period={7000} dx={14} dy={-22} rot={[-24, -14]} delay={0} enabled={on}>
        <Dumbbell width={width * 0.5} />
      </Floating>
      <Floating style={{ left: width * 0.74, top: height * 0.2, opacity: 0.45 * fade }} period={8500} dx={-10} dy={18} rot={[10, 22]} delay={800} enabled={on}>
        <Kettlebell size={width * 0.22} />
      </Floating>
      <Floating style={{ left: width * 0.62, top: height * 0.62, opacity: 0.4 * fade }} period={10000} dx={-16} dy={-20} rot={[0, 18]} delay={1600} enabled={on}>
        <WeightPlate size={width * 0.38} />
      </Floating>
      <Floating style={{ left: -width * 0.04, top: height * 0.76, opacity: 0.3 * fade }} period={11500} dx={22} dy={14} rot={[-9, -3]} delay={2400} enabled={on}>
        <Barbell width={width * 0.85} />
      </Floating>
      <Floating style={{ left: width * 0.42, top: height * 0.05, opacity: 0.28 * fade }} period={9000} dx={8} dy={16} rot={[-22, -8]} delay={300} enabled={on}>
        <Kettlebell size={width * 0.11} />
      </Floating>
    </View>
  );
}
