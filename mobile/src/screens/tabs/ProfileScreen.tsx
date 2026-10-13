import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Switch,
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSubscription, PLAN_PRICES } from '../../context/SubscriptionContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

import { colors, heroGradient } from '../../theme/colors';
const SW = Dimensions.get('window').width;

type ModalKey = 'editProfile' | 'notifications' | 'fitnessGoals' | 'privacy' | 'help' | 'about' | null;

// ─── Reusable sub-components ────────────────────────────────────────────────

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={sh.header}>
      <TouchableOpacity onPress={onClose} style={sh.closeBtn}>
        <Ionicons name="chevron-down" size={22} color={colors.muted} />
      </TouchableOpacity>
      <Text style={sh.title}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={sh.sectionLabel}>{label}</Text>;
}

function SettingRow({
  icon, iconColor = colors.brand, label, sublabel, onPress, right,
}: {
  icon: string; iconColor?: string; label: string; sublabel?: string;
  onPress?: () => void; right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={sh.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={[sh.rowIcon, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={sh.rowText}>
        <Text style={sh.rowLabel}>{label}</Text>
        {sublabel ? <Text style={sh.rowSub}>{sublabel}</Text> : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={16} color={colors.border} />}
    </TouchableOpacity>
  );
}

function Stepper({ value, onChange, min = 0, max = 99999, step = 1 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <View style={sh.stepper}>
      <TouchableOpacity style={sh.stepBtn} onPress={() => onChange(Math.max(min, value - step))}>
        <Ionicons name="remove" size={18} color={colors.white} />
      </TouchableOpacity>
      <Text style={sh.stepValue}>{value}</Text>
      <TouchableOpacity style={sh.stepBtn} onPress={() => onChange(Math.min(max, value + step))}>
        <Ionicons name="add" size={18} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity style={sh.faqItem} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
      <View style={sh.faqRow}>
        <Text style={sh.faqQ}>{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.faint} />
      </View>
      {open && <Text style={sh.faqA}>{a}</Text>}
    </TouchableOpacity>
  );
}

// ─── Main ProfileScreen ──────────────────────────────────────────────────────

const MENU: { icon: string; label: string; color: string; key: ModalKey }[] = [
  { icon: 'person-outline',           label: 'Edit Profile',       color: colors.brand, key: 'editProfile'   },
  { icon: 'notifications-outline',    label: 'Notifications',      color: colors.accent, key: 'notifications' },
  { icon: 'fitness-outline',          label: 'Fitness Goals',      color: colors.success, key: 'fitnessGoals'  },
  { icon: 'shield-checkmark-outline', label: 'Privacy & Security', color: colors.info, key: 'privacy'       },
  { icon: 'help-circle-outline',      label: 'Help & Support',     color: colors.warning, key: 'help'          },
  { icon: 'information-circle-outline', label: 'About',            color: colors.muted, key: 'about'         },
];

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const PLAN_META = {
  free:    { label: 'Free',    color: colors.muted, icon: 'person-outline',   gradient: [colors.surface, colors.surface] as const },
  pro:     { label: 'Pro',     color: colors.brand, icon: 'sparkles',         gradient: [colors.brandSoft, colors.brandSoft] as const },
  premium: { label: 'Premium', color: colors.warning, icon: 'ribbon',           gradient: [colors.warningSoft, colors.warningSoft] as const },
};

export default function ProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, logout, updateUser } = useAuth();
  const { plan, isProOrAbove, scansUsedToday, chatUsedToday, limits } = useSubscription();
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const planMeta = PLAN_META[plan];

  // Edit Profile state
  const [editName, setEditName] = useState(user?.displayName || '');

  // Notifications state
  const [notif, setNotif] = useState({
    push: true, workoutReminders: true, challenges: true,
    friendActivity: false, weeklySummary: true, newFeatures: false,
  });

  // Fitness Goals state
  const [goals, setGoals] = useState({
    calories: 2000, workouts: 4, steps: 10000, water: 8,
  });

  // Privacy state
  const [privacy, setPrivacy] = useState({
    publicProfile: true, showLeaderboard: true, activityVisible: true,
  });

  // Change password state
  const [passwords, setPasswords] = useState({ current: '', newPw: '', confirm: '' });

  const open = (key: ModalKey) => setActiveModal(key);
  const close = () => setActiveModal(null);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const saveProfile = () => {
    if (editName.trim()) updateUser({ displayName: editName.trim() });
    Alert.alert('Saved!', 'Your profile has been updated.');
    close();
  };

  const saveGoals = () => {
    Alert.alert('Saved!', 'Your fitness goals have been updated.');
    close();
  };

  const changePassword = () => {
    if (!passwords.current) return Alert.alert('Error', 'Enter your current password.');
    if (passwords.newPw.length < 6) return Alert.alert('Error', 'New password must be at least 6 characters.');
    if (passwords.newPw !== passwords.confirm) return Alert.alert('Error', 'Passwords do not match.');
    Alert.alert('Updated!', 'Password changed successfully.');
    setPasswords({ current: '', newPw: '', confirm: '' });
  };

  const xpPerLevel = 100;
  const currentLevelXp = (user?.xp || 0) % xpPerLevel;
  const levelProgress = (currentLevelXp / xpPerLevel) * 100;
  const initial = (user?.displayName || user?.email || 'U')[0].toUpperCase();
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.bg, colors.bg, colors.bg]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── Screen title row ── */}
          <View style={styles.topBar}>
            <Text style={styles.screenTitle}>Profile</Text>
            <TouchableOpacity onPress={() => open('editProfile')} style={styles.editBtn} activeOpacity={0.8}>
              <Ionicons name="pencil-outline" size={15} color={colors.brand} />
            </TouchableOpacity>
          </View>

          {/* ── Hero card ── */}
          <LinearGradient colors={heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <View style={styles.heroGlow} />

            {/* Avatar + Name side by side */}
            <View style={styles.heroTop}>
              <LinearGradient colors={[colors.white + '30', colors.white + '18']} style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </LinearGradient>
              <View style={styles.heroInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.displayName}>{displayName}</Text>
                  <LinearGradient colors={[colors.warning, colors.warning]} style={styles.levelPill}>
                    <Text style={styles.levelPillText}>Lvl {user?.level || 1}</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.email}>{user?.email}</Text>
                <View style={styles.activeBadge}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeText}>Active today</Text>
                </View>
              </View>
            </View>

            {/* XP bar */}
            <View style={styles.xpSection}>
              <View style={styles.xpLabelRow}>
                <Text style={styles.xpLabel}>Level Progress</Text>
                <Text style={styles.xpCount}>{currentLevelXp} / {xpPerLevel} XP</Text>
              </View>
              <View style={styles.xpTrack}>
                <LinearGradient colors={['#5eead4', colors.white]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.xpFill, { width: `${Math.max(levelProgress, 4)}%` }]} />
              </View>
              <Text style={styles.xpHint}>{xpPerLevel - currentLevelXp} XP to Level {(user?.level || 1) + 1}</Text>
            </View>

            {/* 4-stat row inside hero */}
            <View style={styles.heroStats}>
              {[
                { icon: 'star',    color: colors.warning, value: user?.xp || 0,    label: 'Total XP'  },
                { icon: 'flame',   color: colors.accent, value: user?.streak || 0, label: 'Streak'    },
                { icon: 'barbell', color: colors.brand, value: 47,                label: 'Workouts'  },
                { icon: 'trophy',  color: colors.success, value: user?.level || 1,  label: 'Level'     },
              ].map((st, i) => (
                <View key={i} style={styles.heroStat}>
                  <Text style={styles.heroStatVal}>{st.value}</Text>
                  <Text style={styles.heroStatLabel}>{st.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          {/* ── Subscription Card ── */}
          <Text style={styles.groupLabel}>SUBSCRIPTION</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Subscription')} style={{ marginBottom: 20 }}>
            <LinearGradient colors={planMeta.gradient} style={styles.subCard}>
              <View style={styles.subCardLeft}>
                <View style={[styles.subIcon, { backgroundColor: planMeta.color + '25', borderColor: planMeta.color + '50' }]}>
                  <Ionicons name={planMeta.icon as any} size={20} color={planMeta.color} />
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.subPlanName, { color: planMeta.color }]}>{planMeta.label} Plan</Text>
                    {plan === 'free' && (
                      <View style={styles.upgradeTag}>
                        <Text style={styles.upgradeTagText}>Upgrade available</Text>
                      </View>
                    )}
                  </View>
                  {plan === 'free' ? (
                    <Text style={styles.subMeta}>
                      {limits.aiScansPerDay - scansUsedToday} scans · {limits.chatMessagesPerDay - chatUsedToday} chats left today
                    </Text>
                  ) : (
                    <Text style={styles.subMeta}>Unlimited scans & chat · Renews monthly</Text>
                  )}
                </View>
              </View>
              <View style={[styles.subArrow, { backgroundColor: planMeta.color + '20' }]}>
                <Ionicons name="chevron-forward" size={16} color={planMeta.color} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Account settings ── */}
          <Text style={styles.groupLabel}>ACCOUNT</Text>
          <View style={styles.menuCard}>
            {MENU.slice(0, 3).map((item, i) => (
              <View key={item.key}>
                {i > 0 && <View style={styles.divider} />}
                <TouchableOpacity style={styles.menuRow} onPress={() => open(item.key)} activeOpacity={0.7}>
                  <View style={[styles.menuIconWrap, { backgroundColor: item.color + '22' }]}>
                    <Ionicons name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.faint} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* ── More settings ── */}
          <Text style={[styles.groupLabel, { marginTop: 20 }]}>MORE</Text>
          <View style={styles.menuCard}>
            {MENU.slice(3).map((item, i) => (
              <View key={item.key}>
                {i > 0 && <View style={styles.divider} />}
                <TouchableOpacity style={styles.menuRow} onPress={() => open(item.key)} activeOpacity={0.7}>
                  <View style={[styles.menuIconWrap, { backgroundColor: item.color + '22' }]}>
                    <Ionicons name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.faint} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* ── Logout ── */}
          <TouchableOpacity onPress={handleLogout} activeOpacity={0.8} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Rep Rummble v1.0.0</Text>
        </ScrollView>
      </SafeAreaView>

      {/* ════════════════════════════════════════════
          MODAL: Edit Profile
      ════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'editProfile'} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <LinearGradient colors={[colors.surface, colors.surface]} style={sh.sheet}>
          <SheetHeader title="Edit Profile" onClose={close} />
          <ScrollView contentContainerStyle={sh.body}>

            {/* Avatar preview */}
            <View style={sh.avatarCenter}>
              <LinearGradient colors={[colors.brand, colors.tealMid]} style={sh.bigAvatar}>
                <Text style={sh.bigAvatarText}>{(editName || displayName)[0].toUpperCase()}</Text>
              </LinearGradient>
            </View>

            <SectionLabel label="DISPLAY NAME" />
            <TextInput
              style={sh.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={colors.faint}
              maxLength={30}
            />

            <SectionLabel label="EMAIL" />
            <View style={[sh.input, sh.inputDisabled]}>
              <Text style={sh.inputDisabledText}>{user?.email}</Text>
            </View>
            <Text style={sh.hint}>Email cannot be changed here. Contact support to update it.</Text>

            <SectionLabel label="ACCOUNT STATS" />
            <View style={sh.infoCard}>
              <View style={sh.infoRow}>
                <Text style={sh.infoLabel}>Member since</Text>
                <Text style={sh.infoValue}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}</Text>
              </View>
              <View style={sh.infoRow}>
                <Text style={sh.infoLabel}>User ID</Text>
                <Text style={[sh.infoValue, { fontSize: 11, color: colors.faint }]}>{user?._id}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={saveProfile} activeOpacity={0.85}>
              <LinearGradient colors={[colors.brand, colors.tealMid]} style={sh.saveBtn}>
                <Text style={sh.saveBtnText}>Save Changes</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </Modal>

      {/* ════════════════════════════════════════════
          MODAL: Notifications
      ════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'notifications'} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <LinearGradient colors={[colors.surface, colors.surface]} style={sh.sheet}>
          <SheetHeader title="Notifications" onClose={close} />
          <ScrollView contentContainerStyle={sh.body}>

            <SectionLabel label="GENERAL" />
            <View style={sh.card}>
              <SettingRow
                icon="notifications" iconColor={colors.accent} label="Push Notifications" sublabel="Allow all app notifications"
                right={<Switch value={notif.push} onValueChange={v => setNotif(n => ({ ...n, push: v }))} trackColor={{ false: colors.border, true: colors.brand }} thumbColor={colors.white} />}
              />
            </View>

            <SectionLabel label="ACTIVITY" />
            <View style={sh.card}>
              <SettingRow
                icon="barbell-outline" iconColor={colors.success} label="Workout Reminders" sublabel="Daily nudge to stay on track"
                right={<Switch value={notif.workoutReminders} onValueChange={v => setNotif(n => ({ ...n, workoutReminders: v }))} trackColor={{ false: colors.border, true: colors.brand }} thumbColor={colors.white} />}
              />
              <View style={sh.rowDivider} />
              <SettingRow
                icon="trophy-outline" iconColor={colors.warning} label="Challenge Updates" sublabel="Progress and leaderboard changes"
                right={<Switch value={notif.challenges} onValueChange={v => setNotif(n => ({ ...n, challenges: v }))} trackColor={{ false: colors.border, true: colors.brand }} thumbColor={colors.white} />}
              />
              <View style={sh.rowDivider} />
              <SettingRow
                icon="people-outline" iconColor={colors.brand} label="Friend Activity" sublabel="When friends post or achieve"
                right={<Switch value={notif.friendActivity} onValueChange={v => setNotif(n => ({ ...n, friendActivity: v }))} trackColor={{ false: colors.border, true: colors.brand }} thumbColor={colors.white} />}
              />
            </View>

            <SectionLabel label="REPORTS" />
            <View style={sh.card}>
              <SettingRow
                icon="stats-chart-outline" iconColor={colors.info} label="Weekly Summary" sublabel="Every Monday morning"
                right={<Switch value={notif.weeklySummary} onValueChange={v => setNotif(n => ({ ...n, weeklySummary: v }))} trackColor={{ false: colors.border, true: colors.brand }} thumbColor={colors.white} />}
              />
              <View style={sh.rowDivider} />
              <SettingRow
                icon="sparkles-outline" iconColor={colors.brandBright} label="New Features" sublabel="Product updates and announcements"
                right={<Switch value={notif.newFeatures} onValueChange={v => setNotif(n => ({ ...n, newFeatures: v }))} trackColor={{ false: colors.border, true: colors.brand }} thumbColor={colors.white} />}
              />
            </View>

            <TouchableOpacity onPress={() => { Alert.alert('Saved!', 'Notification preferences updated.'); close(); }} activeOpacity={0.85}>
              <LinearGradient colors={[colors.brand, colors.tealMid]} style={sh.saveBtn}>
                <Text style={sh.saveBtnText}>Save Preferences</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </Modal>

      {/* ════════════════════════════════════════════
          MODAL: Fitness Goals
      ════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'fitnessGoals'} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <LinearGradient colors={[colors.surface, colors.surface]} style={sh.sheet}>
          <SheetHeader title="Fitness Goals" onClose={close} />
          <ScrollView contentContainerStyle={sh.body}>

            {[
              { icon: 'flame-outline',    iconColor: colors.accent, label: 'Daily Calories',  sublabel: 'kcal target', key: 'calories' as const, step: 50,   min: 500,  max: 6000  },
              { icon: 'barbell-outline',  iconColor: colors.brand, label: 'Weekly Workouts', sublabel: 'sessions/week', key: 'workouts' as const, step: 1,  min: 1,    max: 14    },
              { icon: 'footsteps-outline',iconColor: colors.success, label: 'Daily Steps',     sublabel: 'steps/day',   key: 'steps'    as const, step: 500, min: 1000, max: 50000 },
              { icon: 'water-outline',    iconColor: colors.info, label: 'Daily Water',     sublabel: 'glasses/day', key: 'water'    as const, step: 1,   min: 1,    max: 20    },
            ].map(g => (
              <View key={g.key}>
                <SectionLabel label={g.label.toUpperCase()} />
                <View style={sh.card}>
                  <View style={sh.goalRow}>
                    <View style={[sh.rowIcon, { backgroundColor: g.iconColor + '20' }]}>
                      <Ionicons name={g.icon as any} size={18} color={g.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={sh.rowLabel}>{g.label}</Text>
                      <Text style={sh.rowSub}>{g.sublabel}</Text>
                    </View>
                    <Stepper value={goals[g.key]} onChange={v => setGoals(prev => ({ ...prev, [g.key]: v }))} step={g.step} min={g.min} max={g.max} />
                  </View>
                </View>
              </View>
            ))}

            <View style={sh.goalsNote}>
              <Ionicons name="information-circle-outline" size={16} color={colors.faint} />
              <Text style={sh.goalsNoteText}>Goals help personalize your daily dashboard and progress tracking.</Text>
            </View>

            <TouchableOpacity onPress={saveGoals} activeOpacity={0.85}>
              <LinearGradient colors={[colors.brand, colors.tealMid]} style={sh.saveBtn}>
                <Text style={sh.saveBtnText}>Save Goals</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </Modal>

      {/* ════════════════════════════════════════════
          MODAL: Privacy & Security
      ════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'privacy'} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <LinearGradient colors={[colors.surface, colors.surface]} style={sh.sheet}>
          <SheetHeader title="Privacy & Security" onClose={close} />
          <ScrollView contentContainerStyle={sh.body}>

            <SectionLabel label="PROFILE VISIBILITY" />
            <View style={sh.card}>
              <SettingRow
                icon="globe-outline" iconColor={colors.info} label="Public Profile" sublabel="Anyone can see your profile"
                right={<Switch value={privacy.publicProfile} onValueChange={v => setPrivacy(p => ({ ...p, publicProfile: v }))} trackColor={{ false: colors.border, true: colors.brand }} thumbColor={colors.white} />}
              />
              <View style={sh.rowDivider} />
              <SettingRow
                icon="trophy-outline" iconColor={colors.warning} label="Show on Leaderboard" sublabel="Appear in public rankings"
                right={<Switch value={privacy.showLeaderboard} onValueChange={v => setPrivacy(p => ({ ...p, showLeaderboard: v }))} trackColor={{ false: colors.border, true: colors.brand }} thumbColor={colors.white} />}
              />
              <View style={sh.rowDivider} />
              <SettingRow
                icon="eye-outline" iconColor={colors.success} label="Activity Visible to Friends" sublabel="Friends can see your workouts"
                right={<Switch value={privacy.activityVisible} onValueChange={v => setPrivacy(p => ({ ...p, activityVisible: v }))} trackColor={{ false: colors.border, true: colors.brand }} thumbColor={colors.white} />}
              />
            </View>

            <SectionLabel label="CHANGE PASSWORD" />
            <View style={sh.card}>
              <TextInput style={sh.inputInCard} placeholder="Current password" placeholderTextColor={colors.faint} secureTextEntry value={passwords.current} onChangeText={v => setPasswords(p => ({ ...p, current: v }))} />
              <View style={sh.rowDivider} />
              <TextInput style={sh.inputInCard} placeholder="New password" placeholderTextColor={colors.faint} secureTextEntry value={passwords.newPw} onChangeText={v => setPasswords(p => ({ ...p, newPw: v }))} />
              <View style={sh.rowDivider} />
              <TextInput style={sh.inputInCard} placeholder="Confirm new password" placeholderTextColor={colors.faint} secureTextEntry value={passwords.confirm} onChangeText={v => setPasswords(p => ({ ...p, confirm: v }))} />
            </View>
            <TouchableOpacity onPress={changePassword} style={sh.secondaryBtn} activeOpacity={0.8}>
              <Text style={sh.secondaryBtnText}>Update Password</Text>
            </TouchableOpacity>

            <SectionLabel label="DANGER ZONE" />
            <TouchableOpacity
              style={sh.dangerBtn}
              onPress={() => Alert.alert('Delete Account', 'This will permanently delete your account and all data. This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Deleted', 'Your account has been deleted.') },
              ])}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={sh.dangerBtnText}>Delete My Account</Text>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </Modal>

      {/* ════════════════════════════════════════════
          MODAL: Help & Support
      ════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'help'} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <LinearGradient colors={[colors.surface, colors.surface]} style={sh.sheet}>
          <SheetHeader title="Help & Support" onClose={close} />
          <ScrollView contentContainerStyle={sh.body}>

            <SectionLabel label="FREQUENTLY ASKED QUESTIONS" />
            <View style={sh.card}>
              <FAQItem q="How do I log a workout?" a="Go to the Workout tab and tap any quick-log card, or log a custom workout by tapping the barbell icon." />
              <View style={sh.rowDivider} />
              <FAQItem q="How are XP and levels calculated?" a="You earn 10 XP for each workout logged. Every 100 XP levels you up. Streaks and challenges award bonus XP." />
              <View style={sh.rowDivider} />
              <FAQItem q="Can I connect a wearable device?" a="Yes! Head to the Health tab and follow the instructions to connect Apple Watch, Oura Ring, Garmin, WHOOP, or Fitbit." />
              <View style={sh.rowDivider} />
              <FAQItem q="How do challenges work?" a="Browse active challenges in the Social tab → Challenges. Join one and your activity automatically counts toward the goal." />
              <View style={sh.rowDivider} />
              <FAQItem q="How do I add friends?" a="Open the Social tab, tap the people icon in the top-right, then go to Find People and search by name or email." />
            </View>

            <SectionLabel label="CONTACT US" />
            <View style={sh.card}>
              <SettingRow
                icon="mail-outline" iconColor={colors.brand} label="Email Support" sublabel="support@reprummble.com"
                onPress={() => Linking.openURL('mailto:support@reprummble.com')}
              />
              <View style={sh.rowDivider} />
              <SettingRow
                icon="bug-outline" iconColor={colors.danger} label="Report a Bug" sublabel="Help us improve the app"
                onPress={() => Alert.alert('Report Bug', 'Thanks! Bug report sent to our team.')}
              />
              <View style={sh.rowDivider} />
              <SettingRow
                icon="star-outline" iconColor={colors.warning} label="Rate the App" sublabel="Enjoying Rep Rummble?"
                onPress={() => Alert.alert('Rate Us', 'Opening App Store…')}
              />
            </View>
          </ScrollView>
        </LinearGradient>
      </Modal>

      {/* ════════════════════════════════════════════
          MODAL: About
      ════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'about'} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <LinearGradient colors={[colors.surface, colors.surface]} style={sh.sheet}>
          <SheetHeader title="About" onClose={close} />
          <ScrollView contentContainerStyle={sh.body}>

            {/* App branding */}
            <LinearGradient colors={[colors.brandSoft, colors.brandSoft]} style={sh.aboutHero}>
              <LinearGradient colors={[colors.brand, colors.tealMid]} style={sh.aboutLogo}>
                <Ionicons name="barbell" size={36} color={colors.white} />
              </LinearGradient>
              <Text style={sh.aboutAppName}>Rep Rummble</Text>
              <Text style={sh.aboutTagline}>Compete. Track. Dominate.</Text>
              <View style={sh.aboutVersionBadge}>
                <Text style={sh.aboutVersionText}>Version 1.0.0</Text>
              </View>
            </LinearGradient>

            <SectionLabel label="WHAT'S NEW IN 1.0" />
            <View style={sh.card}>
              {[
                { icon: 'sparkles',  color: colors.brand, text: 'AI-powered meal recognition' },
                { icon: 'people',    color: colors.success, text: 'Social feed with stories & comments' },
                { icon: 'trophy',    color: colors.warning, text: 'Live challenges and leaderboards' },
                { icon: 'watch',     color: colors.info, text: 'Wearable device integration' },
                { icon: 'chatbubble',color: colors.accent, text: 'AI fitness coach chat' },
              ].map((item, i) => (
                <View key={i}>
                  {i > 0 && <View style={sh.rowDivider} />}
                  <View style={sh.changelogRow}>
                    <View style={[sh.rowIcon, { backgroundColor: item.color + '20' }]}>
                      <Ionicons name={item.icon as any} size={16} color={item.color} />
                    </View>
                    <Text style={sh.changelogText}>{item.text}</Text>
                  </View>
                </View>
              ))}
            </View>

            <SectionLabel label="LEGAL" />
            <View style={sh.card}>
              <SettingRow
                icon="document-text-outline" iconColor={colors.muted} label="Terms of Service"
                onPress={() => Alert.alert('Terms', 'Opening Terms of Service…')}
              />
              <View style={sh.rowDivider} />
              <SettingRow
                icon="lock-closed-outline" iconColor={colors.muted} label="Privacy Policy"
                onPress={() => Alert.alert('Privacy', 'Opening Privacy Policy…')}
              />
              <View style={sh.rowDivider} />
              <SettingRow
                icon="code-slash-outline" iconColor={colors.muted} label="Open Source Licenses"
                onPress={() => Alert.alert('Licenses', 'Opening licenses…')}
              />
            </View>

            <Text style={sh.aboutFooter}>Made with ❤️ for fitness lovers everywhere</Text>
          </ScrollView>
        </LinearGradient>
      </Modal>
    </View>
  );
}

// ─── Profile main styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },

  // Top bar
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingBottom: 14 },
  screenTitle: { fontSize: 22, fontWeight: '900', color: colors.ink, letterSpacing: -0.4 },
  editBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.brand + '20', borderWidth: 1, borderColor: colors.brand + '40', justifyContent: 'center', alignItems: 'center' },

  // Hero
  heroCard: { borderRadius: 24, padding: 20, marginBottom: 20, overflow: 'hidden' },
  heroGlow: { display: 'none', position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: colors.brand, opacity: 0.1, top: -60, right: -40 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  avatar: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { fontSize: 30, fontWeight: '900', color: colors.white },
  heroInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  displayName: { fontSize: 20, fontWeight: '900', color: colors.white, letterSpacing: -0.3 },
  levelPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  levelPillText: { fontSize: 11, fontWeight: '800', color: colors.white },
  email: { fontSize: 12, color: 'rgba(255,255,255,0.78)' },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#5eead4' },
  activeText: { fontSize: 11, color: '#99f6e4', fontWeight: '600' },

  // XP
  xpSection: { marginBottom: 18 },
  xpLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  xpLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  xpCount: { fontSize: 11, fontWeight: '700', color: colors.white },
  xpTrack: { height: 7, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  xpFill: { height: '100%', borderRadius: 4 },
  xpHint: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },

  // Hero stats
  heroStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)', paddingTop: 16 },
  heroStat: { flex: 1, alignItems: 'center', gap: 3 },
  heroStatVal: { fontSize: 20, fontWeight: '900', color: colors.white },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  // Menu
  groupLabel: { fontSize: 11, fontWeight: '700', color: colors.faint, letterSpacing: 1.2, marginBottom: 8 },
  menuCard: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 0 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, gap: 14 },
  menuIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, color: colors.ink, fontWeight: '500' },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },

  // Logout
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.danger + '12', borderRadius: 16, paddingVertical: 15, marginTop: 20, borderWidth: 1, borderColor: colors.danger + '30' },
  logoutText: { fontSize: 15, fontWeight: '700', color: colors.danger },

  version: { textAlign: 'center', color: colors.border, fontSize: 12, marginTop: 16 },

  // Subscription card
  subCard: { borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border },
  subCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  subIcon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  subPlanName: { fontSize: 16, fontWeight: '800' },
  subMeta: { fontSize: 11, color: colors.faint, marginTop: 3 },
  upgradeTag: { backgroundColor: colors.success + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: colors.success + '40' },
  upgradeTagText: { fontSize: 9, fontWeight: '800', color: colors.success },
  subArrow: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});

// ─── Sheet / modal styles (shared across all modals) ─────────────────────────
const sh = StyleSheet.create({
  sheet: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: colors.ink },
  body: { padding: 16, paddingBottom: 60 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.faint, letterSpacing: 1, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, color: colors.ink, fontWeight: '500' },
  rowSub: { fontSize: 12, color: colors.faint, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 14 },

  // Edit Profile
  avatarCenter: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  bigAvatar: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
  bigAvatarText: { fontSize: 38, fontWeight: '900', color: colors.white },
  input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 13, color: colors.ink, fontSize: 15, marginBottom: 4 },
  inputDisabled: { justifyContent: 'center' },
  inputDisabledText: { color: colors.faint, fontSize: 15 },
  hint: { fontSize: 12, color: colors.faint, marginBottom: 4, marginLeft: 4 },
  infoCard: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  infoLabel: { fontSize: 14, color: colors.muted },
  infoValue: { fontSize: 14, color: colors.ink, fontWeight: '500' },

  // Fitness Goals
  goalRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  stepValue: { fontSize: 16, fontWeight: '700', color: colors.white, minWidth: 50, textAlign: 'center' },
  goalsNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginTop: 8, marginBottom: 4, borderWidth: 1, borderColor: colors.border },
  goalsNoteText: { flex: 1, fontSize: 12, color: colors.faint, lineHeight: 18 },

  // Privacy
  inputInCard: { paddingHorizontal: 14, paddingVertical: 13, color: colors.ink, fontSize: 15 },
  secondaryBtn: { backgroundColor: colors.border, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  secondaryBtnText: { color: colors.brand, fontWeight: '700', fontSize: 15 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.danger + '15', borderRadius: 12, padding: 14, marginTop: 4, borderWidth: 1, borderColor: colors.danger + '40' },
  dangerBtnText: { color: colors.danger, fontWeight: '700', fontSize: 15 },

  // Help FAQ
  faqItem: { padding: 14 },
  faqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { fontSize: 14, fontWeight: '600', color: colors.ink, flex: 1, paddingRight: 8 },
  faqA: { fontSize: 13, color: colors.muted, lineHeight: 20, marginTop: 8 },

  // About
  aboutHero: { borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 4 },
  aboutLogo: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  aboutAppName: { fontSize: 24, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
  aboutTagline: { fontSize: 14, color: colors.muted, marginTop: 4, marginBottom: 12 },
  aboutVersionBadge: { backgroundColor: colors.brand + '30', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: colors.brand + '50' },
  aboutVersionText: { color: colors.brand, fontSize: 12, fontWeight: '700' },
  changelogRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  changelogText: { fontSize: 14, color: colors.ink, flex: 1 },
  aboutFooter: { textAlign: 'center', color: colors.faint, fontSize: 13, marginTop: 28 },

  // Shared save button
  saveBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
});
