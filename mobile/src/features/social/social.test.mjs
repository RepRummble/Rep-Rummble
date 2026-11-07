import assert from 'node:assert/strict';
import { initials, avatarColors, timeAgo, timeLeft, workoutFacts, mealFacts, streakLabel, REPORT_REASONS, STORY_THEMES } from './socialLogic.ts';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const now = new Date('2026-11-07T12:00:00Z');

t('initials', () => { assert.equal(initials('Ravi Kumar Sharma'), 'RS'); assert.equal(initials('ravi'), 'R'); assert.equal(initials('  '), '?'); });
t('avatar colours are stable per name', () => { assert.deepEqual(avatarColors('Ravi'), avatarColors('Ravi')); assert.equal(avatarColors('x').length, 2); });
t('time ago', () => {
  assert.equal(timeAgo('2026-11-07T11:59:50Z', now), 'just now');
  assert.equal(timeAgo('2026-11-07T11:55:00Z', now), '5 min ago');
  assert.equal(timeAgo('2026-11-07T09:00:00Z', now), '3 h ago');
  assert.equal(timeAgo('2026-11-06T09:00:00Z', now), 'yesterday');
  assert.equal(timeAgo('2026-11-04T12:00:00Z', now), '3 days ago');
});
t('time left on a status', () => { assert.equal(timeLeft('2026-11-07T12:30:00Z', now), '30 min left'); assert.equal(timeLeft('2026-11-07T17:00:00Z', now), '5 h left'); assert.equal(timeLeft('2026-11-07T11:00:00Z', now), 'expired'); });
t('workout card facts come from the record', () => {
  const f = workoutFacts({ exercise: 'Push day', duration: 52, setCount: 18, volume: 8400, calories: 310, topSet: { exercise: 'Bench press', weight: 80, reps: 5 } });
  assert.equal(f.title, 'Push day'); assert.equal(f.subtitle, 'Top set: Bench press 80 kg × 5');
  assert.deepEqual(f.stats.map((s) => s.label), ['min', 'sets', 'tonnes', 'kcal']); assert.equal(f.stats[2].value, '8.4');
  assert.deepEqual(workoutFacts({ exercise: 'Run', duration: 20 }).stats, [{ value: '20', label: 'min' }]);
});
t('meal card facts', () => {
  const f = mealFacts({ foodName: 'Dal + Rice', calories: 612.4, protein: 24.2, carbs: 90, fat: 12, mealType: 'lunch' });
  assert.equal(f.subtitle, 'Lunch'); assert.equal(f.stats[0].value, '612'); assert.equal(f.stats.length, 4);
});
t('streak label', () => { assert.equal(streakLabel(1), '1 day in a row'); assert.equal(streakLabel(12), '12 days in a row'); });
t('report reasons match the server', () => { assert.deepEqual(REPORT_REASONS.map((r) => r.key).sort(), ['harassment', 'impersonation', 'inappropriate', 'other', 'self_harm', 'spam']); assert.equal(STORY_THEMES.length, 6); });
console.log(`${n} checks passed`);
