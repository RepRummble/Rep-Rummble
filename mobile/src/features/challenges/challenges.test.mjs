import assert from 'node:assert/strict';
import { PRESETS, PACES, targetFor, standing, ranked, leader, daysLeftLabel, paceLabel, gridCells, nextStep, invitedCount, createErrorMessage } from './challengeLogic.ts';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const prog = (done, extra = {}) => ({ done, target: 22, pct: Math.round((done / 22) * 100), streak: 0, todayDone: false, grid: 'dm', onTrack: true, completed: false, ...extra });
const mem = (id, done, extra = {}) => ({ _id: id, displayName: id, isMe: id === 'me', status: 'joined', progress: prog(done), ...extra });
const ch = (members, extra = {}) => ({ _id: 'c', title: 't', days: 30, perWeek: 5, target: 22, startKey: '', endKey: '', state: 'active', dayNumber: 3, daysLeft: 20, isCreator: true, myStatus: 'joined', members, ...extra });

t('presets: 30, 60 and 90 days at 3, 5 or every day', () => {
  assert.deepEqual(PRESETS.map((p) => p.days), [30, 60, 90]); assert.deepEqual(PACES.map((p) => p.perWeek), [3, 5, 7]);
  assert.equal(targetFor(30, 5), 22); assert.equal(targetFor(90, 7), 90); assert.equal(paceLabel(7), 'Every day'); assert.equal(paceLabel(3), '3 days a week');
});
t('standing is worded honestly: on track, behind, done, invited, finished', () => {
  const c = ch([]);
  assert.deepEqual(standing(mem('a', 8), c), { text: '8 of 22 days · on track', tone: 'good' });
  assert.deepEqual(standing(mem('a', 2, { progress: prog(2, { onTrack: false }) }), c), { text: '2 of 22 days · behind pace', tone: 'warn' });
  assert.equal(standing(mem('a', 22, { progress: prog(22, { completed: true }) }), c).tone, 'good'); assert.match(standing(mem('a', 22, { progress: prog(22, { completed: true }) }), c).text, /done/);
  assert.deepEqual(standing({ ...mem('a', 0), status: 'invited', progress: null }, c), { text: 'Invited, not joined yet', tone: 'muted' });
  assert.match(standing(mem('a', 10), ch([], { state: 'finished' })).text, /finished/);
});
t('ranking uses days done; invited people are not ranked; a leader needs a real lead', () => {
  const c = ch([mem('me', 5), mem('b', 9), { ...mem('c', 0), status: 'invited', progress: null }, mem('d', 9)]);
  assert.deepEqual(ranked(c).map((m) => m._id), ['b', 'd', 'me']); assert.equal(leader(c), null);
  assert.equal(leader(ch([mem('me', 5), mem('b', 9)]))._id, 'b'); assert.equal(leader(ch([mem('me', 5)])), null);
  assert.equal(invitedCount(c), 1);
});
t('time left and the tracker cells', () => {
  assert.equal(daysLeftLabel({ state: 'active', daysLeft: 12 }), '12 days left'); assert.equal(daysLeftLabel({ state: 'active', daysLeft: 1 }), 'Last day'); assert.equal(daysLeftLabel({ state: 'finished', daysLeft: 0 }), 'Finished');
  assert.deepEqual(gridCells('dmtf'), ['done', 'missed', 'today', 'future']);
});
t('the next step tells the person what to do', () => {
  assert.match(nextStep(ch([mem('me', 3)])), /Log a workout today/);
  assert.match(nextStep(ch([mem('me', 3, { progress: prog(3, { todayDone: true }) })])), /Today is done/);
  assert.match(nextStep(ch([mem('me', 22, { progress: prog(22, { completed: true }) })])), /hit your target/);
  assert.match(nextStep(ch([], { myStatus: 'invited' })), /Join/); assert.match(nextStep(ch([mem('me', 22, { progress: prog(22, { completed: true }) })], { state: 'finished' })), /finished/);
});
t('errors', () => { assert.equal(createErrorMessage(429, 'Too many'), 'Too many'); assert.match(createErrorMessage(undefined), /connection/); });
console.log(`${n} checks passed`);
