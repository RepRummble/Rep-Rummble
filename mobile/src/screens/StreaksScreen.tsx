import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import SpaceBackground from '../components/fx/SpaceBackground';
import { ListSkeleton } from '../components/states/Skeleton';
import { ErrorState } from '../components/states/StateViews';
import type { SocialStackParamList } from '../types';
import { StreakRow, social } from '../features/social/api';
import { streakLabel } from '../features/social/socialLogic';
import { Avatar, Empty } from '../features/social/ui';

/** You and your friends ranked by days in a row. A day counts when a workout is logged. */
export default function StreaksScreen() {
  const nav = useNavigation<NativeStackNavigationProp<SocialStackParamList>>();
  const [rows, setRows] = useState<StreakRow[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { try { setRows(await social.streaks()); setState('ready'); } catch { setState((s) => (s === 'ready' ? s : 'error')); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const me = rows.find((r) => r.isMe);

  return (
    <View style={{ flex: 1 }}>
      <SpaceBackground quiet />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.top}>
          <TouchableOpacity onPress={() => nav.goBack()} hitSlop={10} accessibilityLabel="Back"><Ionicons name="chevron-back" size={28} color={colors.ink} /></TouchableOpacity>
          <Text style={s.title}>Streaks</Text><View style={{ width: 28 }} />
        </View>
        {state === 'loading' ? <ListSkeleton /> : state === 'error' ? <ErrorState onRetry={load} /> : (
          <FlatList
            data={rows} keyExtractor={(r) => r._id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.brandBright} />}
            ListHeaderComponent={me ? (
              <LinearGradient colors={['#8f1d2a', '#3a0b16']} style={s.hero}>
                <Ionicons name="flame" size={40} color={colors.accent} />
                <Text style={s.heroNum}>{me.streak}</Text>
                <Text style={s.heroCap}>{me.streak ? streakLabel(me.streak) : 'Log a workout today to start your streak'}</Text>
                {me.streak > 0 ? (
                  <TouchableOpacity style={s.heroBtn} onPress={() => nav.navigate('Compose', { mode: 'status', attach: { kind: 'streak', label: `${me.streak}-day streak` } })} accessibilityRole="button">
                    <Text style={s.heroBtnText}>Share to my status</Text>
                  </TouchableOpacity>
                ) : null}
              </LinearGradient>
            ) : undefined}
            ListEmptyComponent={<Empty icon="flame-outline" title="No streaks yet" body="Log a workout to start yours." />}
            renderItem={({ item, index }) => (
              <View style={[s.row, item.isMe && s.rowMe]}>
                <Text style={s.rank}>{index + 1}</Text>
                <Avatar name={item.displayName} size={40} />
                <Text style={s.name} numberOfLines={1}>{item.isMe ? 'You' : item.displayName}</Text>
                <Ionicons name="flame" size={16} color={item.streak ? colors.accent : colors.faint} /><Text style={[s.days, !item.streak && { color: colors.faint }]}>{item.streak}</Text>
              </View>
            )}
            ListFooterComponent={rows.length <= 1 ? <Text style={s.tip}>Add friends to compare streaks and keep each other going.</Text> : undefined}
            contentContainerStyle={{ paddingBottom: 60 }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 }, title: { fontSize: 20, fontWeight: '900', color: colors.ink },
  hero: { margin: 16, padding: 22, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,150,100,0.35)' },
  heroNum: { fontSize: 64, fontWeight: '900', color: colors.ink, lineHeight: 70 }, heroCap: { color: '#ffd5c4', fontWeight: '800', fontSize: 14, textAlign: 'center' },
  heroBtn: { marginTop: 14, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)' }, heroBtnText: { color: '#fff', fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 16, backgroundColor: 'rgba(10,18,38,0.88)', borderWidth: 1, borderColor: 'rgba(255,190,140,0.14)' },
  rowMe: { borderColor: 'rgba(255,90,54,0.6)' }, rank: { width: 22, textAlign: 'center', color: colors.muted, fontWeight: '900', fontSize: 15 },
  name: { flex: 1, color: colors.ink, fontWeight: '800', fontSize: 15.5 }, days: { color: colors.ink, fontWeight: '900', fontSize: 17, minWidth: 22, textAlign: 'right' },
  tip: { color: colors.muted, textAlign: 'center', padding: 24, fontSize: 13.5 },
});
