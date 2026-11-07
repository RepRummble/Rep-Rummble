import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { StoryGroup, errorMessage, social } from './api';
import { STORY_THEMES, timeAgo, timeLeft } from './socialLogic';
import { Avatar, ShareCard } from './ui';

/** The row of statuses at the top of the feed: "Your status" first, then friends with unseen ones lit up. */
export function StoriesBar({ groups, onOpen, onAdd }: { groups: StoryGroup[]; onOpen: (index: number) => void; onAdd: () => void }) {
  const mineIndex = groups.findIndex((g) => g.isMe);
  const mine = mineIndex >= 0 ? groups[mineIndex] : null;
  const others = groups.map((g, i) => ({ g, i })).filter((x) => !x.g.isMe);
  return (
    <FlatList
      horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 14, paddingVertical: 4 }}
      data={[{ key: 'me' }, ...others.map((o) => ({ key: o.g.author._id, ...o }))] as any[]}
      keyExtractor={(x) => x.key}
      renderItem={({ item }) => item.key === 'me' ? (
        <TouchableOpacity style={s.cell} onPress={mine ? () => onOpen(mineIndex) : onAdd} accessibilityRole="button" accessibilityLabel={mine ? 'View your status' : 'Add a status'}>
          <View>
            <Avatar name="You" size={58} ring={mine ? 'seen' : null} />
            <TouchableOpacity style={s.plus} onPress={onAdd} hitSlop={8} accessibilityLabel="Add a status"><Ionicons name="add" size={16} color="#fff" /></TouchableOpacity>
          </View>
          <Text style={s.name} numberOfLines={1}>Your status</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={s.cell} onPress={() => onOpen(item.i)} accessibilityRole="button" accessibilityLabel={`View ${item.g.author.displayName}'s status`}>
          <Avatar name={item.g.author.displayName} size={58} ring={item.g.seen ? 'seen' : 'new'} />
          <Text style={[s.name, !item.g.seen && { color: colors.ink, fontWeight: '800' }]} numberOfLines={1}>{item.g.author.displayName.split(' ')[0]}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const DURATION = 5000;

/** Full-screen status viewer: tap right/left to move, hold to pause, bars show progress. */
export function StoryViewer({ groups, startAt, onClose, onChanged, onReport }: {
  groups: StoryGroup[]; startAt: number | null; onClose: () => void; onChanged: () => void;
  onReport: (authorId: string, authorName: string, storyId: string) => void;
}) {
  const [gi, setGi] = useState(startAt ?? 0);
  const [si, setSi] = useState(0);
  const [viewers, setViewers] = useState<{ _id: string; displayName: string }[] | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const paused = useRef(false);
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => { if (startAt !== null) { setGi(startAt); setSi(0); setViewers(null); } }, [startAt]);
  const group = startAt === null ? null : groups[gi];
  const story = group?.stories[si];

  const next = useCallback(() => {
    if (!group) return;
    setViewers(null);
    if (si < group.stories.length - 1) setSi(si + 1);
    else if (gi < groups.length - 1) { setGi(gi + 1); setSi(0); }
    else { onClose(); onChanged(); }
  }, [group, si, gi, groups.length, onClose, onChanged]);

  const prev = () => { setViewers(null); if (si > 0) setSi(si - 1); else if (gi > 0) { setGi(gi - 1); setSi(0); } };

  useEffect(() => {
    if (!story) return;
    if (!group?.isMe && !story.viewed) social.viewStory(story._id).catch(() => {});
    progress.setValue(0);
    anim.current = Animated.timing(progress, { toValue: 1, duration: DURATION, easing: Easing.linear, useNativeDriver: false });
    anim.current.start(({ finished }) => { if (finished) next(); });
    return () => anim.current?.stop();
  }, [story?._id]);  // eslint-disable-line react-hooks/exhaustive-deps

  const hold = () => { paused.current = true; anim.current?.stop(); };
  const release = () => {
    if (!paused.current) return;
    paused.current = false;
    anim.current = Animated.timing(progress, { toValue: 1, duration: DURATION, easing: Easing.linear, useNativeDriver: false });
    anim.current.start(({ finished }) => { if (finished) next(); });
  };

  if (!group || !story) return null;
  const [c1, c2] = STORY_THEMES[story.theme] ?? STORY_THEMES[0];

  const showViewers = async () => {
    hold();
    try { setViewers(await social.storyViewers(story._id)); } catch (e) { Alert.alert('Could not load', errorMessage(e, 'Try again.')); }
  };
  const remove = () => Alert.alert('Delete this status?', 'It disappears for everyone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await social.deleteStory(story._id); onClose(); onChanged(); } catch (e) { Alert.alert('Could not delete', errorMessage(e, 'Try again.')); } } },
  ]);

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <LinearGradient colors={[c1, c2]} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={s.bars}>
            {group.stories.map((st, i) => (
              <View key={st._id} style={s.barTrack}>
                <Animated.View style={[s.barFill, { width: i < si ? '100%' : i === si ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : '0%' }]} />
              </View>
            ))}
          </View>
          <View style={s.top}>
            <Avatar name={group.author.displayName} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={s.who}>{group.isMe ? 'Your status' : group.author.displayName}</Text>
              <Text style={s.when}>{timeAgo(story.createdAt)} · {timeLeft(story.expiresAt)}</Text>
            </View>
            {group.isMe ? <TouchableOpacity onPress={remove} hitSlop={10} accessibilityLabel="Delete status"><Ionicons name="trash-outline" size={22} color="#fff" /></TouchableOpacity>
              : <TouchableOpacity onPress={() => { hold(); onReport(group.author._id, group.author.displayName, story._id); }} hitSlop={10} accessibilityLabel="Report or block"><Ionicons name="ellipsis-horizontal" size={22} color="#fff" /></TouchableOpacity>}
            <TouchableOpacity onPress={() => { onClose(); onChanged(); }} hitSlop={10} accessibilityLabel="Close"><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
          </View>

          <View style={s.body}>
            {story.kind === 'text' ? <Text style={s.bigText}>{story.text}</Text> : (
              <View style={{ width: '100%', gap: 16 }}>
                <ShareCard kind={story.kind} snapshot={story.snapshot} />
                {story.text ? <Text style={s.caption}>{story.text}</Text> : null}
              </View>
            )}
          </View>

          {/* Tap zones: left goes back, right goes forward, holding pauses. */}
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <View style={s.zones}>
              <Pressable style={{ flex: 1 }} onPress={prev} onPressIn={hold} onPressOut={release} />
              <Pressable style={{ flex: 2 }} onPress={next} onPressIn={hold} onPressOut={release} />
            </View>
          </View>

          {group.isMe ? (
            <TouchableOpacity style={s.seen} onPress={showViewers} accessibilityRole="button">
              <Ionicons name="eye-outline" size={18} color="#fff" /><Text style={s.seenText}>{story.viewCount ?? 0} seen</Text>
            </TouchableOpacity>
          ) : null}
        </SafeAreaView>

        {viewers ? (
          <View style={s.viewersSheet}>
            <View style={s.viewersHead}><Text style={s.viewersTitle}>Seen by {viewers.length}</Text><TouchableOpacity onPress={() => { setViewers(null); release(); }}><Ionicons name="close" size={22} color={colors.ink} /></TouchableOpacity></View>
            {viewers.length === 0 ? <Text style={s.viewersEmpty}>No one yet.</Text> : viewers.map((v) => (
              <View key={v._id} style={s.viewerRow}><Avatar name={v.displayName} size={34} /><Text style={s.viewerName}>{v.displayName}</Text></View>
            ))}
          </View>
        ) : null}
      </LinearGradient>
    </Modal>
  );
}

const s = StyleSheet.create({
  cell: { width: 70, alignItems: 'center', gap: 6 }, name: { fontSize: 11.5, color: colors.muted, fontWeight: '600', maxWidth: 70 },
  plus: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
  bars: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingTop: 8 },
  barTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }, barFill: { height: 3, backgroundColor: '#fff' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  who: { color: '#fff', fontWeight: '800', fontSize: 14.5 }, when: { color: 'rgba(255,255,255,0.75)', fontSize: 11.5, marginTop: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  bigText: { color: '#fff', fontSize: 30, fontWeight: '900', textAlign: 'center', lineHeight: 38 }, caption: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  zones: { flex: 1, flexDirection: 'row', marginTop: 110, marginBottom: 70 },
  seen: { alignSelf: 'center', flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18, marginBottom: 6 }, seenText: { color: '#fff', fontWeight: '800' },
  viewersSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#0a1226', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 36, maxHeight: '55%' },
  viewersHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, viewersTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  viewersEmpty: { color: colors.muted, paddingVertical: 10 }, viewerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }, viewerName: { color: colors.ink, fontWeight: '700', fontSize: 15 },
});
