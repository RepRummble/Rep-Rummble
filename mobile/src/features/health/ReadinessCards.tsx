import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { GlassCard } from '../mission/ui';
import { SOURCE_NAMES } from '../devices/devicesLogic';
import { strainWord, type Level, type Part } from './scores';
import type { Readiness } from './readiness';

export const LEVEL_COLOR: Record<Level, string> = { green: colors.success, yellow: colors.warning, red: colors.danger };

function Bar({ pct, color, children }: { pct: number; color: string; children?: React.ReactNode }) {
  return <View style={s.track}><View style={[s.fill, { width: `${Math.max(2, Math.min(100, pct))}%`, backgroundColor: color }]} />{children}</View>;
}

function Parts({ parts }: { parts: Part[] }) {
  return (
    <View style={{ marginTop: 10 }}>
      {parts.map((p) => (
        <View key={p.key} style={s.part}>
          <View style={s.partHead}><Text style={s.partLabel}>{p.label}</Text><Text style={s.partPts}>{Math.round(p.points)}</Text></View>
          <Bar pct={p.points} color={p.points >= 67 ? colors.success : p.points >= 34 ? colors.warning : colors.danger} />
          <Text style={s.partDetail}>{p.detail}</Text>
        </View>
      ))}
    </View>
  );
}

/** Recovery, the number to lead with. Tap "What moved it" to see exactly which readings the score is built from. */
export function RecoveryCard({ r }: { r: Readiness }) {
  const [open, setOpen] = useState(false);
  const h = r.headline;
  if (!h) {
    const own = r.own;
    return (
      <GlassCard glow>
        <Text style={s.eyebrow}>RECOVERY</Text>
        <Text style={s.calTitle}>{own.ready ? '' : own.reason === 'calibrating' ? 'Learning your normal' : 'Waiting for your watch'}</Text>
        <Text style={s.calBody}>{own.ready ? '' : own.message}</Text>
        {!own.ready && own.reason === 'calibrating' ? <Bar pct={(own.nights / own.needed) * 100} color={colors.brandBright} /> : null}
      </GlassCard>
    );
  }
  const col = LEVEL_COLOR[h.level];
  const own = r.own.ready ? r.own : null;
  return (
    <GlassCard glow>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>{h.source === 'reprummble' ? 'RECOVERY' : `${(SOURCE_NAMES[h.source] ?? h.source).toUpperCase()} RECOVERY`}</Text>
          <Text style={[s.big, { color: col }]}>{h.score}<Text style={s.bigUnit}>%</Text></Text>
          <Text style={[s.word, { color: col }]}>{h.word}</Text>
        </View>
        <View style={[s.ring, { borderColor: col }]}><Ionicons name={h.level === 'green' ? 'flash' : h.level === 'yellow' ? 'pulse' : 'bed'} size={26} color={col} /></View>
      </View>
      <Bar pct={h.score} color={col} />
      {h.source === 'reprummble' && own ? <Text style={s.summary}>{own.summary}</Text> : <Text style={s.summary}>From your {SOURCE_NAMES[h.source] ?? h.source}.{own ? ` Our own reading from your health data: ${own.score}%.` : ''}</Text>}
      {own ? (
        <>
          <TouchableOpacity onPress={() => setOpen((v) => !v)} style={s.more} accessibilityRole="button"><Text style={s.moreText}>{open ? 'Hide' : 'What moved it'}</Text><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.brandBright} /></TouchableOpacity>
          {open ? <Parts parts={own.parts} /> : null}
        </>
      ) : null}
    </GlassCard>
  );
}

export function SleepCard({ r }: { r: Readiness }) {
  const [open, setOpen] = useState(false);
  const sl = r.sleep;
  if (!sl) return null;
  const col = LEVEL_COLOR[sl.level];
  return (
    <GlassCard>
      <View style={s.row}><View style={{ flex: 1 }}><Text style={s.eyebrow}>LAST NIGHT’S SLEEP</Text><Text style={[s.mid, { color: col }]}>{sl.score}<Text style={s.bigUnit}> / 100</Text></Text></View><Ionicons name="moon" size={24} color="#7a8cff" /></View>
      <Bar pct={sl.score} color={col} />
      {sl.limited ? <Text style={s.note}>Based on how long you slept. Your watch did not record sleep stages.</Text> : null}
      <TouchableOpacity onPress={() => setOpen((v) => !v)} style={s.more} accessibilityRole="button"><Text style={s.moreText}>{open ? 'Hide' : 'How it is worked out'}</Text><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.brandBright} /></TouchableOpacity>
      {open ? <Parts parts={sl.parts} /> : null}
    </GlassCard>
  );
}

/** Strain, 0 to 21, against the range that suits today's recovery. */
export function StrainCard({ r }: { r: Readiness }) {
  const st = r.strain, deviceStrain = r.device.strain;
  const value = deviceStrain?.value ?? st?.strain;
  if (value === undefined) return null;
  const t = r.target;
  const col = t ? (value > t.max + 1 ? colors.warning : colors.brandBright) : colors.brandBright;
  return (
    <GlassCard>
      <View style={s.row}>
        <View style={{ flex: 1 }}><Text style={s.eyebrow}>{deviceStrain ? `${(SOURCE_NAMES[deviceStrain.source] ?? deviceStrain.source).toUpperCase()} STRAIN` : 'STRAIN TODAY'}</Text><Text style={[s.mid, { color: col }]}>{value.toFixed(1)}<Text style={s.bigUnit}> / 21</Text></Text><Text style={s.word2}>{strainWord(value)}</Text></View>
        <Ionicons name="flame" size={24} color={colors.accent} />
      </View>
      <Bar pct={(value / 21) * 100} color={col}>
        {t ? <View style={[s.band, { left: `${(t.min / 21) * 100}%`, width: `${((t.max - t.min) / 21) * 100}%` }]} /> : null}
      </Bar>
      {t ? <Text style={s.note}>Suggested for today: {t.min} to {t.max} ({t.label.toLowerCase()}), based on your recovery.</Text> : <Text style={s.note}>Strain shows how hard your heart has worked today.</Text>}
      {!deviceStrain && st ? <Text style={s.note}>{st.zoneMinutes.reduce((a, b) => a + b, 0)} minutes with your heart rate above 60% of your reserve.</Text> : null}
    </GlassCard>
  );
}

/** A small recovery line for other screens. */
export function RecoveryChip({ r }: { r: Readiness | null }) {
  if (!r?.headline) return null;
  const h = r.headline;
  return <View style={[s.chip, { borderColor: LEVEL_COLOR[h.level] }]}><View style={[s.dot, { backgroundColor: LEVEL_COLOR[h.level] }]} /><Text style={[s.chipText, { color: LEVEL_COLOR[h.level] }]}>Recovery {h.score}% · {h.word}</Text></View>;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow: { color: colors.brandBright, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  big: { fontSize: 64, fontWeight: '900', lineHeight: 70, marginTop: 2 }, bigUnit: { fontSize: 22, fontWeight: '800', color: colors.muted }, mid: { fontSize: 36, fontWeight: '900', marginTop: 2 },
  word: { fontSize: 16, fontWeight: '900', marginBottom: 10 }, word2: { color: colors.muted, fontWeight: '800', fontSize: 13, marginBottom: 10 },
  ring: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  track: { height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: 4 }, fill: { height: 12, borderRadius: 6 },
  band: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.28)', borderWidth: 1, borderColor: '#fff', borderRadius: 4 },
  summary: { color: colors.inkSoft, fontSize: 14, lineHeight: 20, marginTop: 12 }, note: { color: colors.muted, fontSize: 12.5, lineHeight: 18, marginTop: 10 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }, moreText: { color: colors.brandBright, fontWeight: '800', fontSize: 13.5 },
  part: { marginBottom: 12 }, partHead: { flexDirection: 'row', justifyContent: 'space-between' }, partLabel: { color: colors.ink, fontWeight: '800', fontSize: 14 }, partPts: { color: colors.muted, fontWeight: '800' }, partDetail: { color: colors.muted, fontSize: 12.5, marginTop: 4, lineHeight: 17 },
  calTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: 8 }, calBody: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1 }, dot: { width: 8, height: 8, borderRadius: 4 }, chipText: { fontWeight: '800', fontSize: 12.5 },
});
