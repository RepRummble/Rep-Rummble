import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import SpaceBackground from '../components/fx/SpaceBackground';
import { ListSkeleton } from '../components/states/Skeleton';
import { ErrorState } from '../components/states/StateViews';
import type { SocialStackParamList } from '../types';
import { Conversation, social } from '../features/social/api';
import { timeAgo } from '../features/social/socialLogic';
import { Avatar, Empty } from '../features/social/ui';

/** Your conversations with friends, newest first. Unread ones are bold with a count. */
export default function MessagesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<SocialStackParamList>>();
  const [items, setItems] = useState<Conversation[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await social.inbox()); setState('ready'); } catch { setState((s) => (s === 'ready' ? s : 'error')); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1 }}>
      <SpaceBackground quiet />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.top}>
          <TouchableOpacity onPress={() => nav.goBack()} hitSlop={10} accessibilityLabel="Back"><Ionicons name="chevron-back" size={28} color={colors.ink} /></TouchableOpacity>
          <Text style={s.title}>Messages</Text>
          <TouchableOpacity onPress={() => nav.navigate('NewMessage')} hitSlop={10} accessibilityLabel="New message"><Ionicons name="create-outline" size={26} color={colors.ink} /></TouchableOpacity>
        </View>
        {state === 'loading' ? <ListSkeleton /> : state === 'error' ? <ErrorState onRetry={load} /> : (
          <FlatList
            data={items} keyExtractor={(c) => c.userId}
            ListEmptyComponent={<Empty icon="paper-plane-outline" title="No messages yet" body="You can message your friends. Tap the pencil to start a conversation." />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.brandBright} />}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.row} onPress={() => nav.navigate('Thread', { userId: item.userId, name: item.displayName })} accessibilityRole="button">
                <Avatar name={item.displayName} size={50} />
                <View style={{ flex: 1 }}>
                  <View style={s.line}><Text style={[s.name, item.unread > 0 && { color: '#fff' }]} numberOfLines={1}>{item.displayName}</Text><Text style={s.when}>{timeAgo(item.lastAt)}</Text></View>
                  <Text style={[s.last, item.unread > 0 && s.lastUnread]} numberOfLines={1}>{item.lastFromMe ? 'You: ' : ''}{item.lastText}</Text>
                </View>
                {item.unread > 0 ? <View style={s.badge}><Text style={s.badgeText}>{item.unread > 9 ? '9+' : item.unread}</Text></View> : null}
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 }, title: { fontSize: 20, fontWeight: '900', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 12 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, name: { flex: 1, color: colors.ink, fontWeight: '800', fontSize: 16 }, when: { color: colors.faint, fontSize: 12 },
  last: { color: colors.muted, fontSize: 14, marginTop: 3 }, lastUnread: { color: colors.ink, fontWeight: '700' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }, badgeText: { color: '#fff', fontSize: 11.5, fontWeight: '900' },
});
