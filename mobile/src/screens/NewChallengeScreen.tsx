import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import SpaceBackground from '../components/fx/SpaceBackground';
import { Eyebrow, GlassCard } from '../features/mission/ui';
import type { SocialStackParamList } from '../types';
import { PACES, PRESETS, createErrorMessage, targetFor } from '../features/challenges/challengeLogic';
import FriendPicker from '../features/challenges/FriendPicker';
import { dayChallenges } from '../services/dayChallengeService';

/** Start a 30, 60 or 90 day challenge, choose how often you will train, and invite friends. */
export default function NewChallengeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<SocialStackParamList>>();
  const params = useRoute<RouteProp<SocialStackParamList, 'NewChallenge'>>().params;
  const [days, setDays] = useState<30 | 60 | 90>(params?.days ?? 30);
  const [perWeek, setPerWeek] = useState<3 | 5 | 7>(5);
  const [title, setTitle] = useState('');
  const [friends, setFriends] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const target = targetFor(days, perWeek);
  const preset = PRESETS.find((p) => p.days === days)!;

  const start = async () => {
    setBusy(true);
    try {
      const c = await dayChallenges.create({ days, perWeek, title: title.trim() || undefined, friendIds: friends });
      nav.replace('ChallengeDetail', { id: c._id });
    } catch (e: any) { Alert.alert('Could not start', createErrorMessage(e?.response?.status, e?.response?.data?.message)); } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1 }}>
      <SpaceBackground quiet />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.top}>
            <TouchableOpacity onPress={() => nav.goBack()} hitSlop={10} accessibilityLabel="Back"><Ionicons name="chevron-back" size={28} color={colors.ink} /></TouchableOpacity>
            <Text style={s.title}>New challenge</Text><View style={{ width: 28 }} />
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Eyebrow>How long?</Eyebrow>
            <View style={s.lengths}>
              {PRESETS.map((p) => (
                <TouchableOpacity key={p.days} style={[s.length, days === p.days && { borderColor: p.color, backgroundColor: p.color + '22' }]} onPress={() => setDays(p.days)} accessibilityRole="button" accessibilityState={{ selected: days === p.days }}>
                  <Text style={[s.lengthNum, days === p.days && { color: '#fff' }]}>{p.days}</Text><Text style={s.lengthLabel}>days</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.blurb}>{preset.name}: {preset.blurb.toLowerCase()}.</Text>

            <Eyebrow>How often will you train?</Eyebrow>
            <View style={{ marginHorizontal: 20, gap: 8 }}>
              {PACES.map((p) => (
                <TouchableOpacity key={p.perWeek} style={[s.pace, perWeek === p.perWeek && s.paceOn]} onPress={() => setPerWeek(p.perWeek)} accessibilityRole="button" accessibilityState={{ selected: perWeek === p.perWeek }}>
                  <View style={{ flex: 1 }}><Text style={s.paceLabel}>{p.label}</Text><Text style={s.paceHint}>{p.hint}</Text></View>
                  <Text style={s.paceTarget}>{targetFor(days, p.perWeek)} days</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.blurb}>To finish, train on {target} of the {days} days. A day counts when you save a workout.</Text>

            <Eyebrow>Name (optional)</Eyebrow>
            <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder={`${days}-day challenge`} placeholderTextColor={colors.faint} maxLength={60} />

            <Eyebrow right={friends.length ? `${friends.length} invited` : undefined}>Invite friends</Eyebrow>
            <GlassCard><FriendPicker selected={friends} onChange={setFriends} /></GlassCard>
            <Text style={s.blurb}>Everyone sees each other’s progress bar. Only friends can be invited.</Text>
          </ScrollView>

          <View style={s.bar}>
            <TouchableOpacity onPress={start} disabled={busy} activeOpacity={0.9} accessibilityRole="button">
              <LinearGradient colors={['#ff7a1a', '#d62839']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.go}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.goText}>Start {days}-day challenge{friends.length ? ` with ${friends.length} friend${friends.length === 1 ? '' : 's'}` : ''}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 }, title: { fontSize: 20, fontWeight: '900', color: colors.ink },
  lengths: { flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  length: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.05)' },
  lengthNum: { fontSize: 34, fontWeight: '900', color: colors.inkSoft }, lengthLabel: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  blurb: { color: colors.muted, fontSize: 13, lineHeight: 18, marginHorizontal: 22, marginTop: 8, marginBottom: 4 },
  pace: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }, paceOn: { borderColor: colors.brand, backgroundColor: 'rgba(255,90,54,0.12)' },
  paceLabel: { color: colors.ink, fontWeight: '800', fontSize: 15.5 }, paceHint: { color: colors.muted, fontSize: 12, marginTop: 2 }, paceTarget: { color: colors.brandBright, fontWeight: '900', fontSize: 14 },
  input: { marginHorizontal: 20, height: 48, borderRadius: 14, paddingHorizontal: 14, color: colors.ink, fontSize: 16, backgroundColor: 'rgba(10,18,38,0.88)', borderWidth: 1, borderColor: 'rgba(255,190,140,0.2)' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 26, backgroundColor: 'rgba(5,10,20,0.96)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  go: { height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, goText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
