// Rules behind the Devices screen: what each device is, whether this phone can connect it, and how its state reads.
// Pure functions, no React.

export type DeviceId = 'apple_watch' | 'galaxy_watch' | 'fitbit' | 'whoop' | 'oura';
export const DEVICE_ORDER: DeviceId[] = ['apple_watch', 'galaxy_watch', 'fitbit', 'whoop', 'oura'];

export interface DeviceInfo { name: string; icon: string; color: string; how: string; gives: string }
export const DEVICE_INFO: Record<DeviceId, DeviceInfo> = {
  apple_watch: { name: 'Apple Watch', icon: 'watch-outline', color: '#ff5a5f', how: 'Reads your watch data from Apple Health on this iPhone.', gives: 'Steps, active calories, resting heart rate, sleep' },
  galaxy_watch: { name: 'Samsung Galaxy Watch', icon: 'watch-outline', color: '#4da3ff', how: 'Reads your watch data from Samsung Health through Health Connect on this phone.', gives: 'Steps, active calories, resting heart rate, HRV, sleep' },
  fitbit: { name: 'Fitbit', icon: 'fitness-outline', color: '#35e0a1', how: 'Sign in with the Google account your Fitbit uses.', gives: 'Steps, sleep, HRV' },
  whoop: { name: 'WHOOP', icon: 'pulse-outline', color: '#ff9a4d', how: 'Sign in to your WHOOP account.', gives: 'Recovery, strain, sleep, resting heart rate, HRV' },
  oura: { name: 'Oura Ring', icon: 'ellipse-outline', color: '#a07cff', how: 'Sign in to your Oura account.', gives: 'Readiness, sleep, steps, resting heart rate, HRV' },
};

export type Platform = 'ios' | 'android' | 'web' | 'windows' | 'macos';

/** Whether this phone can connect the device at all, and if not, why, in plain words. */
export function platformSupport(id: DeviceId, os: Platform): { ok: true } | { ok: false; why: string } {
  if (id === 'apple_watch' && os !== 'ios') return { ok: false, why: 'Apple Watch works with an iPhone. Open Reprummble on your iPhone to connect it.' };
  if (id === 'galaxy_watch' && os !== 'android') return { ok: false, why: 'Galaxy Watch data reaches Reprummble through Android’s Health Connect. Open the app on your Android phone to connect it.' };
  return { ok: true };
}

export interface Connection { status: 'connected' | 'needs_reauth' | 'error'; label: string; connectedAt: string; lastSyncAt: string | null; lastError: string | null }

/** "Synced 5 min ago". */
export function syncedLabel(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return 'Not synced yet';
  const sec = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 1000));
  if (sec < 60) return 'Synced just now';
  if (sec < 3600) return `Synced ${Math.round(sec / 60)} min ago`;
  if (sec < 86400) return `Synced ${Math.round(sec / 3600)} h ago`;
  const d = Math.round(sec / 86400);
  return `Synced ${d} day${d === 1 ? '' : 's'} ago`;
}

export type Tone = 'good' | 'warn' | 'bad';
export function statusInfo(c: Connection, now: Date = new Date()): { label: string; tone: Tone; detail: string } {
  if (c.status === 'needs_reauth') return { label: 'Sign in again', tone: 'warn', detail: 'Your sign-in expired or was removed. Sign in again to keep syncing.' };
  if (c.status === 'error') return { label: 'Sync problem', tone: 'bad', detail: c.lastError ?? 'The last sync did not work. We will try again.' };
  return { label: 'Connected', tone: 'good', detail: syncedLabel(c.lastSyncAt, now) };
}

/** Whether a name from Apple Health belongs to an Apple Watch ("Sam’s Apple Watch"). The iPhone and other apps do not count. */
export const isAppleWatchSource = (name: string) => /apple\s*watch/i.test(name);

export interface HcDevice { manufacturer?: string; model?: string; type?: number }
export const SAMSUNG_HEALTH = 'com.sec.android.app.shealth';
const TYPE_WATCH = 1;

/** What a Health Connect record tells us about where it came from. */
export function galaxySource(origin: string | undefined, device: HcDevice | undefined): 'watch' | 'samsung_health' | null {
  if (origin !== SAMSUNG_HEALTH) return null;
  const model = device?.model ?? '';
  // Samsung model codes for watches start SM-R (phones are SM-S, SM-G, SM-A...).
  if (device?.type === TYPE_WATCH || /^SM-R/i.test(model)) return 'watch';
  return 'samsung_health';
}

export function galaxyLabel(model: string | undefined): string {
  return model ? `Galaxy Watch (${model})` : 'Galaxy Watch';
}

/** Local calendar day as YYYY-MM-DD. */
export function localDayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Messages for the codes the server sends back after sign-in. */
export function connectErrorMessage(code: string | null | undefined, name: string): string {
  switch (code) {
    case 'denied': return `You did not allow access, so ${name} was not connected.`;
    case 'expired': return 'That sign-in took too long or was already used. Please try again.';
    case 'not_linked': return `Your Google account is not linked to ${name} yet. Open the Fitbit or Google Health app, link your Google account there, then try again.`;
    case 'unavailable': return `${name} is not switched on for Reprummble yet.`;
    case 'invalid': return 'The sign-in did not finish. Please try again.';
    default: return `We could not connect ${name}. Please try again in a moment.`;
  }
}

export const SOURCE_NAMES: Record<string, string> = { apple_watch: 'Apple Watch', galaxy_watch: 'Galaxy Watch', fitbit: 'Fitbit', whoop: 'WHOOP', oura: 'Oura' };

export interface Picked { value: number; source: string }
export type SummaryDay = { date: string } & Partial<Record<'steps' | 'activeCalories' | 'sleepHours' | 'restingHR' | 'hrv' | 'recovery' | 'strain' | 'sleepScore', Picked>>;

/** What one device currently contributes, for its card: only numbers that device really reported. */
export function contributions(day: SummaryDay | undefined, id: string): string[] {
  if (!day) return [];
  const out: string[] = [];
  const pick = (k: keyof SummaryDay) => { const p = day[k] as Picked | undefined; return p && p.source === id ? p.value : undefined; };
  const steps = pick('steps'); if (steps !== undefined) out.push(`${Math.round(steps).toLocaleString('en-US')} steps`);
  const rec = pick('recovery'); if (rec !== undefined) out.push(`${Math.round(rec)}% ${id === 'oura' ? 'readiness' : 'recovery'}`);
  const strain = pick('strain'); if (strain !== undefined) out.push(`${strain.toFixed(1)} strain`);
  const sleep = pick('sleepHours'); if (sleep !== undefined) out.push(`${sleep.toFixed(1)} h sleep`);
  const rhr = pick('restingHR'); if (rhr !== undefined) out.push(`${Math.round(rhr)} bpm resting`);
  const hrv = pick('hrv'); if (hrv !== undefined) out.push(`${Math.round(hrv)} ms HRV`);
  return out;
}

/** The newest day that has any reading. */
export function latestDay(days: SummaryDay[]): SummaryDay | undefined {
  return [...days].sort((a, b) => b.date.localeCompare(a.date)).find((d) => Object.keys(d).length > 1);
}
