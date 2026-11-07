import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import SpaceBackground from '../components/fx/SpaceBackground';
import { ListSkeleton } from '../components/states/Skeleton';
import { ErrorState } from '../components/states/StateViews';
import { Eyebrow, GlassCard } from '../features/mission/ui';
import type { SocialStackParamList } from '../types';
import { DayChallenge, PRESETS, daysLeftLabel, leader, nextStep, paceLabel, ranked } from '../features/challenges/challengeLogic';
import { Legend, StatusBar, TrackerGrid } from '../features/challenges/ui';
import FriendPicker from '../features/challenges/FriendPicker';
import { dayChallenges } from '../services/dayChallengeService';
import { errorMessage } from '../features/social/api';

/** One challenge: your day-by-day tracker, and everyone's bar so you can see who is ahead. */
export default function ChallengeDetailScreen() {
  const nav = useNavigation<NativeStackNavigationProp<SocialStackParamList>>();
  const { id } = useRoute<RouteProp<SocialStackParamList, 'ChallengeDetail'>>().params;
  const [c, setC] = useState<DayChallenge | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'gone'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setC(await dayChallenges.get(id)); setState('ready'); }
    catch (e: any) { if (e?.response?.status === 404) setState('gone'); else setState((s) => (s === 'ready' ? s : 'error')); }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const me = c?.members.find((m) => m.isMe);
  const preset = PRESETS.find((p) => p.days === c?.days) ?? PRESETS[0];
  const lead = c ? leader(c) : null;

  const sendInvites = async () => {
    if (!c || !picked.length) return;
    setBusy(true);
    try { setC(await dayChallenges.invite(c._id, picked)); setInviting(false); setPicked([]); }
    catch (e) { Alert.alert('Could not invite', errorMessage(e, 'Try again.')); } finally { setBusy(false); }
  };

  const leave = () => Alert.alert('Leave this challenge?', 'Your progress bar disappears for everyone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Leave', style: 'destructive', onPress: async () => { try { await dayChallenges.leave(id); nav.goBack(); } catch (e) { Alert.alert('Could not leave', errorMessage(e, 'Try again.')); } } },
  ]);
  const end = () => Alert.alert('End this challenge for everyone?', 'It is removed for you and your friends. This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'End it', style: 'destructive', onPress: async () => { try { await dayChallenges.end(id); nav.goBack(); } catch (e) { Alert.alert('Could not end', errorMessage(e, 'Try again.')); } } },
  ]);

  return (
    <View style={{ flex: 1 }}>
      <SpaceBackground quiet />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.top}>
          <TouchableOpacity onPress={() => nav.goBack()} hitSlop={10} accessibilityLabel="Back"><Ionicons name="chevron-back" size={28} color={colors.ink} /></TouchableOpacity>
          <Text style={s.title} numberOfLines={1}>{c?.title ?? 'Challenge'}</Text><View style={{ width: 28 }} />
        </View>

        {state === 'loading' ? <ListSkeleton /> : state === 'gone' ? <ErrorState detail="This challenge was ended or you are no longer in it." onRetry={() => nav.goBack()} /> : state === 'error' || !c ? <ErrorState onRetry={load} /> : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.brandBright} />}>

            <LinearGradient colors={[preset.color + 'dd', '#0c1730']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
              <Text style={s.heroEyebrow}>{c.state === 'finished' ? 'FINISHED' : `DAY ${c.dayNumber} OF ${c.days}`}</Text>
              <Text style={s.heroBig}>{me?.progress?.done ?? 0}<Text style={s.heroOf}> / {c.target} days</Text></Text>
              <Text style={s.heroSub}>{paceLabel(c.perWeek)} · {daysLeftLabel(c)}</Text>
              {me?.progress ? <View style={s.heroTrack}><View style={[s.heroFill, { width: `${Math.max(me.progress.pct, 2)}%` }]} /></View> : null}
              <View style={s.heroStats}>
                <View><Text style={s.statV}>{me?.progress?.streak ?? 0}</Text><Text style={s.statL}>day streak</Text></View>
                <View><Text style={s.statV}>{me?.progress?.pct ?? 0}%</Text><Text style={s.statL}>complete</Text></View>
                <View><Text style={s.statV}>{c.members.filter((m) => m.status === 'joined').length}</Text><Text style={s.statL}>people</Text></View>
              </View>
            </LinearGradient>

            <Text style={s.next}>{nextStep(c)}</Text>

            {c.myStatus === 'invited' ? (
              <View style={s.actions}>
                <TouchableOpacity style={s.primary} onPress={async () => { try { setC(await dayChallenges.accept(id)); } catch (e) { Alert.alert('Could not join', errorMessage(e, 'Try again.')); } }}><Text style={s.primaryText}>Join challenge</Text></TouchableOpacity>
                <TouchableOpacity style={s.ghost} onPress={async () => { try { await dayChallenges.decline(id); nav.goBack(); } catch (e) { Alert.alert('Could not decline', errorMessage(e, 'Try again.')); } }}><Text style={s.ghostText}>Decline</Text></TouchableOpacity>
              </View>
            ) : null}

            {me?.progress ? (
              <>
                <Eyebrow>Your days</Eyebrow>
                <GlassCard><TrackerGrid grid={me.progress.grid} size={c.days > 60 ? 16 : 20} /><Legend /></GlassCard>
              </>
            ) : null}

            <Eyebrow right={lead ? `${lead.isMe ? 'You lead' : lead.displayName + ' leads'}` : undefined}>Who is ahead</Eyebrow>
            <GlassCard>
              {ranked(c).map((m) => <StatusBar key={m._id} member={m} challenge={c} />)}
              {c.members.filter((m) => m.status === 'invited').map((m) => <StatusBar key={m._id} member={m} challenge={c} />)}
            </GlassCard>

            {ranked(c).length > 1 ? (
              <>
                <Eyebrow>Everyone’s days</Eyebrow>
                <GlassCard>
                  {ranked(c).map((m, i) => (
                    <View key={m._id} style={i > 0 ? { marginTop: 14 } : undefined}>
                      <Text style={s.gridName}>{m.isMe ? 'You' : m.displayName}</Text>
                      <TrackerGrid grid={m.progress!.grid} size={c.days > 60 ? 9 : 11} />
                    </View>
                  ))}
                </GlassCard>
              </>
            ) : null}

            {c.myStatus === 'joined' && c.state === 'active' ? (
              <TouchableOpacity style={s.invite} onPress={() => setInviting(true)} accessibilityRole="button"><Ionicons name="person-add-outline" size={18} color={colors.brandBright} /><Text style={s.inviteText}>Invite friends</Text></TouchableOpacity>
            ) : null}
            {c.myStatus === 'joined' ? (
              <TouchableOpacity style={s.leave} onPress={c.isCreator ? end : leave} accessibilityRole="button"><Text style={s.leaveText}>{c.isCreator ? 'End challenge for everyone' : 'Leave challenge'}</Text></TouchableOpacity>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>

      <Modal visible={inviting} transparent animationType="slide" onRequestClose={() => setInviting(false)}>
        <View style={s.back}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setInviting(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHead}><Text style={s.sheetTitle}>Invite friends</Text><TouchableOpacity onPress={() => setInviting(false)}><Ionicons name="close" size={24} color={colors.ink} /></TouchableOpacity></View>
            <ScrollView style={{ maxHeight: 360 }}><FriendPicker selected={picked} onChange={setPicked} exclude={c?.members.map((m) => m._id) ?? []} /></ScrollView>
            <TouchableOpacity style={[s.primary, { marginTop: 12, opacity: picked.length ? 1 : 0.4 }]} disabled={!picked.length || busy} onPress={sendInvites}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Send {picked.length || ''} invite{picked.length === 1 ? '' : 's'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 }, title: { fontSize: 19, fontWeight: '900', color: colors.ink, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  hero: { marginHorizontal: 20, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,190,140,0.3)' },
  heroEyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '900', letterSpacing: 2 }, heroBig: { color: '#fff', fontSize: 52, fontWeight: '900', marginTop: 4, lineHeight: 58 }, heroOf: { fontSize: 18, fontWeight: '700', opacity: 0.85 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 13.5, marginTop: 2 },
  heroTrack: { height: 12, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.3)', marginTop: 14, overflow: 'hidden' }, heroFill: { height: 12, borderRadius: 6, backgroundColor: '#fff' },
  heroStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }, statV: { color: '#fff', fontSize: 22, fontWeight: '900' }, statL: { color: 'rgba(255,255,255,0.75)', fontSize: 11.5, fontWeight: '700' },
  next: { color: colors.inkSoft, fontSize: 14, fontWeight: '700', textAlign: 'center', marginHorizontal: 24, marginTop: 14, marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 8 },
  primary: { flex: 1, height: 48, borderRadius: 14, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontWeight: '900', fontSize: 15.5 },
  ghost: { height: 48, paddingHorizontal: 22, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }, ghostText: { color: colors.inkSoft, fontWeight: '800' },
  gridName: { color: colors.inkSoft, fontWeight: '800', fontSize: 13, marginBottom: 6 },
  invite: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginTop: 4, height: 48, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,154,77,0.5)', backgroundColor: 'rgba(255,122,26,0.1)' }, inviteText: { color: colors.brandBright, fontWeight: '900', fontSize: 15 },
  leave: { alignItems: 'center', padding: 18 }, leaveText: { color: '#ff6b7a', fontWeight: '800', fontSize: 14 },
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0a1226', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, sheetTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
});
