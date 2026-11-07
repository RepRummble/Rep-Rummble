import assert from 'node:assert/strict';
import { platformSupport, syncedLabel, statusInfo, isAppleWatchSource, galaxySource, galaxyLabel, localDayKey, connectErrorMessage, contributions, latestDay, DEVICE_ORDER, DEVICE_INFO } from './devicesLogic.ts';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const now = new Date('2026-11-07T12:00:00Z');

t('all five supported devices are described, in order', () => {
  assert.deepEqual(DEVICE_ORDER, ['apple_watch', 'galaxy_watch', 'fitbit', 'whoop', 'oura']);
  for (const id of DEVICE_ORDER) assert.ok(DEVICE_INFO[id].name && DEVICE_INFO[id].how && DEVICE_INFO[id].gives);
});
t('Apple Watch needs an iPhone, Galaxy Watch an Android phone, the rest work on both', () => {
  assert.equal(platformSupport('apple_watch', 'ios').ok, true); assert.equal(platformSupport('apple_watch', 'android').ok, false);
  assert.equal(platformSupport('galaxy_watch', 'android').ok, true); assert.equal(platformSupport('galaxy_watch', 'ios').ok, false);
  for (const id of ['fitbit', 'whoop', 'oura']) for (const os of ['ios', 'android']) assert.equal(platformSupport(id, os).ok, true);
  assert.match(platformSupport('galaxy_watch', 'ios').why, /Android/);
});
t('sync labels', () => {
  assert.equal(syncedLabel(null, now), 'Not synced yet'); assert.equal(syncedLabel('2026-11-07T11:59:30Z', now), 'Synced just now');
  assert.equal(syncedLabel('2026-11-07T11:50:00Z', now), 'Synced 10 min ago'); assert.equal(syncedLabel('2026-11-07T09:00:00Z', now), 'Synced 3 h ago'); assert.equal(syncedLabel('2026-11-05T12:00:00Z', now), 'Synced 2 days ago');
});
t('status is honest about problems', () => {
  const base = { label: 'x', connectedAt: '', lastSyncAt: '2026-11-07T11:00:00Z', lastError: null };
  assert.deepEqual(statusInfo({ ...base, status: 'connected' }, now), { label: 'Connected', tone: 'good', detail: 'Synced 1 h ago' });
  assert.equal(statusInfo({ ...base, status: 'needs_reauth' }, now).tone, 'warn');
  assert.equal(statusInfo({ ...base, status: 'error', lastError: 'The service did not respond.' }, now).detail, 'The service did not respond.');
});
t('only a real Apple Watch counts as an Apple Watch', () => {
  assert.equal(isAppleWatchSource('Sam’s Apple Watch'), true); assert.equal(isAppleWatchSource('Sam’s iPhone'), false); assert.equal(isAppleWatchSource('Strava'), false);
});
t('Galaxy Watch is told apart from a Samsung phone', () => {
  assert.equal(galaxySource('com.sec.android.app.shealth', { model: 'SM-R960' }), 'watch');
  assert.equal(galaxySource('com.sec.android.app.shealth', { type: 1 }), 'watch');
  assert.equal(galaxySource('com.sec.android.app.shealth', { model: 'SM-S928B', type: 2 }), 'samsung_health');
  assert.equal(galaxySource('com.sec.android.app.shealth', undefined), 'samsung_health');
  assert.equal(galaxySource('com.google.android.apps.fitness', { model: 'SM-R960' }), null);
  assert.equal(galaxyLabel('SM-R960'), 'Galaxy Watch (SM-R960)'); assert.equal(galaxyLabel(undefined), 'Galaxy Watch');
});
t('local day key uses the phone’s own calendar day', () => { assert.equal(localDayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05'); assert.equal(localDayKey(new Date(2026, 11, 31, 0, 1)), '2026-12-31'); });
t('error messages say what to do', () => {
  assert.match(connectErrorMessage('not_linked', 'Fitbit'), /link your Google account/); assert.match(connectErrorMessage('denied', 'WHOOP'), /did not allow/); assert.match(connectErrorMessage('???', 'Oura Ring'), /Oura Ring/);
});
t('a device card lists only the numbers that device reported', () => {
  const day = { date: '2026-11-07', steps: { value: 9000, source: 'apple_watch' }, sleepHours: { value: 7.5, source: 'oura' }, recovery: { value: 81, source: 'whoop' }, strain: { value: 12.4, source: 'whoop' }, hrv: { value: 48, source: 'oura' } };
  assert.deepEqual(contributions(day, 'whoop'), ['81% recovery', '12.4 strain']);
  assert.deepEqual(contributions(day, 'oura'), ['7.5 h sleep', '48 ms HRV']);
  assert.deepEqual(contributions(day, 'fitbit'), []); assert.deepEqual(contributions(undefined, 'oura'), []);
});
t('latest day with any reading', () => {
  assert.equal(latestDay([{ date: '2026-11-05', steps: { value: 1, source: 'oura' } }, { date: '2026-11-07' }, { date: '2026-11-06', steps: { value: 2, source: 'oura' } }]).date, '2026-11-06');
  assert.equal(latestDay([]), undefined);
});
console.log(`${n} checks passed`);
