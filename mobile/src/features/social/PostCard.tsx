import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Post } from './api';
import { streakLabel, timeAgo } from './socialLogic';
import { Avatar, ShareCard } from './ui';

const LABEL: Record<string, string> = { workout: 'shared a workout', meal: 'shared a meal', daily: 'posted today’s post', achievement: 'reached an achievement', milestone: 'hit a milestone', challenge: 'joined a challenge' };

/** One post in the feed: who, what they shared (the real workout or meal), then like, comment and more. */
export default function PostCard({ post, onLike, onComment, onMore }: { post: Post; onLike: () => void; onComment: () => void; onMore: () => void }) {
  const kind = post.postType === 'workout' || post.postType === 'meal' ? post.postType : null;
  return (
    <View style={s.card}>
      <View style={s.head}>
        <Avatar name={post.author.displayName} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={s.who} numberOfLines={1}>{post.mine ? 'You' : post.author.displayName}
            {post.authorStreak > 1 ? <Text style={s.streak}>  🔥 {post.authorStreak}</Text> : null}</Text>
          <Text style={s.meta}>{LABEL[post.postType] ? `${LABEL[post.postType]} · ` : ''}{timeAgo(post.createdAt)}</Text>
        </View>
        <TouchableOpacity onPress={onMore} hitSlop={10} accessibilityRole="button" accessibilityLabel="More options"><Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} /></TouchableOpacity>
      </View>

      {post.postType === 'daily' && post.snapshot?.prompt ? (
        <View style={s.prompt}><Ionicons name="sparkles" size={13} color={colors.brandBright} /><Text style={s.promptText}>{post.snapshot.prompt}</Text></View>
      ) : null}
      {post.content ? <Text style={s.content}>{post.content}</Text> : null}
      {kind && post.snapshot ? <View style={{ marginTop: 10 }}><ShareCard kind={kind} snapshot={post.snapshot} compact /></View> : null}

      <View style={s.actions}>
        <TouchableOpacity style={s.act} onPress={onLike} accessibilityRole="button" accessibilityLabel={post.liked ? 'Unlike' : 'Like'}>
          <Ionicons name={post.liked ? 'heart' : 'heart-outline'} size={24} color={post.liked ? '#ff4d5e' : colors.inkSoft} />
          <Text style={s.actText}>{post.likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.act} onPress={onComment} accessibilityRole="button" accessibilityLabel="Comments">
          <Ionicons name="chatbubble-outline" size={22} color={colors.inkSoft} /><Text style={s.actText}>{post.commentCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export { streakLabel };

const s = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 14, padding: 14, borderRadius: 20, backgroundColor: 'rgba(10,18,38,0.88)', borderWidth: 1, borderColor: 'rgba(255,190,140,0.16)' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  who: { color: colors.ink, fontWeight: '800', fontSize: 15 }, streak: { color: colors.accent, fontWeight: '800', fontSize: 12.5 }, meta: { color: colors.muted, fontSize: 12, marginTop: 1 },
  prompt: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 12, alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(255,122,26,0.12)' },
  promptText: { color: colors.brandBright, fontWeight: '700', fontSize: 12.5, flexShrink: 1 },
  content: { color: colors.inkSoft, fontSize: 15.5, lineHeight: 22, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 22, marginTop: 12 }, act: { flexDirection: 'row', alignItems: 'center', gap: 6 }, actText: { color: colors.inkSoft, fontWeight: '700', fontSize: 14 },
});
