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
import { DEV_BYPASS_AUTH } from '../config/devConfig';
import { useSubscription } from '../context/SubscriptionContext';
import { PaywallModal } from './SubscriptionScreen';

import { colors } from '../theme/colors';
// ── Local AI response engine (dev / offline mode) ───────────────────────────

const AI_BANK: Array<{ keys: string[]; replies: string[] }> = [
  {
    keys: ['workout', 'exercise', 'train', 'gym', 'lift', 'squat', 'bench', 'deadlift', 'push', 'pull'],
    replies: [
      "For effective workouts, focus on progressive overload — add weight or reps each week. The big 3 compound lifts (squat, bench, deadlift) give the most bang for your buck. Log your sets in the Workout tab to track PRs!",
      "Consistency beats perfection. A 20-minute workout you actually do beats the perfect 90-minute plan you skip. Use the Workout tab to log today's session and keep your streak alive 🔥",
      "Warm up for 5-10 minutes before lifting and cool down after. This reduces injury risk by up to 50%. Your body will thank you the next morning!",
    ],
  },
  {
    keys: ['protein', 'macro', 'carb', 'fat', 'calorie', 'keto', 'diet', 'eat', 'food', 'meal', 'nutrition'],
    replies: [
      "Aim for 1.6–2.2g of protein per kg of bodyweight daily for muscle growth. Spread it across 3–5 meals. Use the Snap tab to scan your plate for instant macro tracking — it's faster than manually logging!",
      "Carbs aren't the enemy! They're your muscles' primary fuel source. Time them around workouts — eat complex carbs (oats, rice, sweet potato) 1–2 hours before training for peak energy.",
      "Meal timing matters less than total daily intake. Focus on hitting your protein and calorie goals first. Use our AI scanner to make tracking effortless.",
    ],
  },
  {
    keys: ['sleep', 'recover', 'rest', 'tired', 'fatigue', 'overtraining'],
    replies: [
      "Sleep is when your muscles actually grow! Aim for 7–9 hours. Poor sleep drops testosterone by 15%, spikes cortisol, and tanks recovery. Prioritize sleep as much as your training.",
      "Recovery days aren't wasted days — they're growth days. Active recovery (light walk, stretching, yoga) accelerates muscle repair better than complete rest. Take them seriously!",
    ],
  },
  {
    keys: ['streak', 'habit', 'motivat', 'consist', 'discipline', 'goal'],
    replies: [
      "Streaks rewire your brain's reward circuitry. Your dopamine system fires when you maintain the chain — making the habit self-reinforcing over time. Even a 10-minute session keeps your streak alive. Never break the chain! 🔥",
      "Motivation is unreliable — systems are not. Build your workouts into your schedule like meetings you can't cancel. The first 30 days are the hardest; after that, skipping feels worse than going.",
    ],
  },
  {
    keys: ['weight loss', 'lose weight', 'fat loss', 'cut', 'shred', 'lean', 'slim'],
    replies: [
      "For fat loss: create a 300–500 calorie deficit, keep protein high (2g/kg) to preserve muscle, and combine strength training with cardio. Slow and steady — 0.5–1kg/week is sustainable and more likely to stick.",
      "The scale isn't everything! Muscle weighs more than fat by volume. Measure progress with photos, clothing fit, and energy levels too. Use the macros tracker to stay in your calorie target.",
    ],
  },
  {
    keys: ['bulk', 'gain muscle', 'mass', 'hypertrophy', 'big'],
    replies: [
      "For muscle gain: eat in a 200–300 calorie surplus, hit 1.8–2.2g protein/kg, and focus on progressive overload in your lifts. Train each muscle 2x per week for optimal hypertrophy. Patience is key — muscle takes months, not weeks.",
    ],
  },
  {
    keys: ['water', 'hydrat', 'drink'],
    replies: [
      "Hydration is underrated! Aim for 35ml per kg of bodyweight daily. Even 2% dehydration cuts performance by up to 20%. Drink 500ml of water first thing in the morning before coffee — it kickstarts metabolism and rehydrates you after 8 hours of sleep.",
    ],
  },
  {
    keys: ['challenge', 'compete', 'leaderboard', 'rank', 'friend'],
    replies: [
      "Challenges and friendly competition can boost fitness adherence by up to 40%! Head to the Challenges tab to join active ones or create your own. Nothing beats competing with friends to stay accountable.",
    ],
  },
  {
    keys: ['stress', 'mental', 'anxiety', 'mood', 'depress', 'burnout'],
    replies: [
      "Exercise is one of the most powerful mental health tools available. It reduces cortisol by 26%, boosts serotonin and dopamine naturally. Even a 10-minute walk shifts your mood. If you're burned out, scale back intensity but don't stop moving completely.",
    ],
  },
  {
    keys: ['beginner', 'start', 'new', 'first time', 'never', 'how to'],
    replies: [
      "Welcome to your fitness journey! Start simple: 3 days/week of strength training (full-body workouts work great for beginners) + daily walks. Focus on learning movement patterns before adding heavy weight. Consistency over the first 3 months matters more than anything else.",
      "As a beginner, the most important thing is showing up consistently. Don't worry about the perfect program — any program done consistently beats the perfect plan done sporadically. Log your first workout in the Workout tab now!",
    ],
  },
  {
    keys: ['scan', 'camera', 'snap', 'photo', 'ai'],
    replies: [
      "The Snap feature uses AI Vision to instantly recognize food and calculate nutrition from a photo. Just tap the Snap tab → Scan Meal → point your camera at your plate. It works best with good lighting and when all food items are visible!",
    ],
  },
  {
    keys: ['hello', 'hi', 'hey', 'sup', 'greet'],
    replies: [
      "Hey! I'm your Rep Rummble AI coach 💪 I can help with workout advice, nutrition tips, or anything about the app. What are you working on today?",
      "Hi there! Ready to crush your fitness goals? Ask me anything about training, nutrition, recovery, or how to use any feature in the app!",
    ],
  },
];

const FALLBACKS = [
  "Great question! For personalized advice, I'd need a bit more context. What's your main fitness goal right now — muscle gain, fat loss, endurance, or general health?",
  "I'm your AI fitness coach! Ask me about workouts, nutrition, recovery, sleep, or any feature in the app. I'm here to help you level up 💪",
  "That's interesting! To give you the best advice, could you share what your current fitness routine looks like and what you're trying to improve?",
];

function aiReply(text: string): string {
  const lower = text.toLowerCase();
  for (const group of AI_BANK) {
    if (group.keys.some(k => lower.includes(k))) {
      return group.replies[Math.floor(Math.random() * group.replies.length)];
    }
  }
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}

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
  const [offlineMode, setOfflineMode] = useState(false);
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

      // In dev/offline bypass mode the socket has no real server — use local AI
      if (DEV_BYPASS_AUTH) {
        setOfflineMode(true);
      } else {
        chatSocket.connect();
        chatSocket.joinConversation(sessionId, conversation._id);
        chatSocket.onMessage((msg) => setMessages(prev => [...prev, msg]));
        chatSocket.onTyping((data) => {
          setIsTyping(true);
        });
        chatSocket.onStopTyping(() => setIsTyping(false));
        chatSocket.onConversationResolved(() => setStatus('resolved'));
      }
    } catch {
      setOfflineMode(true);
      setMessages([{
        _id: 'offline-welcome',
        conversationId: 'offline',
        senderType: 'ai',
        senderName: 'AI Coach',
        content: "Hey! I'm your Rep Rummble AI coach 💪 I can help with workouts, nutrition, recovery and anything about the app. What can I help you with?",
        contentType: 'text',
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
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

    if (offlineMode) {
      setIsTyping(true);
      const delay = 700 + Math.random() * 600;
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          _id: `ai-${Date.now()}`,
          conversationId: conversationId || 'offline',
          senderType: 'ai',
          senderName: 'AI Coach',
          content: aiReply(text),
          contentType: 'text',
          createdAt: new Date().toISOString(),
        }]);
      }, delay);
    } else {
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
          <LinearGradient colors={[colors.brand, colors.tealMid]} style={st.avatar}>
            <Ionicons name="sparkles" size={14} color={colors.white} />
          </LinearGradient>
        )}
        <View style={[st.bubble, isUser ? st.bubbleUser : st.bubbleOther]}>
          {!isUser && <Text style={st.senderName}>{item.senderName || 'AI Coach'}</Text>}
          <Text style={[st.msgText, isUser && st.msgTextUser]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={st.container}>
        <ActivityIndicator size="large" color={colors.brand} style={{ marginTop: 60 }} />
        <Text style={st.loadingText}>Starting AI chat...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.container} edges={['top']}>
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
            <LinearGradient colors={[colors.brand, colors.tealMid]} style={st.headerAvatar}>
              <Ionicons name="sparkles" size={18} color={colors.white} />
            </LinearGradient>
            <View style={[st.onlineDot, { backgroundColor: colors.success }]} />
          </View>
          <View>
            <Text style={st.headerTitle}>AI Coach</Text>
            <Text style={st.headerSub}>Rep Rummble · Online</Text>
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
                <LinearGradient colors={[colors.brand, colors.tealMid]} style={st.avatar}>
                  <Ionicons name="sparkles" size={14} color={colors.white} />
                </LinearGradient>
                <View style={st.typingBubble}>
                  <View style={st.typingDots}>
                    <View style={[st.dot, { opacity: 0.4 }]} />
                    <View style={[st.dot, { opacity: 0.65 }]} />
                    <View style={st.dot} />
                  </View>
                </View>
              </View>
            ) : null
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
            placeholder="Ask your AI coach anything..."
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
            <LinearGradient colors={[colors.brand, colors.tealMid]} style={st.sendGrad}>
              {isSending
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Ionicons name="send" size={18} color={colors.white} />}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingText: { color: colors.muted, marginTop: 12, fontSize: 15, textAlign: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: colors.bg },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  headerSub: { fontSize: 11, color: colors.success, marginTop: 1 },

  list: { padding: 16, paddingBottom: 8 },

  row: { flexDirection: 'row', marginBottom: 14, maxWidth: '82%' },
  rowUser: { alignSelf: 'flex-end' },
  rowOther: { alignSelf: 'flex-start', gap: 8 },

  avatar: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 2, flexShrink: 0 },

  bubble: { padding: 12, borderRadius: 18, maxWidth: '100%' },
  bubbleUser: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  senderName: { fontSize: 11, color: colors.brand, fontWeight: '700', marginBottom: 4 },
  msgText: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  msgTextUser: { color: colors.ink },

  systemWrap: { alignItems: 'center', marginVertical: 10 },
  systemMsg: { fontSize: 12, color: colors.faint, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  typingBubble: { backgroundColor: colors.surface, borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
  typingDots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand },

  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  suggestionChip: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  suggestionText: { fontSize: 12, color: colors.brand, fontWeight: '600' },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.surface },
  input: { flex: 1, backgroundColor: colors.surface, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: colors.ink, maxHeight: 120, borderWidth: 1, borderColor: colors.border },
  sendBtn: { marginBottom: 2 },
  sendGrad: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
});
