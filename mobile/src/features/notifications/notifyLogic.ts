// Decides which reminders to schedule on the phone. Pure functions: the same state always gives the same reminders.
// They are local reminders, so they work offline and on a free Apple account. Their text is written when scheduled, so it holds no live numbers.

export interface NotifyState {
  /** The profile's notification switches: workout_reminders, weekly_reports, challenge_updates, recovery_alerts. */
  prefs: Record<string, boolean>;
  routines: { name: string; exercises: number; weekdays: number[] }[];
  streak: number;
  trainedToday: boolean;
  challenges: { title: string; dayNumber: number; days: number; todayDone: boolean }[];
  now: Date;
}

export type Planned =
  | { id: string; kind: 'daily'; hour: number; minute: number; title: string; body: string }
  | { id: string; kind: 'weekly'; weekday: number; hour: number; minute: number; title: string; body: string }   // weekday 1 = Sunday ... 7 = Saturday
  | { id: string; kind: 'once'; at: Date; title: string; body: string };

export const TIMES = { morning: [8, 0], workout: [17, 30], evening: [20, 30], weekly: [18, 0] } as const;

/** Consecutive days with a workout, ending today (or yesterday, so an unfinished day does not break it). Days are YYYY-MM-DD. */
export function currentStreak(days: Iterable<string>, today: string): number {
  const set = new Set(days);
  const prev = (k: string) => new Date(Date.parse(`${k}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  let cursor = set.has(today) ? today : prev(today);
  let n = 0;
  while (set.has(cursor)) { n++; cursor = prev(cursor); }
  return n;
}

const at = (now: Date, hour: number, minute: number) => { const d = new Date(now); d.setHours(hour, minute, 0, 0); return d; };

export function planNotifications(s: NotifyState): Planned[] {
  const out: Planned[] = [];
  const p = s.prefs;

  if (p.recovery_alerts) out.push({ id: 'morning', kind: 'daily', hour: TIMES.morning[0], minute: TIMES.morning[1], title: 'Good morning', body: 'See how recovered you are and what today’s plan says.' });

  if (p.workout_reminders) {
    for (let d = 0; d < 7; d++) {
      const planned = s.routines.filter((r) => r.weekdays.includes(d));
      if (!planned.length) continue;
      const first = planned[0];
      out.push({
        id: `workout-${d}`, kind: 'weekly', weekday: d + 1, hour: TIMES.workout[0], minute: TIMES.workout[1],
        title: planned.length > 1 ? `${first.name} and ${planned.length - 1} more today` : `${first.name} today`,
        body: `${first.exercises} exercises are planned. Tap to start.`,
      });
    }
  }

  // A nudge for tonight only, and only if the day is not already done and it is still before the nudge time.
  const when = at(s.now, TIMES.evening[0], TIMES.evening[1]);
  if (!s.trainedToday && when.getTime() > s.now.getTime()) {
    const open = s.challenges.filter((c) => !c.todayDone);
    if (p.challenge_updates && open.length) {
      const c = open[0];
      out.push({ id: 'nudge-today', kind: 'once', at: when, title: `Day ${c.dayNumber} of ${c.days}: ${c.title}`, body: open.length > 1 ? `You have ${open.length} challenges waiting. Log a workout before midnight.` : 'Log a workout before midnight to fill today.' });
    } else if (p.workout_reminders && s.streak >= 2) {
      out.push({ id: 'nudge-today', kind: 'once', at: when, title: `Keep your ${s.streak}-day streak`, body: 'You have not trained yet today. A short session counts.' });
    }
  }

  if (p.weekly_reports) out.push({ id: 'weekly', kind: 'weekly', weekday: 1, hour: TIMES.weekly[0], minute: TIMES.weekly[1], title: 'Your week in review', body: 'See your workouts, streak and progress for the week.' });
  return out;
}

export const anyEnabled = (prefs: Record<string, boolean>) => ['workout_reminders', 'weekly_reports', 'challenge_updates', 'recovery_alerts'].some((k) => prefs[k]);

/** Updated text for the switches in Profile, so each says what it really does. */
export const REMINDER_COPY: Record<string, { label: string; desc: string }> = {
  workout_reminders: { label: 'Workout reminders', desc: 'At 5:30 pm on days a workout is planned, and a nudge in the evening to keep your streak' },
  weekly_reports: { label: 'Weekly progress report', desc: 'A reminder on Sunday evening to review your week' },
  challenge_updates: { label: 'Challenge nudges', desc: 'In the evening, if a challenge day is still open' },
  recovery_alerts: { label: 'Morning check-in', desc: 'At 8 am: see your recovery and today’s plan' },
};
