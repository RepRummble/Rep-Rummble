import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Comment, errorMessage, social } from './api';
import { timeAgo } from './socialLogic';
import { Avatar } from './ui';

/** The comments for one post, in a sheet. Long-press someone else's comment to report it. */
export default function CommentsSheet({ postId, onClose, onCountChange, onReport }: {
  postId: string | null; onClose: () => void; onCountChange: (postId: string, count: number) => void;
  onReport: (authorId: string, authorName: string, commentId: string) => void;
}) {
  const [items, setItems] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!postId) { setItems(null); setText(''); return; }
    let alive = true;
    social.comments(postId).then((c) => alive && setItems(c)).catch((e) => { if (alive) { setItems([]); Alert.alert('Could not load comments', errorMessage(e, 'Try again.')); } });
    return () => { alive = false; };
  }, [postId]);

  if (!postId) return null;
  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await social.addComment(postId, t);
      setText('');
      const fresh = await social.comments(postId);
      setItems(fresh); onCountChange(postId, fresh.length);
    } catch (e) { Alert.alert('Could not post', errorMessage(e, 'Try again.')); } finally { setSending(false); }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.back} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.head}><Text style={s.title}>Comments</Text><TouchableOpacity onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={colors.ink} /></TouchableOpacity></View>
          {items === null ? <ActivityIndicator color={colors.brandBright} style={{ margin: 30 }} /> : (
            <FlatList
              data={items} keyExtractor={(c) => c._id} style={{ maxHeight: 360 }}
              ListEmptyComponent={<Text style={s.empty}>No comments yet. Say something kind.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity activeOpacity={0.8} onLongPress={() => onReport(item.author._id, item.author.displayName, item._id)} style={s.row}>
                  <Avatar name={item.author.displayName} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.who}>{item.author.displayName} <Text style={s.when}>{timeAgo(item.createdAt)}</Text></Text>
                    <Text style={s.text}>{item.content}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
          <View style={s.inputRow}>
            <TextInput style={s.input} value={text} onChangeText={setText} placeholder="Add a comment…" placeholderTextColor={colors.faint} maxLength={500} returnKeyType="send" onSubmitEditing={send} />
            <TouchableOpacity onPress={send} disabled={!text.trim() || sending} style={[s.send, (!text.trim() || sending) && { opacity: 0.4 }]} accessibilityLabel="Post comment"><Ionicons name="send" size={18} color="#fff" /></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0a1226', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, title: { fontSize: 18, fontWeight: '900', color: colors.ink },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 28 },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 9 }, who: { color: colors.ink, fontWeight: '800', fontSize: 13.5 }, when: { color: colors.faint, fontWeight: '500', fontSize: 11.5 }, text: { color: colors.inkSoft, fontSize: 14.5, marginTop: 2, lineHeight: 20 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10 },
  input: { flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.07)', color: colors.ink, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});
