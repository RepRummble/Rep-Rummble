import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import chatSocket, { ChatMessage } from '../services/chatSocket';
import { useSubscription } from '../context/SubscriptionContext';
import { PaywallModal } from './SubscriptionScreen';

import { colors } from '../theme/colors';
import { ChatSkeleton } from '../components/states/Skeleton';
import SpaceBackground from '../components/fx/SpaceBackground';
import Pilot from '../components/fx/Pilot';
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [status, setStatus] = useState<string>('active');
  const [conversationId, setConversationId] = useState<string | null>(null);
  // Set when the support server cannot be reached. We say so, rather than pretending to answer.
  const [unavailable, setUnavailable] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { canChat, recordChat } = useSubscription();

  useEffect(() => {
    initializeChat();
    return () => { chatSocket.disconnect(); };
  }, []);

  const initializeChat = async () => {
    try {
      const response = await api.post('/chat/start', {
        platform: Platform.OS,
        userName: user?.displayName || user?.email?.split('@')[0],
        userEmail: user?.email,
      });

      const { conversation, sessionId, welcomeMessage } = response.data.data;
      setConversationId(conversation._id);
      setStatus(conversation.status);

      if (welcomeMessage) {
        setMessages([welcomeMessage]);
      }

      setUnavailable(false);
      chatSocket.connect();
      chatSocket.joinConversation(sessionId, conversation._id);
      chatSocket.onMessage((msg) => setMessages(prev => [...prev, msg]));
      chatSocket.onTyping(() => {
        setIsTyping(true);
      });
      chatSocket.onStopTyping(() => setIsTyping(false));
      chatSocket.onConversationResolved(() => setStatus('resolved'));
    } catch {
      setUnavailable(true);
      setMessages([{
        _id: 'unavailable',
        conversationId: 'none',
        senderType: 'system',
        senderName: 'Reprummble',
        content: "We could not reach Rumi right now. Check your connection and tap send to try again, or email support@reprummble.com.",
        contentType: 'text',
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (unavailable) { setIsLoading(true); setMessages([]); await initializeChat(); return; }
    if (!inputText.trim() || isSending) return;
    if (!canChat()) { setShowPaywall(true); return; }
    const text = inputText.trim();
    setInputText('');
    setIsSending(true);
    recordChat();

    const userMsg: ChatMessage = {
      _id: `u-${Date.now()}`,
      conversationId: conversationId || 'offline',
      senderType: 'user',
      senderName: user?.displayName || 'You',
      content: text,
      contentType: 'text',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    {
      chatSocket.sendMessage(text, user?.displayName || user?.email?.split('@')[0], user?.email);
    }

    setIsSending(false);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.senderType === 'user';
    const isSystem = item.senderType === 'system';

    if (isSystem) {
      return (
        <View style={st.systemWrap}>
          <Text style={st.systemMsg}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View style={[st.row, isUser ? st.rowUser : st.rowOther]}>
        {!isUser && (
          <View style={st.avatar}><Pilot size={30} /></View>
        )}
        <View style={[st.bubble, isUser ? st.bubbleUser : st.bubbleOther]}>
          {!isUser && <Text style={st.senderName}>{(item.senderName === 'AI Coach' || !item.senderName ? 'Rumi' : item.senderName).toUpperCase()}</Text>}
          <Text style={[st.msgText, isUser && st.msgTextUser]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={st.container}>
        <SpaceBackground quiet />
        <ChatSkeleton />
        <Text style={st.loadingText}>Starting AI chat...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <SpaceBackground quiet />
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="Unlimited AI Coach Chat"
        requiredPlan="pro"
      />
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()} style={st.backBtn}>
          <Ionicons name="close" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <View style={st.headerAvatarWrap}>
            <Pilot size={42} />
            <View style={[st.onlineDot, { backgroundColor: colors.success }]} />
          </View>
          <View>
            <Text style={st.headerTitle}>Reprummble Support</Text>
            <Text style={st.headerSub}>Rumi · AI Assistant</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item._id}
          contentContainerStyle={st.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            isTyping ? (
              <View style={st.typingRow}>
                <View style={st.avatar}><Pilot size={30} /></View>
                <View style={st.typingBubble}>
                  <View style={st.typingDots}>
                    <View style={[st.dot, { opacity: 0.4 }]} />
                    <View style={[st.dot, { opacity: 0.65 }]} />
                    <View style={st.dot} />
                    <Text style={st.transmitting}>TRANSMITTING</Text>
                  </View>
                </View>
              </View>
            ) : undefined
          }
        />

        {/* Suggested prompts — show only at start */}
        {messages.length <= 1 && (
          <View style={st.suggestions}>
            {[
              'How do I build muscle fast?',
              'What should I eat after a workout?',
              'How to improve my streak?',
              'Best beginner workout plan?',
            ].map((s, i) => (
              <TouchableOpacity key={i} style={st.suggestionChip} onPress={() => { setInputText(s); }}>
                <Text style={st.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={st.inputRow}>
          <TextInput
            style={st.input}
            placeholder="Transmit a message…"
            placeholderTextColor={colors.borderStrong}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[st.sendBtn, !inputText.trim() && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            <LinearGradient colors={['#d62839', '#ff7a1a']} style={st.sendGrad}>
              {isSending
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Ionicons name="rocket" size={20} color={colors.white} />}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { color: colors.muted, marginTop: 12, fontSize: 15, textAlign: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: colors.bg },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  headerSub: { fontSize: 11, color: '#ffb37a', marginTop: 1, letterSpacing: 0.3 },

  list: { padding: 16, paddingBottom: 8 },

  row: { flexDirection: 'row', marginBottom: 14, maxWidth: '82%' },
  rowUser: { alignSelf: 'flex-end' },
  rowOther: { alignSelf: 'flex-start', gap: 8 },

  avatar: { width: 30, height: 30, marginTop: 2, flexShrink: 0 },

  bubble: { padding: 12, borderRadius: 18, maxWidth: '100%' },
  bubbleUser: { backgroundColor: '#d62839', borderBottomRightRadius: 4, shadowColor: '#ff4d2e', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  bubbleOther: { backgroundColor: 'rgba(12,23,48,0.88)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(77,163,255,0.4)', shadowColor: '#4da3ff', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  senderName: { fontSize: 10.5, color: '#ff9a4d', fontWeight: '800', marginBottom: 4, letterSpacing: 1 },
  msgText: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  msgTextUser: { color: colors.ink },

  systemWrap: { alignItems: 'center', marginVertical: 10 },
  systemMsg: { fontSize: 12, color: colors.faint, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  typingBubble: { backgroundColor: 'rgba(12,23,48,0.88)', borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(77,163,255,0.4)' },
  typingDots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ff7a1a', shadowColor: '#ff7a1a', shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  transmitting: { marginLeft: 6, fontSize: 10, letterSpacing: 1.4, color: colors.muted, fontWeight: '700' },

  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  suggestionChip: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,122,26,0.5)' },
  suggestionText: { fontSize: 12, color: colors.ink, fontWeight: '600' },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' },
  input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: colors.ink, maxHeight: 120, borderWidth: 1, borderColor: colors.border },
  sendBtn: { marginBottom: 2 },
  sendGrad: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
});
