import assert from 'node:assert/strict';
import { STATUS_LABEL, isOpen, allowanceLine, whyCannotRequest, safeLink, topicProblem, goalProblem, planTargets, macroKcal, upgradeText } from './coachingLogic.ts';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const list = (o = {}) => ({ premium: true, items: [], limit: 2, used: 0, remaining: 2, resetsOn: '2026-12-01', canRequest: true, ...o });

t('every status has words and a tone; only waiting and booked are open', () => {
  for (const s of ['requested', 'scheduled', 'done', 'cancelled', 'declined']) assert.ok(STATUS_LABEL[s].label && STATUS_LABEL[s].tone, s);
  assert.deepEqual(['requested', 'scheduled', 'done', 'cancelled', 'declined'].map(isOpen), [true, true, false, false, false]);
});
t('the allowance line says how many are left and when they return', () => {
  assert.equal(allowanceLine(list({ remaining: 1 })), '1 of 2 left this month. They come back on 1 December.');
  assert.equal(allowanceLine(list({ remaining: 0, resetsOn: '2027-01-01' })), 'You have used all 2 this month. They come back on 1 January.');
});
t('the request button explains itself when it is off', () => {
  assert.equal(whyCannotRequest(list()), null);
  assert.match(whyCannotRequest(list({ premium: false, canRequest: false })), /Premium/);
  assert.match(whyCannotRequest(list({ canRequest: false, items: [{ status: 'scheduled' }] })), /already have a check-in/);
  assert.match(whyCannotRequest(list({ canRequest: false, remaining: 0 })), /used this month/);
});
t('only secure meeting links are ever opened', () => {
  assert.equal(safeLink('https://meet.example.com/abc'), 'https://meet.example.com/abc');
  for (const bad of ['http://meet.example.com/abc', 'javascript:alert(1)', 'tel:123', 'https://', '', null, undefined, 'https://a b.com']) assert.equal(safeLink(bad), null, String(bad));
});
t('the forms check what the server checks', () => {
  assert.ok(topicProblem('help')); assert.equal(topicProblem('My squat has stalled for a month'), null); assert.ok(topicProblem('x'.repeat(601)));
  assert.ok(goalProblem('  ')); assert.equal(goalProblem('lose 5 kg'), null);
});
t('a plan sets calories, protein and water as your daily targets, and its macros add up', () => {
  const p = { calories: 2200, protein: 150, carbs: 240, fat: 70, water: 8, meals: [], notes: '' };
  assert.deepEqual(planTargets(p), { calories: 2200, protein: 150, water: 8 }); assert.equal(macroKcal(p), 2190);
});
t('an upgrade answer from the server is turned into a message', () => {
  assert.match(upgradeText({ response: { status: 402, data: { code: 'upgrade_required', message: 'Coach check-ins is part of the Premium plan.' } } }), /Premium/);
  assert.equal(upgradeText({ response: { status: 500, data: {} } }), null); assert.equal(upgradeText({}), null);
});
console.log(`${n} checks passed`);
