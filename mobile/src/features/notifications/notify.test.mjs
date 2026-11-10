import assert from 'node:assert/strict';
import { planNotifications, currentStreak, anyEnabled, REMINDER_COPY, TIMES } from './notifyLogic.ts';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const morning = new Date(2026, 10, 10, 9, 0), lateNight = new Date(2026, 10, 10, 22, 0);   // Tuesday 10 Nov 2026
const state = (o = {}) => ({ prefs: { workout_reminders: true, weekly_reports: true, challenge_updates: true, recovery_alerts: true }, routines: [], streak: 0, trainedToday: false, challenges: [], now: morning, ...o });
const ids = (s) => planNotifications(s).map((x) => x.id);

t('everything off means no reminders at all', () => {
  assert.deepEqual(planNotifications(state({ prefs: {} })), []); assert.deepEqual(planNotifications(state({ prefs: { marketing: true } })), []);
  assert.equal(anyEnabled({}), false); assert.equal(anyEnabled({ marketing: true }), false); assert.equal(anyEnabled({ recovery_alerts: true }), true);
});

t('each switch controls only its own reminder', () => {
  const r = [{ name: 'Pull day', exercises: 6, weekdays: [2] }];
  assert.deepEqual(ids(state({ prefs: { recovery_alerts: true } })), ['morning']);
  assert.deepEqual(ids(state({ prefs: { weekly_reports: true } })), ['weekly']);
  assert.deepEqual(ids(state({ prefs: { workout_reminders: true }, routines: r })), ['workout-2']);
  assert.deepEqual(ids(state({ prefs: {}, routines: r })), []);
});

t('a planned workout is reminded on its own weekdays only, at 5:30 pm, in the platform’s weekday numbering', () => {
  const list = planNotifications(state({ prefs: { workout_reminders: true }, routines: [{ name: 'Pull day', exercises: 6, weekdays: [1, 4] }, { name: 'Leg day', exercises: 5, weekdays: [1] }, { name: 'Unscheduled', exercises: 3, weekdays: [] }] }));
  assert.deepEqual(list.map((x) => x.id), ['workout-1', 'workout-4']);
  const mon = list[0]; assert.deepEqual([mon.kind, mon.weekday, mon.hour, mon.minute], ['weekly', 2, 17, 30]);       // Monday is 2 (Sunday is 1)
  assert.equal(mon.title, 'Pull day and 1 more today'); assert.equal(list[1].title, 'Pull day today'); assert.match(list[1].body, /6 exercises/);
  const sun = planNotifications(state({ prefs: { workout_reminders: true }, routines: [{ name: 'Long run', exercises: 1, weekdays: [0] }] }))[0]; assert.equal(sun.weekday, 1);
});

t('the evening nudge is for tonight only: not if you already trained, not once it is too late', () => {
  const open = [{ title: '30-day kickstart', dayNumber: 9, days: 30, todayDone: false }];
  const a = planNotifications(state({ challenges: open }));
  const nudge = a.find((x) => x.id === 'nudge-today'); assert.equal(nudge.kind, 'once'); assert.deepEqual([nudge.at.getHours(), nudge.at.getMinutes()], [20, 30]); assert.match(nudge.title, /Day 9 of 30/);
  assert.equal(ids(state({ challenges: open, trainedToday: true })).includes('nudge-today'), false);
  assert.equal(ids(state({ challenges: open, now: lateNight })).includes('nudge-today'), false);
  assert.equal(ids(state({ challenges: [{ ...open[0], todayDone: true }] })).includes('nudge-today'), false);
});

t('a streak nudge needs a real streak and the workout switch; a challenge nudge needs the challenge switch', () => {
  assert.equal(planNotifications(state({ streak: 5 })).find((x) => x.id === 'nudge-today').title, 'Keep your 5-day streak');
  assert.equal(ids(state({ streak: 1 })).includes('nudge-today'), false);
  assert.equal(ids(state({ streak: 5, prefs: { weekly_reports: true } })).includes('nudge-today'), false);
  const open = [{ title: 'C', dayNumber: 2, days: 30, todayDone: false }];
  assert.equal(ids(state({ challenges: open, prefs: { workout_reminders: true } })).includes('nudge-today'), false);
  assert.match(planNotifications(state({ challenges: [...open, { ...open[0], title: 'D' }], streak: 9 })).find((x) => x.id === 'nudge-today').body, /2 challenges/);   // a challenge outranks the streak line
});

t('daily morning and weekly Sunday reminders use the set times', () => {
  const l = planNotifications(state());
  const m = l.find((x) => x.id === 'morning'), w = l.find((x) => x.id === 'weekly');
  assert.deepEqual([m.kind, m.hour, m.minute], ['daily', ...TIMES.morning]); assert.deepEqual([w.kind, w.weekday, w.hour, w.minute], ['weekly', 1, 18, 0]);
  assert.equal(new Set(l.map((x) => x.id)).size, l.length);        // ids are unique, so scheduling the same list twice replaces rather than duplicates
});

t('streak counting: consecutive days ending today or yesterday', () => {
  assert.equal(currentStreak(['2026-11-10', '2026-11-09', '2026-11-08'], '2026-11-10'), 3);
  assert.equal(currentStreak(['2026-11-09', '2026-11-08'], '2026-11-10'), 2);          // today not trained yet
  assert.equal(currentStreak(['2026-11-08'], '2026-11-10'), 0); assert.equal(currentStreak([], '2026-11-10'), 0);
  assert.equal(currentStreak(['2026-11-10', '2026-11-08', '2026-11-07'], '2026-11-10'), 1);
  assert.equal(currentStreak(['2026-11-01', '2026-10-31', '2026-10-30'], '2026-11-01'), 3);   // across a month end
});

t('the switch labels in Profile say what each one really does', () => {
  for (const k of ['workout_reminders', 'weekly_reports', 'challenge_updates', 'recovery_alerts']) assert.ok(REMINDER_COPY[k].label && REMINDER_COPY[k].desc.length > 10, k);
  assert.match(REMINDER_COPY.recovery_alerts.desc, /8 am/); assert.doesNotMatch(REMINDER_COPY.recovery_alerts.desc, /low/i);   // we cannot know your recovery when a reminder fires, so it does not promise that
});
console.log(`${n} checks passed`);
