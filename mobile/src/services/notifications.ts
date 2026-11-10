import { AppState, Linking, Platform } from 'react-native';
import api from '../config/api';
import { anyEnabled, currentStreak, planNotifications, type NotifyState, type Planned } from '../features/notifications/notifyLogic';
import { notificationState } from '../features/profile/profileLogic';
import { dayKeyOf } from '../features/train/trainLogic';
import { coach } from './coachService';
import { dayChallenges } from './dayChallengeService';

// Reminders scheduled on the phone itself (no server, no Apple push account). They are rebuilt from your real data every time the app opens.
type N = typeof import('expo-notifications');
let mod: N | null | undefined;
function load(): N | null {
  if (mod !== undefined) return mod;
  try { mod = require('expo-notifications') as N; } catch { mod = null; }   // not in this build (an older app build, or the web)
  return mod;
}

export type ReminderStatus = 'on' | 'off' | 'denied' | 'unavailable';

export const remindersSupported = () => Platform.OS !== 'web' && load() !== null;

let handlerSet = false;
function setup(m: N) {
  if (handlerSet) return;
  m.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
  handlerSet = true;
}

/** Whether the phone allows our reminders, asking once if it has not been asked before. */
export async function ensurePermission(ask: boolean): Promise<'granted' | 'denied' | 'unavailable'> {
  const m = load();
  if (!m) return 'unavailable';
  try {
    setup(m);
    let p = await m.getPermissionsAsync();
    if (!p.granted && ask && p.canAskAgain) p = await m.requestPermissionsAsync();
    return p.granted ? 'granted' : 'denied';
  } catch { return 'unavailable'; }
}

async function schedule(m: N, list: Planned[]) {
  await m.cancelAllScheduledNotificationsAsync();
  const T = m.SchedulableTriggerInputTypes;
  for (const p of list) {
    const content = { title: p.title, body: p.body, sound: false };
    const trigger = p.kind === 'daily' ? { type: T.DAILY, hour: p.hour, minute: p.minute } : p.kind === 'weekly' ? { type: T.WEEKLY, weekday: p.weekday, hour: p.hour, minute: p.minute } : { type: T.DATE, date: p.at };
    await m.scheduleNotificationAsync({ identifier: p.id, content, trigger: trigger as never });
  }
}

/** Everything the rules need, from the real data. A part that cannot be loaded is simply left out, so one failure never blocks the rest. */
export async function gatherState(prefs: Record<string, boolean>): Promise<NotifyState> {
  const now = new Date();
  const today = dayKeyOf(now);
  const [routines, workouts, challenges] = await Promise.all([
    coach.routines().catch(() => []),
    api.get('/workouts').then((r) => (r.data?.data ?? []) as { timestamp: string }[]).catch(() => []),
    dayChallenges.list().catch(() => []),
  ]);
  const days = new Set(workouts.map((w) => dayKeyOf(new Date(w.timestamp))));
  return {
    prefs, now,
    routines: routines.map((r) => ({ name: r.name, exercises: r.exercises.length, weekdays: r.weekdays })),
    streak: currentStreak(days, today), trainedToday: days.has(today),
    challenges: challenges.filter((c) => c.myStatus === 'joined' && c.state === 'active').map((c) => ({ title: c.title, dayNumber: c.dayNumber, days: c.days, todayDone: !!c.members.find((x) => x.isMe)?.progress?.todayDone })),
  };
}

async function currentPrefs(): Promise<Record<string, boolean>> {
  try { const me = await api.get('/auth/me'); return notificationState(me.data?.data?.profile?.notifications); } catch { return notificationState(null); }
}

/**
 * Rebuilds the reminders. Pass the switches if you already have them (just saved in Profile), otherwise they are read from the account.
 * `ask` lets it show the phone's permission prompt, which we only do when the person has just turned a reminder on.
 */
export async function syncReminders(opts: { prefs?: Record<string, boolean>; ask?: boolean } = {}): Promise<ReminderStatus> {
  const m = load();
  if (!m || Platform.OS === 'web') return 'unavailable';
  try {
    const prefs = opts.prefs ?? (await currentPrefs());
    if (!anyEnabled(prefs)) { await m.cancelAllScheduledNotificationsAsync(); return 'off'; }
    const perm = await ensurePermission(!!opts.ask);
    if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'unavailable';
    await schedule(m, planNotifications(await gatherState(prefs)));
    return 'on';
  } catch { return 'unavailable'; }
}

let last = 0;
/** For when the app opens or comes back: at most once every 5 minutes. */
export async function syncRemindersThrottled() {
  if (Date.now() - last < 5 * 60_000) return;
  last = Date.now();
  await syncReminders();
}

/** After a workout is saved, so tonight's nudge is cancelled. */
export function syncRemindersSoon() { last = Date.now(); syncReminders().catch(() => {}); }

export const openPhoneSettings = () => Linking.openSettings().catch(() => {});

/** Keeps reminders current while the app is open. */
export function watchAppState(onActive: () => void) {
  const sub = AppState.addEventListener('change', (s) => { if (s === 'active') onActive(); });
  return () => sub.remove();
}
