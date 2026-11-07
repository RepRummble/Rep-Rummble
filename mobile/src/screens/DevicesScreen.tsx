import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import SpaceBackground from '../components/fx/SpaceBackground';
import { ListSkeleton } from '../components/states/Skeleton';
import { ErrorState } from '../components/states/StateViews';
import { Eyebrow, GlassCard } from '../features/mission/ui';
import {
  DEVICE_INFO, DEVICE_ORDER, DeviceId, SummaryDay, connectErrorMessage, contributions, latestDay, platformSupport, statusInfo,
} from '../features/devices/devicesLogic';
import { DeviceRow, connectAppleWatch, connectCloud, connectGalaxyWatch, devices, pushAppleWatch, pushGalaxy, refreshPhoneDevices } from '../services/devicesService';
import { openHcSettings } from '../services/healthConnectService';

const TONE = { good: colors.success, warn: colors.warning, bad: colors.danger } as const;
type Busy = { id: DeviceId; what: 'connect' | 'sync' | 'remove' } | null;

/**
 * Every device you can connect, and the ones you have. A device only appears as connected when it
 * has really been signed in (or its data found on this phone), and the numbers shown are ones it reported.
 */
export default function DevicesScreen() {
  const nav = useNavigation<any>();
  const [rows, setRows] = useState<DeviceRow[]>([]);
  const [summary, setSummary] = useState<SummaryDay[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState<Busy>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      let list = await devices.list();
      setRows(list); setState('ready');
      // Bring things up to date quietly: watches on this phone, then the cloud devices (the server skips ones synced a moment ago).
      await refreshPhoneDevices(list);
      await devices.syncAll().catch(() => {});
      list = await devices.list();
      setRows(list);
      setSummary(await devices.summary(3).catch(() => []));
    } catch { setState((s) => (s === 'ready' ? s : 'error')); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const today = latestDay(summary);
  const connected = DEVICE_ORDER.map((id) => rows.find((r) => r.id === id)).filter((r): r is DeviceRow => !!r && !!r.connection);
  const available = DEVICE_ORDER.map((id) => rows.find((r) => r.id === id)).filter((r): r is DeviceRow => !!r && !r.connection);

  const run = async (id: DeviceId, what: NonNullable<Busy>['what'], fn: () => Promise<void>) => {
    setBusy({ id, what });
    try { await fn(); } finally { setBusy(null); await load(); }
  };

  const connect = (r: DeviceRow) => run(r.id, 'connect', async () => {
    const name = DEVICE_INFO[r.id].name;
    if (r.kind === 'cloud') {
      const o = await connectCloud(r.id);
      if (o.status === 'error') Alert.alert(`Could not connect ${name}`, connectErrorMessage(o.code, name));
      return;
    }
    const o = r.id === 'apple_watch' ? await connectAppleWatch() : await connectGalaxyWatch();
    if (o.status === 'connected') return;
    if (o.status === 'no_data') {
      Alert.alert(`No ${name} data found`, r.id === 'apple_watch'
        ? 'Apple Health has nothing recorded by an Apple Watch in the last 7 days. Pair your watch in the Watch app, wear it for a while, make sure Reprummble may read Health data (Settings, Health, Data Access), then try again.'
        : 'Health Connect has no Samsung Health data from the last 7 days. In the Galaxy Wearable app, pair your watch. In Samsung Health, turn on sync with Health Connect. Then try again.');
    } else if (o.status === 'denied') {
      Alert.alert('Permission needed', 'Allow Reprummble to read steps and sleep in Health Connect.', [{ text: 'Open settings', onPress: openHcSettings }, { text: 'Cancel', style: 'cancel' }]);
    } else {
      Alert.alert(`Could not connect ${name}`, platformSupport(r.id, Platform.OS as never).ok ? 'Health data is not available in this build of the app. Install the latest build.' : '');
    }
  });

  const syncNow = (r: DeviceRow) => run(r.id, 'sync', async () => {
    try {
      if (r.kind === 'cloud') await devices.sync(r.id);
      else if (r.id === 'apple_watch') await pushAppleWatch(r.connection!.label);
      else await pushGalaxy(r.connection!.label);
    } catch (e: any) {
      if (e?.response?.status === 409) Alert.alert('Sign in again', `Your ${DEVICE_INFO[r.id].name} sign-in expired. Tap “Sign in again” to keep syncing.`);
      else Alert.alert('Could not sync', 'Check your connection and try again.');
    }
  });

  const remove = (r: DeviceRow) => Alert.alert(`Remove ${DEVICE_INFO[r.id].name}?`,
    r.kind === 'cloud'
      ? `We will tell ${DEVICE_INFO[r.id].name} to stop sharing with Reprummble, delete your sign-in from our servers, and delete the readings we saved from it.`
      : 'We will stop reading this watch and delete the readings we saved from it. Your data stays in your phone’s health app.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => run(r.id, 'remove', async () => {
      try { await devices.remove(r.id); } catch { Alert.alert('Could not remove', 'Check your connection and try again.'); }
    }) }]);

  return (
    <View style={{ flex: 1 }}>
      <SpaceBackground quiet />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.top}>
          <TouchableOpacity onPress={() => nav.goBack()} hitSlop={10} accessibilityLabel="Back"><Ionicons name="chevron-back" size={28} color={colors.ink} /></TouchableOpacity>
          <Text style={s.title}>Devices</Text><View style={{ width: 28 }} />
        </View>

        {state === 'loading' ? <ListSkeleton /> : state === 'error' ? <ErrorState onRetry={load} /> : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.brandBright} />}>
            <Text style={s.lead}>Connect the watch or ring you wear. Reprummble only shows numbers your device reported, and never fills in the gaps.</Text>

            <Eyebrow>{connected.length ? 'Your devices' : 'No devices yet'}</Eyebrow>
            {connected.length === 0 ? <GlassCard><Text style={s.body}>Nothing is connected. Add a device below and its real readings will appear on your Health page and in your recovery insights.</Text></GlassCard> : null}
            {connected.map((r) => {
              const info = DEVICE_INFO[r.id], c = r.connection!, st = statusInfo(c), bits = contributions(today, r.id);
              const working = busy?.id === r.id;
              return (
                <GlassCard key={r.id} glow={c.status === 'connected'}>
                  <View style={s.head}>
                    <View style={[s.icon, { backgroundColor: info.color + '22', borderColor: info.color + '66' }]}><Ionicons name={info.icon as any} size={24} color={info.color} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.name}>{info.name}</Text>
                      <Text style={s.sub} numberOfLines={1}>{c.label}</Text>
                    </View>
                    <View style={[s.pill, { borderColor: TONE[st.tone] }]}><View style={[s.dot, { backgroundColor: TONE[st.tone] }]} /><Text style={[s.pillText, { color: TONE[st.tone] }]}>{st.label}</Text></View>
                  </View>
                  <Text style={s.detail}>{st.detail}</Text>
                  {bits.length ? <View style={s.bits}>{bits.map((b) => <Text key={b} style={s.bit}>{b}</Text>)}</View> : c.status === 'connected' ? <Text style={s.none}>No readings from this device yet today.</Text> : null}
                  <View style={s.actions}>
                    {c.status === 'needs_reauth' && r.kind === 'cloud'
                      ? <Btn label="Sign in again" primary busy={working && busy?.what === 'connect'} onPress={() => connect(r)} />
                      : <Btn label="Sync now" busy={working && busy?.what === 'sync'} onPress={() => syncNow(r)} />}
                    <Btn label="Remove" danger busy={working && busy?.what === 'remove'} onPress={() => remove(r)} />
                  </View>
                </GlassCard>
              );
            })}

            {available.length ? <Eyebrow>Add a device</Eyebrow> : null}
            {available.map((r) => {
              const info = DEVICE_INFO[r.id];
              const support = platformSupport(r.id, Platform.OS as never);
              const off = !support.ok ? support.why : !r.available ? `${info.name} is not switched on for Reprummble yet.` : null;
              return (
                <GlassCard key={r.id} style={off ? { opacity: 0.7 } : undefined}>
                  <View style={s.head}>
                    <View style={[s.icon, { backgroundColor: info.color + '22', borderColor: info.color + '66' }]}><Ionicons name={info.icon as any} size={24} color={info.color} /></View>
                    <View style={{ flex: 1 }}><Text style={s.name}>{info.name}</Text><Text style={s.sub}>{info.gives}</Text></View>
                  </View>
                  <Text style={s.detail}>{off ?? info.how}</Text>
                  {!off ? <View style={s.actions}><Btn label={`Connect ${info.name}`} primary busy={busy?.id === r.id} onPress={() => connect(r)} /></View> : null}
                </GlassCard>
              );
            })}

            <Text style={s.foot}>You are always in control. Removing a device revokes access where the service allows it and deletes the readings we saved from it. You can also remove Reprummble from inside the device’s own app or account settings.</Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function Btn({ label, onPress, primary, danger, busy }: { label: string; onPress: () => void; primary?: boolean; danger?: boolean; busy?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={busy} activeOpacity={0.85} accessibilityRole="button"
      style={[s.btn, primary && { backgroundColor: colors.brand, borderColor: colors.brandBright }, danger && { borderColor: 'rgba(255,107,122,0.5)' }]}>
      {busy ? <ActivityIndicator color={primary ? '#fff' : colors.brandBright} /> : <Text style={[s.btnText, primary && { color: '#fff' }, danger && { color: '#ff6b7a' }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 }, title: { fontSize: 20, fontWeight: '900', color: colors.ink },
  lead: { color: colors.muted, fontSize: 14, lineHeight: 20, marginHorizontal: 22, marginBottom: 6 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 }, icon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.ink, fontSize: 17, fontWeight: '900' }, sub: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1 }, dot: { width: 7, height: 7, borderRadius: 4 }, pillText: { fontWeight: '800', fontSize: 12 },
  detail: { color: colors.inkSoft, fontSize: 13.5, lineHeight: 19, marginTop: 12 },
  bits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }, bit: { color: colors.ink, fontWeight: '800', fontSize: 12.5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  none: { color: colors.faint, fontSize: 12.5, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.05)' }, btnText: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  foot: { color: colors.faint, fontSize: 12, lineHeight: 17, marginHorizontal: 24, marginTop: 4, textAlign: 'center' },
});
