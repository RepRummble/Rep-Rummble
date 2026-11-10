import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Switch, Linking, Share,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import api from '../../config/api';
import { RootStackParamList } from '../../types';
import { colors } from '../../theme/colors';
import { Eyebrow, GlassCard } from '../../features/mission/ui';
import { levelProgress } from '../../features/mission/missionLogic';
import { saveTargets, useTargets } from '../../features/profile/targetsStore';
import { syncReminders, openPhoneSettings } from '../../services/notifications';
import { REMINDER_COPY, anyEnabled } from '../../features/notifications/notifyLogic';
import {
  ACTIVITY_CHOICES, DIET_CHOICES, GOAL_CHOICES, HistoryRow, NOTIFICATION_CHOICES, canDelete, cleanName, historyToCsv, notificationState,
} from '../../features/profile/profileLogic';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type Sheet = 'edit' | 'goals' | 'notifications' | 'invite' | 'delete' | null;

const SITE = 'https://www.reprummble.com';
const SUPPORT = 'support@reprummble.com';
const VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** What the server says the person saved (from the website or this app). */
interface SavedProfile { goal: string | null; activity: string | null; diets: string[]; notifications: unknown }
interface Referral { code: string; link: string; invited: number; rewarded: number; rewardPercent: number; maxPercent: number; availablePercent: number }

const errorText = (e: unknown, fallback: string) => (e as any)?.response?.data?.message || fallback;

// ── Small building blocks ───────────────────────────────────────────────────────
function Row({ icon, color = colors.brandBright, label, sub, onPress, danger, right, last }: {
  icon: string; color?: string; label: string; sub?: string; onPress?: () => void; danger?: boolean; right?: React.ReactNode; last?: boolean;
}) {
  return (
    <TouchableOpacity style={[st.row, !last && st.rowBorder]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[st.rowIcon, { backgroundColor: (danger ? colors.danger : color) + '22' }]}>
        <Ionicons name={icon as any} size={18} color={danger ? '#ff6b7a' : color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[st.rowLabel, danger && { color: '#ff6b7a' }]}>{label}</Text>
        {sub ? <Text style={st.rowSub}>{sub}</Text> : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={16} color={colors.faint} />}
    </TouchableOpacity>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Eyebrow>{title}</Eyebrow>
      <GlassCard style={{ padding: 0 }}>{children}</GlassCard>
    </View>
  );
}

function SheetFrame({ visible, title, onClose, children, footer }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={st.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.sheetHead}>
          <TouchableOpacity onPress={onClose} style={st.sheetClose} accessibilityLabel="Close"><Ionicons name="chevron-down" size={22} color={colors.muted} /></TouchableOpacity>
          <Text style={st.sheetTitle}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={st.sheetBody} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        {footer ? <View style={st.sheetFoot}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PrimaryButton({ label, onPress, busy, disabled, danger }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean; danger?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={busy || disabled} activeOpacity={0.88} style={{ opacity: disabled ? 0.45 : 1 }}>
      <LinearGradient colors={danger ? ['#9b1c2c', '#d62839'] : ['#d62839', '#ff7a1a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.primary}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryText}>{label}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[st.chip, on && st.chipOn]} activeOpacity={0.8} accessibilityRole="button" accessibilityState={{ selected: on }}>
      {on && <Ionicons name="checkmark" size={14} color="#fff" />}
      <Text style={[st.chipText, on && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Stepper({ label, value, unit, onChange, min, max, step }: { label: string; value: number; unit: string; onChange: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <View style={st.stepRow}>
      <View style={{ flex: 1 }}>
        <Text style={st.rowLabel}>{label}</Text>
        <Text style={st.rowSub}>{value} {unit}</Text>
      </View>
      <TouchableOpacity style={st.stepBtn} onPress={() => onChange(Math.max(min, value - step))} accessibilityLabel={`Less ${label}`}><Ionicons name="remove" size={18} color="#fff" /></TouchableOpacity>
      <TouchableOpacity style={[st.stepBtn, { backgroundColor: colors.brand }]} onPress={() => onChange(Math.min(max, value + step))} accessibilityLabel={`More ${label}`}><Ionicons name="add" size={18} color="#fff" /></TouchableOpacity>
    </View>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, logout, updateUser } = useAuth();
  const { plan, scansUsedToday, chatUsedToday, limits } = useSubscription();
  const targets = useTargets();

  const [sheet, setSheet] = useState<Sheet>(null);
  const [saved, setSaved] = useState<SavedProfile | null>(null);
  const [counts, setCounts] = useState<{ meals: number | null; workouts: number | null }>({ meals: null, workouts: null });
  const [referral, setReferral] = useState<Referral | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Edit sheet
  const [name, setName] = useState('');
  // Goals sheet
  const [goal, setGoal] = useState<string>('');
  const [activity, setActivity] = useState<string>('');
  const [diets, setDiets] = useState<string[]>([]);
  const [tCal, setTCal] = useState(targets.calories);
  const [tPro, setTPro] = useState(targets.protein);
  const [tWater, setTWater] = useState(targets.water);
  // Notifications sheet
  const [notif, setNotif] = useState<Record<string, boolean>>(notificationState(null));
  // Delete sheet
  const [typed, setTyped] = useState('');

  // Refresh what the screen shows every time it comes into view.
  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => {
      const [me, meals, workouts, ref] = await Promise.allSettled([api.get('/auth/me'), api.get('/meals'), api.get('/workouts'), api.get('/referrals/me')]);
      if (!alive) return;
      if (me.status === 'fulfilled') {
        const p = me.value.data?.data?.profile as SavedProfile | undefined;
        if (p) { setSaved(p); setGoal(p.goal ?? ''); setActivity(p.activity ?? ''); setDiets(p.diets ?? []); setNotif(notificationState(p.notifications)); }
      }
      setCounts({
        meals: meals.status === 'fulfilled' ? (meals.value.data?.data ?? []).length : null,
        workouts: workouts.status === 'fulfilled' ? (workouts.value.data?.data ?? []).length : null,
      });
      if (ref.status === 'fulfilled') setReferral((ref.value.data?.data ?? ref.value.data) as Referral);
    })();
    return () => { alive = false; };
  }, []));

  const open = (s: Sheet) => {
    if (s === 'edit') setName(user?.displayName || '');
    if (s === 'goals') { setTCal(targets.calories); setTPro(targets.protein); setTWater(targets.water); }
    if (s === 'delete') setTyped('');
    setSheet(s);
  };
  const close = () => setSheet(null);

  const display = user?.displayName || user?.email?.split('@')[0] || 'Pilot';
  const initial = display[0].toUpperCase();
  const lp = levelProgress(user?.xp || 0);

  // ── Actions (each one really does what it says) ─────────────────────────────
  const saveName = async () => {
    const clean = cleanName(name);
    if (clean.length < 2) return Alert.alert('Name too short', 'Use at least 2 characters.');
    setBusy('edit');
    try {
      await api.put('/auth/profile', { displayName: clean });
      await api.put('/users/profile', { displayName: clean }).catch(() => {});
      updateUser({ displayName: clean });
      close();
    } catch (e) { Alert.alert('Could not save', errorText(e, 'Check your connection and try again.')); } finally { setBusy(null); }
  };

  const saveGoals = async () => {
    setBusy('goals');
    try {
      await api.put('/auth/profile', { goal, activity, diets });
      await saveTargets({ calories: tCal, protein: tPro, water: tWater });
      setSaved((s) => ({ goal, activity, diets, notifications: s?.notifications ?? null }));
      close();
    } catch (e) { Alert.alert('Could not save', errorText(e, 'Check your connection and try again.')); } finally { setBusy(null); }
  };

  const saveNotifications = async () => {
    setBusy('notif');
    try {
      await api.put('/auth/profile', { notifications: notif });
      close();
      // Make the reminders real on this phone. The phone asks for permission the first time one is switched on.
      const status = await syncReminders({ prefs: notif, ask: true });
      if (status === 'denied') Alert.alert('Reminders are blocked', 'Your phone is not allowing notifications from Reprummble. Turn them on in Settings to get your reminders.', [{ text: 'Open Settings', onPress: openPhoneSettings }, { text: 'Not now', style: 'cancel' }]);
      else if (status === 'unavailable' && anyEnabled(notif)) Alert.alert('Saved', 'Your choices are saved. Reminders on this phone need the latest version of the app, so they will start after you update it.');
    } catch (e) { Alert.alert('Could not save', errorText(e, 'Check your connection and try again.')); } finally { setBusy(null); }
  };

  const sendReset = () => {
    if (!user?.email) return;
    Alert.alert('Change your password', `We will email a secure link to ${user.email}. Open it to choose a new password.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send link', onPress: async () => {
        setBusy('reset');
        try { await api.post('/auth/forgot-password', { email: user.email }); Alert.alert('Check your inbox', 'If the email is on its way, it can take a minute.'); }
        catch (e) { Alert.alert('Could not send', errorText(e, 'Please try again in a moment.')); } finally { setBusy(null); }
      } },
    ]);
  };

  const exportData = async () => {
    setBusy('export');
    try {
      const res = await api.get('/reports/history?period=historical');
      const rows = (res.data?.data?.rows ?? []) as HistoryRow[];
      if (rows.length === 0) { Alert.alert('Nothing to export yet', 'Log a meal or a workout first, then your history will be here.'); return; }
      await Share.share({ title: 'My Reprummble history', message: historyToCsv(rows) });
    } catch (e) { Alert.alert('Could not export', errorText(e, 'Check your connection and try again.')); } finally { setBusy(null); }
  };

  const shareInvite = async () => {
    if (!referral) return;
    try { await Share.share({ message: `Join me on Reprummble: training, nutrition and recovery in one app. Use my link and we both get ${referral.rewardPercent}% off: ${referral.link}` }); } catch { /* closed */ }
  };
  const shareApp = async () => { try { await Share.share({ message: `Reprummble: training, nutrition and recovery in one app. ${SITE}` }); } catch { /* closed */ } };

  const openUrl = (url: string) => Linking.openURL(url).catch(() => Alert.alert('Could not open the link', url));
  const mail = (subject: string, body = '') => openUrl(`mailto:${SUPPORT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  const reportProblem = () => mail('Problem report', `\n\n—\nApp ${VERSION} · ${Platform.OS} ${Platform.Version}\nAccount: ${user?.email ?? ''}`);

  const confirmLogout = () => Alert.alert('Log out', 'You will need to sign in again to see your data.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: logout },
  ]);

  const deleteAccount = async () => {
    setBusy('delete');
    try {
      await api.delete('/auth/account');
      close();
      Alert.alert('Account deleted', 'Your account and data have been removed.');
      await logout();
    } catch (e) { Alert.alert('Could not delete', errorText(e, 'Nothing was deleted. Check your connection and try again.')); } finally { setBusy(null); }
  };

  const planLabel = plan === 'free' ? 'Free' : plan === 'pro' ? 'Pro' : 'Premium';
  const planSub = plan === 'free' ? `${Math.max(0, limits.aiScansPerDay - scansUsedToday)} scans · ${Math.max(0, limits.chatMessagesPerDay - chatUsedToday)} chats left today` : 'Unlimited scans and chat';
  const goalSummary = saved?.goal ? saved.goal : 'Choose your main goal';

  return (
    <View style={st.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={st.topBar}><Text style={st.title}>Profile</Text></View>

          {/* Identity */}
          <GlassCard glow>
            <View style={st.heroTop}>
              <LinearGradient colors={['#ffb37a', '#ff5a36', '#8f1d2a']} style={st.avatarRing}><View style={st.avatar}><Text style={st.avatarText}>{initial}</Text></View></LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={st.name} numberOfLines={1}>{display}</Text>
                <Text style={st.email} numberOfLines={1}>{user?.email}</Text>
                <Text style={st.rank}>{lp.rank.name.toUpperCase()} · LEVEL {lp.level}</Text>
              </View>
              <TouchableOpacity onPress={() => open('edit')} style={st.editBtn} accessibilityLabel="Edit profile"><Ionicons name="pencil" size={16} color={colors.brandBright} /></TouchableOpacity>
            </View>
            <View style={st.track}><LinearGradient colors={['#ff5a36', '#ff9a4d', '#ffd9a0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[st.fill, { width: `${Math.max(lp.pct, 3)}%` }]} /></View>
            <Text style={st.xpHint}>{lp.xpToNext} XP to Level {lp.level + 1}</Text>
            <View style={st.stats}>
              {[
                { v: user?.xp ?? 0, l: 'Total XP' },
                { v: user?.streak ?? 0, l: 'Day streak' },
                { v: counts.workouts ?? '—', l: 'Workouts' },
                { v: counts.meals ?? '—', l: 'Meals' },
              ].map((x) => (
                <View key={x.l} style={st.stat}><Text style={st.statV}>{x.v}</Text><Text style={st.statL}>{x.l}</Text></View>
              ))}
            </View>
          </GlassCard>

          {/* Quick actions */}
          <View style={st.quick}>
            {[
              { icon: 'person-outline', label: 'Edit', onPress: () => open('edit') },
              { icon: 'gift-outline', label: 'Invite', onPress: () => open('invite') },
              { icon: 'download-outline', label: 'Export', onPress: exportData, busy: busy === 'export' },
              { icon: 'chatbubbles-outline', label: 'Support', onPress: () => navigation.navigate('Chat') },
            ].map((q) => (
              <TouchableOpacity key={q.label} style={st.quickTile} onPress={q.onPress} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={q.label}>
                {q.busy ? <ActivityIndicator color={colors.brandBright} /> : <Ionicons name={q.icon as any} size={22} color={colors.brandBright} />}
                <Text style={st.quickLabel}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Group title="Your plan">
            <Row icon="ribbon-outline" color={colors.warning} label={`${planLabel} plan`} sub={planSub} onPress={() => navigation.navigate('Subscription')} last />
          </Group>

          <Group title="Training and health">
            <Row icon="fitness-outline" color={colors.success} label="Goals and daily targets" sub={goalSummary} onPress={() => open('goals')} />
            <Row icon="watch-outline" color={colors.info} label="Connected devices" sub="Apple Watch, Galaxy Watch, Fitbit, WHOOP, Oura" onPress={() => (navigation as any).navigate('Devices')} />
            <Row icon="notifications-outline" color={colors.accent} label="Notifications" sub="Reminders and reports" onPress={() => open('notifications')} last />
          </Group>

          <Group title="Friends">
            <Row icon="gift-outline" label="Invite friends" sub={referral ? `${referral.invited} joined · ${referral.rewardPercent}% off for you both` : 'Share your link'} onPress={() => open('invite')} />
            <Row icon="people-outline" color={colors.info} label="Friends and challenges" onPress={() => (navigation as any).navigate('Social')} />
            <Row icon="share-social-outline" color={colors.violet} label="Share the app" onPress={shareApp} last />
          </Group>

          <Group title="Privacy and data">
            <Row icon="key-outline" label="Change password" sub="We email you a secure link" onPress={sendReset} right={busy === 'reset' ? <ActivityIndicator color={colors.brandBright} /> : undefined} />
            <Row icon="download-outline" color={colors.success} label="Export my data" sub="Your daily history as a spreadsheet" onPress={exportData} right={busy === 'export' ? <ActivityIndicator color={colors.brandBright} /> : undefined} />
            <Row icon="document-text-outline" color={colors.muted} label="Privacy policy" onPress={() => openUrl(`${SITE}/privacy`)} />
            <Row icon="reader-outline" color={colors.muted} label="Terms of service" onPress={() => openUrl(`${SITE}/terms`)} />
            <Row icon="trash-outline" danger label="Delete my account" sub="Removes your data for good" onPress={() => open('delete')} last />
          </Group>

          <Group title="Help">
            <Row icon="rocket-outline" label="Ask Rumi" sub="Instant answers about plans and training" onPress={() => navigation.navigate('Chat')} />
            <Row icon="mail-outline" color={colors.info} label="Email support" sub={SUPPORT} onPress={() => mail('Reprummble support')} />
            <Row icon="bug-outline" color={colors.warning} label="Report a problem" sub="Opens an email with your app details" onPress={reportProblem} />
            <Row icon="globe-outline" color={colors.muted} label="Open the website" sub="reprummble.com" onPress={() => openUrl(SITE)} last />
          </Group>

          <TouchableOpacity onPress={confirmLogout} activeOpacity={0.8} style={st.logout}>
            <Ionicons name="log-out-outline" size={18} color="#ff6b7a" /><Text style={st.logoutText}>Log out</Text>
          </TouchableOpacity>
          <Text style={st.version}>Reprummble {VERSION}</Text>
        </ScrollView>
      </SafeAreaView>

      {/* Edit profile */}
      <SheetFrame visible={sheet === 'edit'} title="Edit profile" onClose={close} footer={<PrimaryButton label="Save" onPress={saveName} busy={busy === 'edit'} disabled={cleanName(name).length < 2} />}>
        <View style={st.bigAvatarWrap}><LinearGradient colors={['#ffb37a', '#ff5a36', '#8f1d2a']} style={st.bigAvatar}><Text style={st.bigAvatarText}>{(cleanName(name) || display)[0].toUpperCase()}</Text></LinearGradient></View>
        <Text style={st.label}>DISPLAY NAME</Text>
        <TextInput style={st.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.faint} maxLength={30} autoCapitalize="words" />
        <Text style={st.hint}>This is how you appear to friends and on the leaderboard.</Text>
        <Text style={st.label}>EMAIL</Text>
        <View style={[st.input, { justifyContent: 'center' }]}><Text style={{ color: colors.faint, fontSize: 15 }}>{user?.email}</Text></View>
        <Text style={st.hint}>To change your email, write to {SUPPORT}.</Text>
      </SheetFrame>

      {/* Goals */}
      <SheetFrame visible={sheet === 'goals'} title="Goals and targets" onClose={close} footer={<PrimaryButton label="Save goals" onPress={saveGoals} busy={busy === 'goals'} />}>
        <Text style={st.label}>MAIN GOAL</Text>
        <View style={st.chips}>{GOAL_CHOICES.map((g) => <Chip key={g} label={g} on={goal === g} onPress={() => setGoal(goal === g ? '' : g)} />)}</View>
        <Text style={st.label}>ACTIVITY LEVEL</Text>
        <View style={{ gap: 8 }}>{ACTIVITY_CHOICES.map((a) => <Chip key={a} label={a} on={activity === a} onPress={() => setActivity(activity === a ? '' : a)} />)}</View>
        <Text style={st.label}>DIETARY PREFERENCES</Text>
        <View style={st.chips}>{DIET_CHOICES.map((d) => <Chip key={d} label={d} on={diets.includes(d)} onPress={() => setDiets((cur) => cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d])} />)}</View>
        <Text style={st.label}>DAILY TARGETS</Text>
        <GlassCard style={{ marginHorizontal: 0, padding: 14 }}>
          <Stepper label="Calories" value={tCal} unit="kcal" onChange={setTCal} min={1000} max={6000} step={50} />
          <Stepper label="Protein" value={tPro} unit="g" onChange={setTPro} min={20} max={400} step={5} />
          <Stepper label="Water" value={tWater} unit="glasses" onChange={setTWater} min={1} max={20} step={1} />
        </GlassCard>
        <Text style={st.hint}>Your goal and preferences are saved to your account and show on the website too. Daily targets drive your missions and rings on this phone.</Text>
      </SheetFrame>

      {/* Notifications */}
      <SheetFrame visible={sheet === 'notifications'} title="Notifications" onClose={close} footer={<PrimaryButton label="Save preferences" onPress={saveNotifications} busy={busy === 'notif'} />}>
        <GlassCard style={{ marginHorizontal: 0, padding: 0 }}>
          {NOTIFICATION_CHOICES.map((n, i) => (
            <View key={n.key} style={[st.row, i < NOTIFICATION_CHOICES.length - 1 && st.rowBorder]}>
              <View style={{ flex: 1 }}><Text style={st.rowLabel}>{REMINDER_COPY[n.key]?.label ?? n.label}</Text><Text style={st.rowSub}>{REMINDER_COPY[n.key]?.desc ?? n.desc}</Text></View>
              <Switch value={!!notif[n.key]} onValueChange={(v) => setNotif((cur) => ({ ...cur, [n.key]: v }))} trackColor={{ false: 'rgba(255,255,255,0.15)', true: colors.brand }} thumbColor="#fff" />
            </View>
          ))}
        </GlassCard>
        <Text style={st.hint}>Your choices are saved to your account and apply on the website and in the app.</Text>
      </SheetFrame>

      {/* Invite */}
      <SheetFrame visible={sheet === 'invite'} title="Invite friends" onClose={close} footer={<PrimaryButton label="Share my link" onPress={shareInvite} disabled={!referral} />}>
        {referral ? (
          <>
            <GlassCard glow style={{ marginHorizontal: 0, alignItems: 'center' }}>
              <Text style={st.label}>YOUR CODE</Text>
              <Text style={st.code} selectable>{referral.code}</Text>
              <Text style={st.hint} selectable>{referral.link}</Text>
            </GlassCard>
            <View style={st.stats}>
              {[{ v: referral.invited, l: 'Joined' }, { v: referral.rewarded, l: 'Rewarded' }, { v: `${referral.availablePercent}%`, l: 'Discount ready' }, { v: `${referral.maxPercent}%`, l: 'Maximum' }].map((x) => (
                <View key={x.l} style={st.stat}><Text style={st.statV}>{x.v}</Text><Text style={st.statL}>{x.l}</Text></View>
              ))}
            </View>
            <Text style={st.hint}>You each get {referral.rewardPercent}% off your next subscription when a friend joins with your link. Discounts stack up to {referral.maxPercent}%.</Text>
          </>
        ) : <ActivityIndicator color={colors.brandBright} style={{ marginTop: 40 }} />}
      </SheetFrame>

      {/* Delete */}
      <SheetFrame visible={sheet === 'delete'} title="Delete account" onClose={close} footer={<PrimaryButton danger label="Delete my account" onPress={deleteAccount} busy={busy === 'delete'} disabled={!canDelete(typed)} />}>
        <View style={st.warn}><Ionicons name="warning-outline" size={20} color="#ff9aa5" /><Text style={st.warnText}>This cannot be undone. It removes your account, workouts, meals, wearable readings, referral link and friend connections straight away.</Text></View>
        <Text style={st.hint}>Want a copy first? Use Export my data before you delete.</Text>
        <Text style={st.label}>TYPE DELETE TO CONFIRM</Text>
        <TextInput style={st.input} value={typed} onChangeText={setTyped} placeholder="DELETE" placeholderTextColor={colors.faint} autoCapitalize="characters" autoCorrect={false} />
      </SheetFrame>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  title: { fontSize: 28, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },

  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatarRing: { width: 66, height: 66, borderRadius: 33, padding: 2.5, shadowColor: '#ff7a1a', shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  avatar: { flex: 1, borderRadius: 31, backgroundColor: '#0b1226', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '900', color: colors.ink },
  name: { fontSize: 20, fontWeight: '900', color: colors.ink, letterSpacing: -0.3 },
  email: { fontSize: 12, color: colors.muted, marginTop: 2 },
  rank: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, color: colors.brandBright, marginTop: 6 },
  editBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,122,26,0.12)', borderWidth: 1, borderColor: 'rgba(255,122,26,0.35)' },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.09)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  xpHint: { fontSize: 11.5, color: colors.muted, marginTop: 7 },
  stats: { flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statV: { fontSize: 19, fontWeight: '900', color: colors.ink },
  statL: { fontSize: 10, color: colors.muted, fontWeight: '700', letterSpacing: 0.4 },

  quick: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 20 },
  quickTile: { flex: 1, alignItems: 'center', gap: 7, paddingVertical: 14, borderRadius: 18, backgroundColor: 'rgba(10,18,38,0.88)', borderWidth: 1, borderColor: 'rgba(255,190,140,0.2)' },
  quickLabel: { fontSize: 11.5, fontWeight: '800', color: colors.ink, letterSpacing: 0.3 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  rowIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '700', color: colors.ink },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 2 },

  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginTop: 14, paddingVertical: 15, borderRadius: 16, backgroundColor: 'rgba(214,40,57,0.12)', borderWidth: 1, borderColor: 'rgba(214,40,57,0.35)' },
  logoutText: { fontSize: 15, fontWeight: '800', color: '#ff6b7a' },
  version: { textAlign: 'center', color: colors.faint, fontSize: 12, marginTop: 16 },

  sheet: { flex: 1, backgroundColor: '#080d1c' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  sheetClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  sheetBody: { padding: 20, paddingBottom: 30 },
  sheetFoot: { padding: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', backgroundColor: '#080d1c' },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, color: colors.brandBright, marginTop: 22, marginBottom: 10 },
  hint: { fontSize: 12.5, color: colors.muted, lineHeight: 18, marginTop: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 14, paddingVertical: 14, color: colors.ink, fontSize: 16, minHeight: 50 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  chipOn: { backgroundColor: 'rgba(230,57,70,0.28)', borderColor: '#ff5a5a' },
  chipText: { fontSize: 13.5, fontWeight: '600', color: colors.inkSoft },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  stepBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  primary: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
  bigAvatarWrap: { alignItems: 'center', marginTop: 4 },
  bigAvatar: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  bigAvatarText: { fontSize: 40, fontWeight: '900', color: '#fff' },
  code: { fontSize: 30, fontWeight: '900', letterSpacing: 5, color: colors.ink, marginVertical: 8 },
  warn: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, backgroundColor: 'rgba(214,40,57,0.14)', borderWidth: 1, borderColor: 'rgba(255,90,90,0.35)' },
  warnText: { flex: 1, fontSize: 13.5, lineHeight: 20, color: '#ffc2c8' },
});
