import React, { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { FeedPage, Post, StoryGroup, errorMessage, social } from '../features/social/api';
import PostCard from '../features/social/PostCard';
import { StoriesBar, StoryViewer } from '../features/social/Stories';
import CommentsSheet from '../features/social/Comments';
import ReportSheet, { ReportTarget } from '../features/social/ReportSheet';
import { Empty, IconButton } from '../features/social/ui';

type Nav = NativeStackNavigationProp<SocialStackParamList, 'SocialFeed'>;

/**
 * The Social home, like Instagram: statuses on top, a post-of-the-day card, then the feed.
 * Messages, people, streaks and challenges are one tap away in the header.
 */
export default function SocialFeedScreen() {
  const nav = useNavigation<Nav>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [daily, setDaily] = useState<FeedPage['daily'] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [unread, setUnread] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [more, setMore] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const loadingMore = useRef(false);

  const load = useCallback(async () => {
    try {
      const [feed, st, un] = await Promise.all([social.feed(), social.stories().catch(() => [] as StoryGroup[]), social.unread().catch(() => 0)]);
      setPosts(feed.posts); setNext(feed.nextBefore); setDaily(feed.daily); setGroups(st); setUnread(un); setState('ready');
    } catch { setState((s) => (s === 'ready' ? s : 'error')); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const loadMore = async () => {
    if (!next || loadingMore.current) return;
    loadingMore.current = true; setMore(true);
    try { const p = await social.feed(next); setPosts((x) => [...x, ...p.posts]); setNext(p.nextBefore); } catch { /* keep what we have */ }
    finally { loadingMore.current = false; setMore(false); }
  };

  const like = async (p: Post) => {
    setPosts((xs) => xs.map((x) => x._id === p._id ? { ...x, liked: !x.liked, likeCount: x.likeCount + (x.liked ? -1 : 1) } : x));
    try { await social.like(p._id); } catch { setPosts((xs) => xs.map((x) => x._id === p._id ? p : x)); }
  };

  const moreFor = (p: Post) => {
    if (p.mine) {
      Alert.alert('Your post', undefined, [
        { text: 'Delete post', style: 'destructive', onPress: () => Alert.alert('Delete this post?', 'This cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async () => { try { await social.deletePost(p._id); setPosts((xs) => xs.filter((x) => x._id !== p._id)); load(); } catch (e) { Alert.alert('Could not delete', errorMessage(e, 'Try again.')); } } },
        ]) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else setReport({ targetType: 'post', targetId: p._id, authorId: p.author._id, authorName: p.author.displayName });
  };

  const header = (
    <View>
      <View style={{ marginTop: 4, marginBottom: 14 }}>
        <StoriesBar groups={groups} onOpen={setViewer} onAdd={() => nav.navigate('Compose', { mode: 'status' })} />
      </View>

      {daily && !daily.posted ? (
        <TouchableOpacity activeOpacity={0.9} onPress={() => nav.navigate('Compose', { mode: 'daily', prompt: daily.prompt })} style={s.dailyWrap} accessibilityRole="button">
          <LinearGradient colors={['#c4182f', '#ff7a1a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.daily}>
            <View style={{ flex: 1 }}>
              <Text style={s.dailyEyebrow}>POST OF THE DAY</Text>
              <Text style={s.dailyPrompt}>{daily.prompt}</Text>
            </View>
            <View style={s.dailyGo}><Ionicons name="arrow-forward" size={20} color="#c4182f" /></View>
          </LinearGradient>
        </TouchableOpacity>
      ) : daily?.posted ? (
        <View style={[s.dailyWrap, s.dailyDone]}><Ionicons name="checkmark-circle" size={18} color={colors.success} /><Text style={s.dailyDoneText}>You posted today’s post. Come back tomorrow.</Text></View>
      ) : null}

      <View style={s.quick}>
        <Quick icon="barbell" label="Share workout" onPress={() => nav.navigate('Compose', { mode: 'post' })} />
        <Quick icon="flame" label="Streaks" onPress={() => nav.navigate('Streaks')} />
        <Quick icon="trophy" label="Challenges" onPress={() => nav.navigate('Challenges')} />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <SpaceBackground quiet />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.top}>
          <Text style={s.title}>Social</Text>
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon="add-circle-outline" label="Create" onPress={() => nav.navigate('Compose')} />
            <IconButton icon="people-outline" label="People" onPress={() => nav.navigate('People')} />
            <IconButton icon="paper-plane-outline" label="Messages" badge={unread} onPress={() => nav.navigate('Messages')} />
          </View>
        </View>

        {state === 'loading' ? <ListSkeleton /> : state === 'error' ? <ErrorState onRetry={load} /> : (
          <FlatList
            data={posts} keyExtractor={(p) => p._id}
            ListHeaderComponent={header}
            renderItem={({ item }) => <PostCard post={item} onLike={() => like(item)} onComment={() => setCommentsFor(item._id)} onMore={() => moreFor(item)} />}
            ListEmptyComponent={<Empty icon="people-circle-outline" title="Your feed is quiet" body="Add friends to see their workouts and meals, or share your own first post." />}
            onEndReached={loadMore} onEndReachedThreshold={0.6}
            ListFooterComponent={more ? <Text style={s.more}>Loading…</Text> : <View style={{ height: 30 }} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brandBright} />}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </SafeAreaView>

      <StoryViewer groups={groups} startAt={viewer} onClose={() => setViewer(null)} onChanged={load}
        onReport={(authorId, authorName, storyId) => { setViewer(null); setReport({ targetType: 'story', targetId: storyId, authorId, authorName }); }} />
      <CommentsSheet postId={commentsFor} onClose={() => setCommentsFor(null)}
        onCountChange={(id, n) => setPosts((xs) => xs.map((x) => x._id === id ? { ...x, commentCount: n } : x))}
        onReport={(authorId, authorName, commentId) => { setCommentsFor(null); setReport({ targetType: 'comment', targetId: commentId, authorId, authorName }); }} />
      <ReportSheet target={report} onClose={() => setReport(null)} onBlocked={load} />
    </View>
  );
}

function Quick({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.q} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon as any} size={20} color={colors.brandBright} /><Text style={s.qText}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 8, paddingTop: 6, paddingBottom: 6 },
  title: { fontSize: 30, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
  dailyWrap: { marginHorizontal: 16, marginBottom: 12 },
  daily: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20 },
  dailyEyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 10.5, fontWeight: '900', letterSpacing: 1.8 }, dailyPrompt: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 4, lineHeight: 23 },
  dailyGo: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dailyDone: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 16, backgroundColor: 'rgba(30,201,138,0.1)', borderWidth: 1, borderColor: 'rgba(30,201,138,0.3)' }, dailyDoneText: { color: colors.inkSoft, fontSize: 13.5, fontWeight: '600', flex: 1 },
  quick: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 14 },
  q: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  qText: { color: colors.ink, fontWeight: '800', fontSize: 12.5 },
  more: { textAlign: 'center', color: colors.muted, padding: 16 },
});
