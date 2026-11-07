import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import SpaceBackground from '../components/fx/SpaceBackground';
import type { SocialStackParamList } from '../types';
import { Message, errorMessage, social } from '../features/social/api';
import { timeAgo } from '../features/social/socialLogic';
import { Avatar } from '../features/social/ui';
import ReportSheet, { ReportTarget } from '../features/social/ReportSheet';

const POLL_MS = 5000;

/** One conversation. New messages arrive by checking every few seconds while the screen is open. */
export default function ThreadScreen() {
  const nav = useNavigation<NativeStackNavigationProp<SocialStackParamList>>();
  const { userId, name } = useRoute<RouteProp<SocialStackParamList, 'Thread'>>().params;
  const [messages, setMessages] = useState<Message[]>([]); // newest first, for an inverted list
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const t = await social.thread(userId);
      setMessages([...t.messages].reverse());
      setFailed(null);
      if (t.messages.some((m) => !m.mine && !m.readAt)) social.markRead(userId).catch(() => {});
    } catch (e: any) {
      if (e?.response?.status === 403 || e?.response?.status === 404) setFailed(errorMessage(e, 'You can only message friends.'));
    }
  }, [userId]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try { const m = await social.send(userId, t); setText(''); setMessages((xs) => [m, ...xs]); }
    catch (e) { Alert.alert('Message not sent', errorMessage(e, 'Check your connection and try again.')); } finally { setSending(false); }
  };

  return (
    <View style={{ flex: 1 }}>
      <SpaceBackground quiet />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.top}>
            <TouchableOpacity onPress={() => nav.goBack()} hitSlop={10} accessibilityLabel="Back"><Ionicons name="chevron-back" size={28} color={colors.ink} /></TouchableOpacity>
            <Avatar name={name} size={36} />
            <Text style={s.title} numberOfLines={1}>{name}</Text>
            <TouchableOpacity onPress={() => setReport({ targetType: 'user', targetId: userId, authorId: userId, authorName: name })} hitSlop={10} accessibilityLabel="Report or block"><Ionicons name="ellipsis-horizontal" size={22} color={colors.ink} /></TouchableOpacity>
          </View>

          {failed || blocked ? <Text style={s.note}>{blocked ? 'You blocked this person.' : failed}</Text> : (
            <FlatList
              inverted data={messages} keyExtractor={(m) => m._id} contentContainerStyle={{ padding: 14, gap: 6 }}
              ListEmptyComponent={<Text style={[s.note, { transform: [{ scaleY: -1 }] }]}>Say hi to {name.split(' ')[0]} 👋</Text>}
              renderItem={({ item, index }) => {
                const showTime = index === messages.length - 1 || Math.abs(Date.parse(item.createdAt) - Date.parse(messages[index + 1].createdAt)) > 30 * 60000;
                return (
                  <View>
                    {showTime ? <Text style={s.stamp}>{timeAgo(item.createdAt)}</Text> : null}
                    <TouchableOpacity activeOpacity={0.9} disabled={item.mine}
                      onLongPress={() => setReport({ targetType: 'message', targetId: item._id, authorId: userId, authorName: name })}
                      style={[s.bubble, item.mine ? s.mine : s.theirs]}>
                      <Text style={[s.bubbleText, item.mine && { color: '#fff' }]}>{item.text}</Text>
                    </TouchableOpacity>
                    {item.mine && index === 0 && item.readAt ? <Text style={s.seen}>Seen</Text> : null}
                  </View>
                );
              }}
            />
          )}

          {!failed && !blocked ? (
            <View style={s.inputRow}>
              <TextInput style={s.input} value={text} onChangeText={setText} placeholder="Message…" placeholderTextColor={colors.faint} maxLength={1000} multiline />
              <TouchableOpacity onPress={send} disabled={!text.trim() || sending} style={[s.send, (!text.trim() || sending) && { opacity: 0.4 }]} accessibilityLabel="Send"><Ionicons name="arrow-up" size={22} color="#fff" /></TouchableOpacity>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
      <ReportSheet target={report} onClose={() => setReport(null)} onBlocked={() => { setBlocked(true); setTimeout(() => nav.goBack(), 600); }} />
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  title: { flex: 1, fontSize: 17, fontWeight: '900', color: colors.ink },
  note: { color: colors.muted, textAlign: 'center', padding: 30, flex: 1 },
  stamp: { textAlign: 'center', color: colors.faint, fontSize: 11.5, marginVertical: 8 },
  bubble: { maxWidth: '78%', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.brand, borderBottomRightRadius: 6 }, theirs: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.1)', borderBottomLeftRadius: 6 },
  bubbleText: { color: colors.ink, fontSize: 15.5, lineHeight: 21 }, seen: { alignSelf: 'flex-end', color: colors.faint, fontSize: 11, marginTop: 2, marginRight: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  input: { flex: 1, minHeight: 44, maxHeight: 110, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: 'rgba(255,255,255,0.07)', color: colors.ink, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});
