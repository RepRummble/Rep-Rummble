import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { GOALS } from './missionLogic';
import { Eyebrow, GlassCard } from './ui';

/** Eight glasses a day. Tap a drop to set how many you have had. Saved on your phone for today. */
export default function WaterCard({ glasses, goal = GOALS.water, onChange }: { glasses: number; goal?: number; onChange: (n: number) => void }) {
  return (
    <View>
      <Eyebrow right={`${(glasses * 0.25).toFixed(2).replace(/\.?0+$/, '')} L today`}>Hydration</Eyebrow>
      <GlassCard>
        <View style={s.drops}>
          {Array.from({ length: goal }, (_, i) => {
            const on = i < glasses;
            return (
              <TouchableOpacity key={i} onPress={() => onChange(glasses === i + 1 ? i : i + 1)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${i + 1} glasses`}>
                <Ionicons name={on ? 'water' : 'water-outline'} size={30} color={on ? '#4da3ff' : 'rgba(143,164,201,0.55)'} style={on ? s.glow : undefined} />
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={s.foot}>
          <Text style={s.count}>{glasses} <Text style={s.of}>of {goal} glasses</Text></Text>
          <View style={s.btns}>
            <TouchableOpacity style={s.btn} onPress={() => onChange(Math.max(0, glasses - 1))} disabled={glasses === 0} accessibilityLabel="One glass less"><Ionicons name="remove" size={20} color={colors.ink} /></TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnAdd]} onPress={() => onChange(glasses + 1)} accessibilityLabel="One glass more"><Ionicons name="add" size={20} color="#fff" /></TouchableOpacity>
          </View>
        </View>
      </GlassCard>
    </View>
  );
}

const s = StyleSheet.create({
  drops: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  glow: { textShadowColor: '#4da3ff', textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontSize: 22, fontWeight: '900', color: colors.ink },
  of: { fontSize: 13, fontWeight: '600', color: colors.muted },
  btns: { flexDirection: 'row', gap: 10 },
  btn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  btnAdd: { backgroundColor: colors.brand, borderColor: '#ff9a4d' },
});
