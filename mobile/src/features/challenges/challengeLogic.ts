// How challenges read on screen. The numbers come from the server (counted from workouts really saved); this only words them.

export interface Preset { days: 30 | 60 | 90; name: string; blurb: string; color: string; icon: string }
export const PRESETS: Preset[] = [
  { days: 30, name: '30-day kickstart', blurb: 'Build the habit', color: '#ff9a4d', icon: 'flash-outline' },
  { days: 60, name: '60-day transformation', blurb: 'See real change', color: '#ff5a36', icon: 'flame-outline' },
  { days: 90, name: '90-day total reset', blurb: 'Become a different person', color: '#d62839', icon: 'trophy-outline' },
];

export interface Pace { perWeek: 3 | 5 | 7; label: string; hint: string }
export const PACES: Pace[] = [
  { perWeek: 3, label: '3 days a week', hint: 'Steady' },
  { perWeek: 5, label: '5 days a week', hint: 'Committed' },
  { perWeek: 7, label: 'Every day', hint: 'All in' },
];

export const targetFor = (days: number, perWeek: number) => Math.ceil((days * perWeek) / 7);

export interface Progress { done: number; target: number; pct: number; streak: number; todayDone: boolean; grid: string; onTrack: boolean; completed: boolean }
export interface Member { _id: string; displayName: string; isMe: boolean; status: 'joined' | 'invited'; progress: Progress | null; invitedBy?: string }
export interface DayChallenge {
  _id: string; title: string; days: number; perWeek: number; target: number; startKey: string; endKey: string;
  state: 'active' | 'finished'; dayNumber: number; daysLeft: number; isCreator: boolean; myStatus: 'joined' | 'invited'; members: Member[];
}

export type Tone = 'good' | 'warn' | 'bad' | 'muted';

/** One line about a person's standing: "8 of 22 days · on track". */
export function standing(m: Member, c: Pick<DayChallenge, 'state'>): { text: string; tone: Tone } {
  if (m.status === 'invited' || !m.progress) return { text: 'Invited, not joined yet', tone: 'muted' };
  const p = m.progress;
  const base = `${p.done} of ${p.target} days`;
  if (p.completed) return { text: `${base} · done!`, tone: 'good' };
  if (c.state === 'finished') return { text: `${base} · finished`, tone: 'muted' };
  return p.onTrack ? { text: `${base} · on track`, tone: 'good' } : { text: `${base} · behind pace`, tone: 'warn' };
}

/** Joined people ranked by days done (ties keep the server's order). Invited people are not ranked. */
export function ranked(c: Pick<DayChallenge, 'members'>): Member[] {
  return c.members.filter((m) => m.status === 'joined' && m.progress).sort((a, b) => b.progress!.done - a.progress!.done);
}

/** The person in front, only when someone really leads. */
export function leader(c: Pick<DayChallenge, 'members'>): Member | null {
  const r = ranked(c);
  return r.length > 1 && r[0].progress!.done > r[1].progress!.done ? r[0] : null;
}

export const daysLeftLabel = (c: Pick<DayChallenge, 'state' | 'daysLeft'>) => (c.state === 'finished' ? 'Finished' : c.daysLeft <= 1 ? 'Last day' : `${c.daysLeft} days left`);

export const paceLabel = (perWeek: number) => (perWeek === 7 ? 'Every day' : `${perWeek} days a week`);

export type Cell = 'done' | 'missed' | 'today' | 'future';
export const gridCells = (grid: string): Cell[] => [...grid].map((ch) => (ch === 'd' ? 'done' : ch === 'm' ? 'missed' : ch === 't' ? 'today' : 'future'));

/** What the person should do next, in a sentence. */
export function nextStep(c: DayChallenge): string {
  const me = c.members.find((m) => m.isMe);
  if (c.myStatus === 'invited') return 'Join to start counting your days.';
  if (c.state === 'finished') return me?.progress?.completed ? 'You finished this challenge. Well done!' : 'This challenge is over.';
  if (!me?.progress) return '';
  if (me.progress.completed) return 'You hit your target. Keep going to finish strong!';
  return me.progress.todayDone ? 'Today is done. See you tomorrow!' : 'Log a workout today to fill today’s day.';
}

export const invitedCount = (c: Pick<DayChallenge, 'members'>) => c.members.filter((m) => m.status === 'invited').length;

export function createErrorMessage(status: number | undefined, message?: string): string {
  if (status === 429 || status === 400) return message ?? 'Could not start that challenge.';
  return 'Could not reach the server. Check your connection and try again.';
}
