import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import {
  getAvailability, getLast7Days, getTodayHealth, requestHealthPermissions, syncToServer,
  type HealthAvailability, type HealthDay, type HealthToday,
} from '../services/healthService';
import { Eyebrow, GlassCard } from '../features/mission/ui';
import { STEP_GOAL, hoursLabel, observations, sleepBars, spo2Percent } from '../features/health/healthLogic';

const UNAVAILABLE: Record<Exclude<HealthAvailability, { ok: true }>['reason'], string> = {
  'expo-go': 'Apple Health needs the Reprummble app build. It cannot run inside Expo Go.',
  'not-ios': 'Health data comes from Apple Health, which is only on iPhone. Android support through Health Connect is not available yet.',
  'unsupported-device': 'This device does not support Apple Health (some iPads do not).',
  'module-missing': 'The Apple Health module is not in this build. Install the latest build of the app.',
};

const timeOf = (d: Date | null) => (d ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—');
const STAGE_COLOR = { deep: '#4da3ff', rem: '#a07cff', core: '#7a8cff', awake: '#ff9a4d' } as const;

/** Reads Apple Health. Nothing here is a sample: with no reading, the screen says so. */
function useHealth() {
  const availability = useMemo(getAvailability, []);
  const [today, setToday] = useState<HealthToday | null>(null);
  const [week, setWeek] = useState<HealthDay[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!availability.ok) return;
    setStatus('loading');
    try {
      await requestHealthPermissions();
      const [t, w] = await Promise.all([getTodayHealth(), getLast7Days()]);
      setToday(t); setWeek(w); setLastSync(new Date()); setStatus('idle');
      if (t) syncToServer(t).catch(() => {});
    } catch { setStatus('error'); }
  }, [availability.ok]);

  useEffect(() => { load(); }, [load]);
  return { availability, today, week, status, lastSync, reload: load };
}

function Metric({ icon, label, value, unit, color = colors.brandBright }: { icon: string; label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <View style={s.metric}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={s.metricV}>{value}{unit ? <Text style={s.metricU}> {unit}</Text> : null}</Text>
      <Text style={s.metricL}>{label}</Text>
    </View>
  );
}

function Bars({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={s.bars}>
      {data.map((d, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          <LinearGradient colors={i === data.length - 1 ? [color, color + 'aa'] : [color + '66', color + '33']} style={{ width: '70%', height: d.value > 0 ? Math.max(5, (d.value / max) * 80) : 4, borderRadius: 5, opacity: d.value > 0 ? 1 : 0.35 }} />
          <Text style={s.barL}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function HealthScreen() {
  const h = useHealth();
  const t = h.today;
  const [refreshing, setRefreshing] = useState(false);

  const obs = t ? observations({ steps: t.steps, sleepHours: t.sleep?.totalHours ?? null, hrv: t.hrv, hrvBaseline: t.hrvBaseline, spo2: t.spo2, restingHR: t.restingHR }) : [];
  const stages = sleepBars(t?.sleep ?? null);

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Health</Text>
            <Text style={s.sub}>{t ? `From Apple Health${t.sources.length ? ` · ${t.sources.join(', ')}` : ''}${h.lastSync ? ` · ${timeOf(h.lastSync)}` : ''}` : 'Your readings from Apple Health'}</Text>
          </View>
          <TouchableOpacity onPress={() => { if (!h.availability.ok) { Alert.alert('Apple Health unavailable', UNAVAILABLE[h.availability.reason]); return; } h.reload(); }} style={s.sync} accessibilityLabel="Sync Apple Health">
            {h.status === 'loading' ? <ActivityIndicator color={colors.brandBright} /> : <Ionicons name="sync-outline" size={18} color={colors.brandBright} />}
            <Text style={s.syncText}>Sync</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await h.reload(); setRefreshing(false); }} tintColor={colors.brand} />}>

          {!h.availability.ok ? (
            <GlassCard glow>
              <Ionicons name="heart-circle-outline" size={44} color={colors.brandBright} />
              <Text style={s.cardTitle}>Connect your health data</Text>
              <Text style={s.cardBody}>{UNAVAILABLE[h.availability.reason]}</Text>
              <Text style={s.cardBody}>Until then this page stays empty rather than showing numbers that are not yours. Your meals, workouts and missions all work without it.</Text>
            </GlassCard>
          ) : !t ? (
            <GlassCard glow>
              {h.status === 'loading' ? <ActivityIndicator color={colors.brandBright} /> : <Ionicons name="heart-circle-outline" size={44} color={colors.brandBright} />}
              <Text style={s.cardTitle}>{h.status === 'error' ? 'Could not read Apple Health' : h.status === 'loading' ? 'Reading Apple Health…' : 'No readings yet'}</Text>
              <Text style={s.cardBody}>Allow Reprummble to read your health data. You can change this any time in Settings, Health, Data Access.</Text>
              <TouchableOpacity onPress={() => Linking.openURL('app-settings:')} style={s.link}><Text style={s.linkText}>Open Settings</Text></TouchableOpacity>
            </GlassCard>
          ) : (
            <>
              <Eyebrow>Today</Eyebrow>
              <GlassCard>
                <View style={s.metrics}>
                  <Metric icon="footsteps-outline" label={`of ${STEP_GOAL.toLocaleString('en-US')} steps`} value={t.steps.toLocaleString('en-US')} />
                  <Metric icon="flame-outline" label="active kcal" value={Math.round(t.activeCalories)} color={colors.accent} />
                  <Metric icon="timer-outline" label="exercise min" value={t.exerciseMinutes} color={colors.success} />
                  <Metric icon="navigate-outline" label="distance" value={t.distanceKm.toFixed(1)} unit="km" color={colors.info} />
                </View>
              </GlassCard>

              {obs.length > 0 && (
                <>
                  <Eyebrow>What your readings say</Eyebrow>
                  <GlassCard>
                    {obs.map((o, i) => (
                      <View key={o.id} style={[s.obs, i > 0 && s.border]}>
                        <Ionicons name={o.icon as any} size={20} color={o.tone === 'warn' ? colors.warning : o.tone === 'good' ? colors.success : colors.brandBright} />
                        <View style={{ flex: 1 }}><Text style={s.obsT}>{o.title}</Text><Text style={s.obsB}>{o.body}</Text></View>
                      </View>
                    ))}
                  </GlassCard>
                </>
              )}

              {(t.heartRate || t.restingHR || t.hrv || t.spo2 || t.breathingRate || t.vo2max) ? (
                <>
                  <Eyebrow>Heart and recovery</Eyebrow>
                  <GlassCard>
                    <View style={s.metrics}>
                      {t.restingHR ? <Metric icon="heart-outline" label="resting heart rate" value={Math.round(t.restingHR)} unit="bpm" color={colors.danger} /> : null}
                      {t.minHR && t.maxHR ? <Metric icon="pulse-outline" label="heart rate range" value={`${Math.round(t.minHR)}–${Math.round(t.maxHR)}`} unit="bpm" color={colors.danger} /> : null}
                      {t.hrv ? <Metric icon="analytics-outline" label={t.hrvBaseline ? `HRV · avg ${Math.round(t.hrvBaseline)}` : 'HRV'} value={Math.round(t.hrv)} unit="ms" color={colors.info} /> : null}
                      {t.spo2 ? <Metric icon="water-outline" label="blood oxygen" value={spo2Percent(t.spo2)} unit="%" color={colors.info} /> : null}
                      {t.breathingRate ? <Metric icon="leaf-outline" label="breathing" value={t.breathingRate.toFixed(1)} unit="/min" color={colors.success} /> : null}
                      {t.vo2max ? <Metric icon="speedometer-outline" label="VO₂ max" value={t.vo2max.toFixed(1)} color={colors.accent} /> : null}
                    </View>
                  </GlassCard>
                </>
              ) : null}

              {t.sleep && t.sleep.totalHours > 0 && (
                <>
                  <Eyebrow right={`${timeOf(t.sleep.start)} – ${timeOf(t.sleep.end)}`}>Last night</Eyebrow>
                  <GlassCard>
                    <Text style={s.sleepTotal}>{hoursLabel(t.sleep.totalHours)}</Text>
                    {stages.length > 0 && (
                      <>
                        <View style={s.stageBar}>{stages.map((b) => <View key={b.key} style={{ flex: b.pct, backgroundColor: STAGE_COLOR[b.key] }} />)}</View>
                        <View style={s.stageLegend}>{stages.map((b) => <View key={b.key} style={s.legendItem}><View style={[s.legendDot, { backgroundColor: STAGE_COLOR[b.key] }]} /><Text style={s.legendText}>{b.label} {hoursLabel(b.hours)}</Text></View>)}</View>
                      </>
                    )}
                  </GlassCard>
                </>
              )}

              {(t.weight || t.bodyFat) && (
                <>
                  <Eyebrow>Body</Eyebrow>
                  <GlassCard><View style={s.metrics}>
                    {t.weight ? <Metric icon="scale-outline" label="weight" value={t.weight.toFixed(1)} unit="kg" /> : null}
                    {t.bodyFat ? <Metric icon="body-outline" label="body fat" value={(t.bodyFat <= 1 ? t.bodyFat * 100 : t.bodyFat).toFixed(1)} unit="%" color={colors.accent} /> : null}
                  </View></GlassCard>
                </>
              )}

              {h.week.length > 0 && (
                <>
                  <Eyebrow>Last 7 days</Eyebrow>
                  <GlassCard>
                    <Text style={s.chartT}>Steps</Text>
                    <Bars data={h.week.map((d) => ({ label: d.day, value: d.steps }))} color={colors.brandBright} />
                    <Text style={[s.chartT, { marginTop: 18 }]}>Sleep (hours)</Text>
                    <Bars data={h.week.map((d) => ({ label: d.day, value: d.sleep }))} color="#7a8cff" />
                  </GlassCard>
                </>
              )}
            </>
          )}

          <Eyebrow>Watches and rings</Eyebrow>
          <GlassCard>
            <Text style={s.cardBody}>Apple Watch, Oura, Whoop, Garmin, Fitbit and Polar share their data through Apple Health. Connect your device's own app to Apple Health, allow it to write, and the readings appear here.</Text>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 }, sub: { fontSize: 12, color: colors.muted, marginTop: 2, maxWidth: 250 },
  sync: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,122,26,0.12)', borderWidth: 1, borderColor: 'rgba(255,122,26,0.35)' },
  syncText: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  cardTitle: { fontSize: 20, fontWeight: '900', color: colors.ink, marginTop: 10 }, cardBody: { fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 8 },
  link: { marginTop: 14, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.brand }, linkText: { color: '#fff', fontWeight: '800' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 }, metric: { width: '50%', gap: 4 },
  metricV: { fontSize: 24, fontWeight: '900', color: colors.ink }, metricU: { fontSize: 13, fontWeight: '700', color: colors.muted }, metricL: { fontSize: 11.5, color: colors.muted, fontWeight: '600' },
  obs: { flexDirection: 'row', gap: 12, paddingVertical: 12 }, border: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  obsT: { fontSize: 14.5, fontWeight: '800', color: colors.ink }, obsB: { fontSize: 12.5, color: colors.inkSoft, marginTop: 3, lineHeight: 18 },
  sleepTotal: { fontSize: 32, fontWeight: '900', color: colors.ink, marginBottom: 12 },
  stageBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  stageLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, legendDot: { width: 8, height: 8, borderRadius: 4 }, legendText: { fontSize: 12, color: colors.inkSoft },
  chartT: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: colors.muted, marginBottom: 8 },
  bars: { flexDirection: 'row', height: 104, alignItems: 'flex-end' }, barL: { fontSize: 10, color: colors.faint, marginTop: 5 },
});
