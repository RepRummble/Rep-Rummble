import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import SpaceBackground from '../components/fx/SpaceBackground';
import type { ShareAttach, SocialStackParamList } from '../types';
import { RecentMeal, RecentWorkout, errorMessage, social } from '../features/social/api';
import { STORY_THEMES, timeAgo } from '../features/social/socialLogic';

type Mode = 'post' | 'status' | 'daily';
const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: 'post', label: 'Post', icon: 'grid-outline' }, { key: 'status', label: 'Status', icon: 'ellipse-outline' }, { key: 'daily', label: 'Post of the day', icon: 'sparkles-outline' },
];

/** Make something to share: a post, a 24-hour status, or the post of the day. Workouts and meals are picked from your real log. */
export default function ComposeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<SocialStackParamList>>();
  const params = useRoute<RouteProp<SocialStackParamList, 'Compose'>>().params;
  const [mode, setMode] = useState<Mode>(params?.mode ?? 'post');
  const [text, setText] = useState('');
  const [theme, setTheme] = useState(0);
  const [attach, setAttach] = useState<ShareAttach | null>(params?.attach ?? null);
  const [workouts, setWorkouts] = useState<RecentWorkout[]>([]);
  const [meals, setMeals] = useState<RecentMeal[]>([]);
  const [streak, setStreak] = useState(0);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState(params?.prompt ?? '');

  useEffect(() => {
    social.recentWorkouts().then(setWorkouts).catch(() => {});
    social.recentMeals().then(setMeals).catch(() => {});
    social.streaks().then((rows) => setStreak(rows.find((r) => r.isMe)?.streak ?? 0)).catch(() => {});
    if (!params?.prompt) social.feed().then((f) => setPrompt(f.daily.prompt)).catch(() => {});
  }, [params?.prompt]);

  // The post of the day is words only; a status can be a card of your streak, workout or meal.
  const canAttach = mode !== 'daily';
  const empty = mode === 'status' ? (!attach && !text.trim()) : mode === 'daily' ? !text.trim() : (!attach && !text.trim());

  const submit = async () => {
    if (empty || busy) return;
    setBusy(true);
    try {
      if (mode === 'daily') await social.createPost({ postType: 'daily', content: text });
      else if (mode === 'post') {
        if (attach?.kind === 'workout') await social.createPost({ postType: 'workout', workoutId: attach.id, content: text });
        else if (attach?.kind === 'meal') await social.createPost({ postType: 'meal', mealId: attach.id, content: text });
        else await social.createPost({ postType: 'general', content: text });
      } else {
        if (attach?.kind === 'workout') await social.createStory({ kind: 'workout', workoutId: attach.id, text, theme });
        else if (attach?.kind === 'meal') await social.createStory({ kind: 'meal', mealId: attach.id, text, theme });
        else if (attach?.kind === 'streak') await social.createStory({ kind: 'streak', text, theme });
        else await social.createStory({ kind: 'text', text, theme });
      }
      nav.popToTop();
    } catch (e) { Alert.alert('Could not share', errorMessage(e, 'Check your connection and try again.')); } finally { setBusy(false); }
  };

  const [c1, c2] = STORY_THEMES[theme];
  const placeholder = mode === 'daily' ? 'Your answer…' : mode === 'status' ? 'What are you up to?' : 'Write something about your training…';

  return (
    <View style={{ flex: 1 }}>
      <SpaceBackground quiet />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.top}>
            <TouchableOpacity onPress={() => nav.goBack()} hitSlop={10} accessibilityLabel="Close"><Ionicons name="close" size={28} color={colors.ink} /></TouchableOpacity>
            <Text style={s.title}>New</Text>
            <TouchableOpacity onPress={submit} disabled={empty || busy} style={[s.share, (empty || busy) && { opacity: 0.4 }]} accessibilityRole="button">
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.shareText}>Share</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
            <View style={s.modes}>
              {MODES.map((m) => (
                <TouchableOpacity key={m.key} style={[s.mode, mode === m.key && s.modeOn]} onPress={() => { setMode(m.key); if (m.key === 'daily') setAttach(null); }} accessibilityRole="button">
                  <Ionicons name={m.icon as any} size={15} color={mode === m.key ? '#fff' : colors.muted} />
                  <Text style={[s.modeText, mode === m.key && { color: '#fff' }]} numberOfLines={1}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.hint}>
              {mode === 'post' ? 'Shows in your friends’ feeds.' : mode === 'status' ? 'Disappears after 24 hours. Friends see who looked.' : 'One a day, the same question for everyone.'}
            </Text>

            {mode === 'daily' && prompt ? (
              <LinearGradient colors={['#c4182f', '#ff7a1a']} style={s.promptBox}><Text style={s.promptEyebrow}>TODAY’S QUESTION</Text><Text style={s.promptText}>{prompt}</Text></LinearGradient>
            ) : null}

            {mode === 'status' && !attach ? (
              <LinearGradient colors={[c1, c2]} style={s.statusBox}>
                <TextInput style={s.statusInput} value={text} onChangeText={setText} placeholder={placeholder} placeholderTextColor="rgba(255,255,255,0.6)" multiline maxLength={140} textAlign="center" />
              </LinearGradient>
            ) : (
              <TextInput style={s.input} value={text} onChangeText={setText} placeholder={placeholder} placeholderTextColor={colors.faint} multiline maxLength={mode === 'status' ? 140 : 500} />
            )}
            <Text style={s.count}>{text.length}/{mode === 'status' ? 140 : 500}</Text>

            {mode === 'status' ? (
              <View style={s.themes}>{STORY_THEMES.map(([a, b], i) => (
                <TouchableOpacity key={i} onPress={() => setTheme(i)} accessibilityLabel={`Colour ${i + 1}`}>
                  <LinearGradient colors={[a, b]} style={[s.theme, theme === i && s.themeOn]} />
                </TouchableOpacity>
              ))}</View>
            ) : null}

            {canAttach ? (
              <View style={{ marginTop: 18 }}>
                <Text style={s.section}>Share your results</Text>
                {attach ? (
                  <View style={s.attached}>
                    <Ionicons name={attach.kind === 'workout' ? 'barbell' : attach.kind === 'meal' ? 'restaurant' : 'flame'} size={18} color={colors.brandBright} />
                    <Text style={s.attachedText} numberOfLines={1}>{attach.label}</Text>
                    <TouchableOpacity onPress={() => setAttach(null)} hitSlop={10} accessibilityLabel="Remove"><Ionicons name="close-circle" size={20} color={colors.muted} /></TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {mode === 'status' && streak > 0 ? (
                      <TouchableOpacity style={s.opt} onPress={() => setAttach({ kind: 'streak', label: `${streak}-day streak` })}>
                        <Ionicons name="flame" size={20} color={colors.accent} /><Text style={s.optText}>My {streak}-day streak</Text><Ionicons name="add" size={20} color={colors.muted} />
                      </TouchableOpacity>
                    ) : null}
                    <Text style={s.subsection}>Recent workouts</Text>
                    {workouts.length === 0 ? <Text style={s.none}>Finish a workout in Train and it shows up here.</Text> : workouts.map((w) => (
                      <TouchableOpacity key={w._id} style={s.opt} onPress={() => setAttach({ kind: 'workout', id: w._id, label: `${w.exercise} · ${w.duration} min` })}>
                        <Ionicons name="barbell" size={20} color={colors.brandBright} />
                        <View style={{ flex: 1 }}><Text style={s.optText} numberOfLines={1}>{w.exercise}</Text><Text style={s.optMeta}>{w.duration} min · {timeAgo(w.timestamp)}</Text></View>
                        <Ionicons name="add" size={20} color={colors.muted} />
                      </TouchableOpacity>
                    ))}
                    <Text style={s.subsection}>Recent meals</Text>
                    {meals.length === 0 ? <Text style={s.none}>Log a meal in Snap and it shows up here.</Text> : meals.map((m) => (
                      <TouchableOpacity key={m._id} style={s.opt} onPress={() => setAttach({ kind: 'meal', id: m._id, label: `${m.foodName} · ${Math.round(m.calories)} kcal` })}>
                        <Ionicons name="restaurant" size={20} color={colors.brandBright} />
                        <View style={{ flex: 1 }}><Text style={s.optText} numberOfLines={1}>{m.foodName}</Text><Text style={s.optMeta}>{Math.round(m.calories)} kcal · {timeAgo(m.timestamp)}</Text></View>
                        <Ionicons name="add" size={20} color={colors.muted} />
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  title: { fontSize: 18, fontWeight: '900', color: colors.ink }, share: { minWidth: 76, height: 38, borderRadius: 19, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }, shareText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  modes: { flexDirection: 'row', gap: 6 },
  mode: { flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  modeOn: { backgroundColor: colors.brand, borderColor: colors.brandBright }, modeText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
  hint: { color: colors.muted, fontSize: 12.5, marginTop: 10, marginBottom: 12 },
  promptBox: { padding: 16, borderRadius: 18, marginBottom: 12 }, promptEyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 10.5, fontWeight: '900', letterSpacing: 1.8 }, promptText: { color: '#fff', fontSize: 19, fontWeight: '900', marginTop: 4, lineHeight: 24 },
  input: { minHeight: 120, borderRadius: 18, padding: 16, fontSize: 16.5, lineHeight: 23, color: colors.ink, backgroundColor: 'rgba(10,18,38,0.88)', borderWidth: 1, borderColor: 'rgba(255,190,140,0.2)', textAlignVertical: 'top' },
  statusBox: { minHeight: 220, borderRadius: 22, padding: 20, alignItems: 'center', justifyContent: 'center' },
  statusInput: { color: '#fff', fontSize: 26, fontWeight: '900', width: '100%', textAlign: 'center' },
  count: { color: colors.faint, fontSize: 11.5, alignSelf: 'flex-end', marginTop: 6 },
  themes: { flexDirection: 'row', gap: 10, marginTop: 10 }, theme: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'transparent' }, themeOn: { borderColor: '#fff' },
  section: { color: colors.ink, fontSize: 17, fontWeight: '900', marginBottom: 6 }, subsection: { color: colors.muted, fontSize: 11.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 14, marginBottom: 6 },
  none: { color: colors.faint, fontSize: 13 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 16, backgroundColor: 'rgba(10,18,38,0.88)', borderWidth: 1, borderColor: 'rgba(255,190,140,0.16)', marginBottom: 8 },
  optText: { flex: 1, color: colors.ink, fontWeight: '800', fontSize: 15 }, optMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  attached: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,90,54,0.12)', borderWidth: 1, borderColor: 'rgba(255,90,54,0.4)' }, attachedText: { flex: 1, color: colors.ink, fontWeight: '800' },
});
