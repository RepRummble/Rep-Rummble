import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import SpaceBackground from '../components/fx/SpaceBackground';
import { ListSkeleton } from '../components/states/Skeleton';
import type { SocialStackParamList } from '../types';
import { Friend, Person, errorMessage, social } from '../features/social/api';
import { Avatar, Empty } from '../features/social/ui';
import ReportSheet, { ReportTarget } from '../features/social/ReportSheet';

type Tab = 'friends' | 'requests' | 'find';
type Requests = Awaited<ReturnType<typeof social.requests>>;

/** Friends, requests and finding people in one place, plus the people you have blocked. */
export default function PeopleScreen() {
  const nav = useNavigation<NativeStackNavigationProp<SocialStackParamList>>();
  const initial = useRoute<RouteProp<SocialStackParamList, 'People'>>().params?.tab ?? 'friends';
  const [tab, setTab] = useState<Tab>(initial);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [reqs, setReqs] = useState<Requests>({ requests: [], sent: [] });
  const [blocks, setBlocks] = useState<{ _id: string; displayName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Person[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const [f, r, b] = await Promise.allSettled([social.friends(), social.requests(), social.blocks()]);
    if (f.status === 'fulfilled') setFriends(f.value);
    if (r.status === 'fulfilled') setReqs(r.value);
    if (b.status === 'fulfilled') setBlocks(b.value);
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Search waits for a pause in typing, and ignores answers that arrive late.
  useEffect(() => {
    if (q.trim().length < 2) { setResults(null); setSearching(false); return; }
    setSearching(true);
    const my = ++seq.current;
    const t = setTimeout(async () => {
      try { const r = await social.search(q.trim()); if (my === seq.current) setResults(r); }
      catch { if (my === seq.current) setResults([]); }
      finally { if (my === seq.current) setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const act = async (fn: () => Promise<unknown>, after?: () => void) => {
    try { await fn(); after?.(); await load(); } catch (e) { Alert.alert('Something went wrong', errorMessage(e, 'Please try again.')); }
  };
  const add = (p: Person) => act(() => social.sendRequest(p._id), () => setResults((rs) => rs?.map((x) => x._id === p._id ? { ...x, relation: 'pending_sent' } : x) ?? null));
  const unfriend = (f: Friend) => Alert.alert(`Remove ${f.displayName}?`, 'You will stop seeing each other’s posts and statuses.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => act(() => social.removeFriend(f.friendshipId)) },
  ]);

  const tabs: { key: Tab; label: string; n?: number }[] = [{ key: 'friends', label: 'Friends', n: friends.length }, { key: 'requests', label: 'Requests', n: reqs.requests.length }, { key: 'find', label: 'Find' }];

  return (
    <View style={{ flex: 1 }}>
      <SpaceBackground quiet />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.top}>
          <TouchableOpacity onPress={() => nav.goBack()} hitSlop={10} accessibilityLabel="Back"><Ionicons name="chevron-back" size={28} color={colors.ink} /></TouchableOpacity>
          <Text style={s.title}>People</Text><View style={{ width: 28 }} />
        </View>
        <View style={s.tabs}>
          {tabs.map((t) => (
            <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && s.tabOn]} onPress={() => setTab(t.key)} accessibilityRole="button">
              <Text style={[s.tabText, tab === t.key && { color: '#fff' }]}>{t.label}{t.n ? ` · ${t.n}` : ''}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <ListSkeleton /> : tab === 'friends' ? (
          <FlatList
            data={friends} keyExtractor={(f) => f.id}
            ListEmptyComponent={<Empty icon="people-outline" title="No friends yet" body="Find people by name and send a request. Friends see your posts and statuses." />}
            ListFooterComponent={blocks.length ? (
              <View style={{ marginTop: 20, paddingHorizontal: 18 }}>
                <Text style={s.blockHead}>BLOCKED</Text>
                {blocks.map((b) => (
                  <View key={b._id} style={s.blockRow}><Text style={s.name}>{b.displayName}</Text>
                    <TouchableOpacity onPress={() => act(() => social.unblock(b._id))}><Text style={s.link}>Unblock</Text></TouchableOpacity></View>
                ))}
              </View>
            ) : undefined}
            renderItem={({ item }) => (
              <View style={s.row}>
                <Avatar name={item.displayName} size={46} />
                <View style={{ flex: 1 }}><Text style={s.name}>{item.displayName}</Text>{item.streak > 0 ? <Text style={s.sub}>🔥 {item.streak} day streak</Text> : null}</View>
                <TouchableOpacity onPress={() => nav.navigate('Thread', { userId: item.id, name: item.displayName })} style={s.iconBtn} accessibilityLabel={`Message ${item.displayName}`}><Ionicons name="paper-plane-outline" size={20} color={colors.ink} /></TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert(item.displayName, undefined, [
                  { text: 'Remove friend', onPress: () => unfriend(item) },
                  { text: 'Report or block', style: 'destructive', onPress: () => setReport({ targetType: 'user', targetId: item.id, authorId: item.id, authorName: item.displayName }) },
                  { text: 'Cancel', style: 'cancel' },
                ])} style={s.iconBtn} accessibilityLabel="More"><Ionicons name="ellipsis-horizontal" size={20} color={colors.ink} /></TouchableOpacity>
              </View>
            )}
          />
        ) : tab === 'requests' ? (
          <FlatList
            data={[...reqs.requests.map((r) => ({ kind: 'in' as const, id: r.id, name: r.requester.displayName })), ...reqs.sent.map((r) => ({ kind: 'out' as const, id: r.id, name: r.recipient.displayName }))]}
            keyExtractor={(r) => `${r.kind}-${r.id}`}
            ListEmptyComponent={<Empty icon="mail-open-outline" title="No requests" body="Requests you send and receive show up here." />}
            renderItem={({ item }) => (
              <View style={s.row}>
                <Avatar name={item.name} size={46} />
                <View style={{ flex: 1 }}><Text style={s.name}>{item.name}</Text><Text style={s.sub}>{item.kind === 'in' ? 'wants to be friends' : 'request sent'}</Text></View>
                {item.kind === 'in' ? (
                  <>
                    <TouchableOpacity style={s.primary} onPress={() => act(() => social.accept(item.id))}><Text style={s.primaryText}>Accept</Text></TouchableOpacity>
                    <TouchableOpacity style={s.ghost} onPress={() => act(() => social.decline(item.id))}><Text style={s.ghostText}>Decline</Text></TouchableOpacity>
                  </>
                ) : <TouchableOpacity style={s.ghost} onPress={() => act(() => social.removeFriend(item.id))}><Text style={s.ghostText}>Cancel</Text></TouchableOpacity>}
              </View>
            )}
          />
        ) : (
          <View style={{ flex: 1 }}>
            <View style={s.search}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput style={s.searchInput} value={q} onChangeText={setQ} placeholder="Search by name" placeholderTextColor={colors.faint} autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
              {searching ? <ActivityIndicator color={colors.brandBright} /> : null}
            </View>
            <FlatList
              data={results ?? []} keyExtractor={(p) => p._id} keyboardShouldPersistTaps="handled"
              ListEmptyComponent={results === null ? <Empty icon="search-outline" title="Find your friends" body="Type at least two letters of their name." /> : searching ? undefined : <Empty icon="person-outline" title="No one found" body="Check the spelling. People only appear if their name matches." />}
              renderItem={({ item }) => (
                <View style={s.row}>
                  <Avatar name={item.displayName} size={46} />
                  <Text style={[s.name, { flex: 1 }]}>{item.displayName}</Text>
                  {item.relation === 'none' ? <TouchableOpacity style={s.primary} onPress={() => add(item)}><Text style={s.primaryText}>Add</Text></TouchableOpacity>
                    : item.relation === 'friends' ? <Text style={s.tag}>Friends</Text>
                    : item.relation === 'pending_sent' ? <Text style={s.tag}>Requested</Text>
                    : <TouchableOpacity style={s.primary} onPress={() => setTab('requests')}><Text style={s.primaryText}>Respond</Text></TouchableOpacity>}
                </View>
              )}
            />
          </View>
        )}
      </SafeAreaView>
      <ReportSheet target={report} onClose={() => setReport(null)} onBlocked={load} />
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 }, title: { fontSize: 20, fontWeight: '900', color: colors.ink },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  tabOn: { backgroundColor: colors.brand, borderColor: colors.brandBright }, tabText: { color: colors.inkSoft, fontWeight: '800', fontSize: 13.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 10 },
  name: { color: colors.ink, fontWeight: '800', fontSize: 15.5 }, sub: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' },
  primary: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.brand }, primaryText: { color: '#fff', fontWeight: '900', fontSize: 13.5 },
  ghost: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)' }, ghostText: { color: colors.inkSoft, fontWeight: '800', fontSize: 13 },
  tag: { color: colors.muted, fontWeight: '800', fontSize: 13 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  searchInput: { flex: 1, color: colors.ink, fontSize: 16 },
  blockHead: { color: colors.muted, fontSize: 11.5, fontWeight: '800', letterSpacing: 1.4, marginBottom: 6 }, blockRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }, link: { color: colors.brandBright, fontWeight: '800' },
});
