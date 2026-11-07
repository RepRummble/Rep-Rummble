import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import SpaceBackground from '../components/fx/SpaceBackground';
import { ListSkeleton } from '../components/states/Skeleton';
import { ErrorState } from '../components/states/StateViews';
import { Eyebrow, GlassCard } from '../features/mission/ui';
import type { SocialStackParamList } from '../types';
import { DayChallenge, PRESETS, daysLeftLabel, paceLabel } from '../features/challenges/challengeLogic';
import { StatusBar } from '../features/challenges/ui';
import { dayChallenges } from '../services/dayChallengeService';
import { errorMessage } from '../features/social/api';

/** Your challenges, with your bar and your friends' bars side by side. Invitations come first. */
export default function ChallengesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<SocialStackParamList>>();
  const [items, setItems] = useState<DayChallenge[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await dayChallenges.list()); setState('ready'); } catch { setState((s) => (s === 'ready' ? s : 'error')); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const invites = items.filter((c) => c.myStatus === 'invited');
  const active = items.filter((c) => c.myStatus === 'joined' && c.state === 'active');
  const finished = items.filter((c) => c.myStatus === 'joined' && c.state === 'finished');

  const accept = async (c: DayChallenge) => { try { await dayChallenges.accept(c._id); await load(); nav.navigate('ChallengeDetail', { id: c._id }); } catch (e) { Alert.alert('Could not join', errorMessage(e, 'Try again.')); } };
  const decline = async (c: DayChallenge) => { try { await dayChallenges.decline(c._id); await load(); } catch (e) { Alert.alert('Could not decline', errorMessage(e, 'Try again.')); } };

  return (
    <View style={{ flex: 1 }}>
      <SpaceBackground quiet />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.top}>
          <TouchableOpacity onPress={() => nav.goBack()} hitSlop={10} accessibilityLabel="Back"><Ionicons name="chevron-back" size={28} color={colors.ink} /></TouchableOpacity>
          <Text style={s.title}>Challenges</Text>
          <TouchableOpacity onPress={() => nav.navigate('NewChallenge')} hitSlop={10} accessibilityLabel="Start a challenge"><Ionicons name="add-circle-outline" size={28} color={colors.ink} /></TouchableOpacity>
        </View>

        {state === 'loading' ? <ListSkeleton /> : state === 'error' ? <ErrorState onRetry={load} /> : (
          <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.brandBright} />}>

            {invites.length ? <Eyebrow>Invitations</Eyebrow> : null}
            {invites.map((c) => (
              <GlassCard key={c._id} glow>
                <Text style={s.cTitle}>{c.title}</Text>
                <Text style={s.cMeta}>{c.days} days · {paceLabel(c.perWeek)}{c.members.find((m) => m.isMe)?.invitedBy ? ` · from ${c.members.find((m) => m.isMe)?.invitedBy}` : ''}</Text>
                <Text style={s.cMeta}>{c.members.filter((m) => m.status === 'joined').map((m) => m.displayName).join(', ')} already in.</Text>
                <View style={s.actions}>
                  <TouchableOpacity style={s.primary} onPress={() => accept(c)}><Text style={s.primaryText}>Join</Text></TouchableOpacity>
                  <TouchableOpacity style={s.ghost} onPress={() => decline(c)}><Text style={s.ghostText}>Decline</Text></TouchableOpacity>
                </View>
              </GlassCard>
            ))}

            {active.length ? <Eyebrow>{`Active · ${active.length}`}</Eyebrow> : null}
            {active.map((c) => (
              <TouchableOpacity key={c._id} activeOpacity={0.9} onPress={() => nav.navigate('ChallengeDetail', { id: c._id })} accessibilityRole="button">
                <GlassCard>
                  <View style={s.cHead}>
                    <View style={{ flex: 1 }}><Text style={s.cTitle}>{c.title}</Text><Text style={s.cMeta}>Day {c.dayNumber} of {c.days} · {daysLeftLabel(c)} · {paceLabel(c.perWeek)}</Text></View>
                    <Ionicons name="chevron-forward" size={20} color={colors.faint} />
                  </View>
                  {c.members.map((m) => <StatusBar key={m._id} member={m} challenge={c} compact />)}
                </GlassCard>
              </TouchableOpacity>
            ))}

            {items.length === 0 ? (
              <>
                <Eyebrow>Start one</Eyebrow>
                <Text style={s.lead}>Pick a length, choose how often you will train, and invite friends. Your days fill in by themselves when you log a workout.</Text>
              </>
            ) : <Eyebrow>Start a new one</Eyebrow>}
            {PRESETS.map((p) => (
              <TouchableOpacity key={p.days} activeOpacity={0.9} onPress={() => nav.navigate('NewChallenge', { days: p.days })} accessibilityRole="button" style={{ marginHorizontal: 20, marginBottom: 12 }}>
                <LinearGradient colors={[p.color + 'cc', '#0c1730']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.preset}>
                  <Ionicons name={p.icon as any} size={26} color="#fff" />
                  <View style={{ flex: 1 }}><Text style={s.presetName}>{p.name}</Text><Text style={s.presetBlurb}>{p.blurb}</Text></View>
                  <Text style={s.presetDays}>{p.days}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}

            {finished.length ? <Eyebrow>Finished</Eyebrow> : null}
            {finished.map((c) => (
              <TouchableOpacity key={c._id} onPress={() => nav.navigate('ChallengeDetail', { id: c._id })} activeOpacity={0.9}>
                <GlassCard style={{ opacity: 0.85 }}>
                  <View style={s.cHead}><View style={{ flex: 1 }}><Text style={s.cTitle}>{c.title}</Text><Text style={s.cMeta}>{c.days} days · {c.members.find((m) => m.isMe)?.progress?.done ?? 0} of {c.target} days trained</Text></View><Ionicons name="chevron-forward" size={20} color={colors.faint} /></View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 }, title: { fontSize: 20, fontWeight: '900', color: colors.ink },
  lead: { color: colors.muted, fontSize: 14, lineHeight: 20, marginHorizontal: 22, marginBottom: 12 },
  cHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }, cTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' }, cMeta: { color: colors.muted, fontSize: 12.5, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  primary: { flex: 1, height: 44, borderRadius: 14, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  ghost: { height: 44, paddingHorizontal: 20, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }, ghostText: { color: colors.inkSoft, fontWeight: '800' },
  preset: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,190,140,0.25)' },
  presetName: { color: '#fff', fontSize: 17, fontWeight: '900' }, presetBlurb: { color: 'rgba(255,255,255,0.8)', fontSize: 12.5, marginTop: 2 }, presetDays: { color: '#fff', fontSize: 38, fontWeight: '900', opacity: 0.9 },
});
