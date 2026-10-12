// API integration tests: business approval and roles, referral rewards, and real-data reports.
// Runs against an in-memory MongoDB (downloaded on first run). Usage: npm run test:api
const assert = require('node:assert/strict');
const path = require('node:path');
const SRC = path.resolve(__dirname, '../src');
const { MongoMemoryServer } = require('mongodb-memory-server');

const DAY = 86400000;
const users = {
  owner:  { id: '11111111-1111-4111-8111-111111111111', email: 'owner@gym.test', created: Date.now() - 400 * DAY },
  ownerB: { id: '22222222-2222-4222-8222-222222222222', email: 'ownerb@gym.test', created: Date.now() - 400 * DAY },
  coach:  { id: '33333333-3333-4333-8333-333333333333', email: 'coach@gym.test', created: Date.now() - 100 * DAY },
  nutri:  { id: '44444444-4444-4444-8444-444444444444', email: 'nutri@gym.test', created: Date.now() - 100 * DAY },
  viewer: { id: '55555555-5555-4555-8555-555555555555', email: 'viewer@gym.test', created: Date.now() - 100 * DAY },
  admin:  { id: '66666666-6666-4666-8666-666666666666', email: 'admin@site.test', created: Date.now() - 400 * DAY },
  maya:   { id: '77777777-7777-4777-8777-777777777777', email: 'maya@members.test', created: Date.now() - 2 * DAY },
  newbie: { id: '88888888-8888-4888-8888-888888888888', email: 'newbie@x.test', created: Date.now() - 1 * DAY },
  newbie2:{ id: '99999999-9999-4999-8999-999999999999', email: 'newbie2@x.test', created: Date.now() - 1 * DAY },
  oldtimer:{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'old@x.test', created: Date.now() - 60 * DAY },
  ref:    { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', email: 'ref@x.test', created: Date.now() - 200 * DAY },
};
process.env.ADMIN_EMAILS = 'admin@site.test';

let pass = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ok  ', name); } catch (e) { console.log('  FAIL', name, '\n      ', e.message); process.exitCode = 1; } };

(async () => {
  const mms = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mms.getUri() + 'reprummble';
  require('ts-node').register({ transpileOnly: true, project: path.resolve(__dirname, '../tsconfig.json') });

  // Stand in for Supabase: token = key of the users map.
  const sup = require(SRC + '/services/supabase.service');
  sup.verifyToken = async (token) => users[token] ? { success: true, user: { id: users[token].id, email: users[token].email, user_metadata: {} } } : { success: false };
  sup.getUserById = async (id) => { const u = Object.values(users).find((x) => x.id === id); return u ? { success: true, user: { id, created_at: new Date(u.created).toISOString() } } : { success: false }; };

  const rl = require(SRC + '/middleware/rateLimit.middleware'); rl.businessApplyLimiter = (q, r, n) => n(); rl.referralClaimLimiter = (q, r, n) => n();
  const express = require('express');
  const { connectDB } = require(SRC + '/config/database');
  await connectDB();
  const app = express();
  app.use(express.json());
  app.use('/api/business', require(SRC + '/routes/business.routes').default);
  app.use('/api/referrals', require(SRC + '/routes/referral.routes').default);
  app.use('/api/reports', require(SRC + '/routes/report.routes').default);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (as, method, path, body) => {
    const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(as ? { Authorization: `Bearer ${as}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const type = r.headers.get('content-type') || '';
    return { status: r.status, body: type.includes('json') ? await r.json() : await r.text() };
  };
  const { Workout } = require(SRC + '/models/Workout.model');
  const { Meal } = require(SRC + '/models/Meal.model');

  console.log('Reports (real data)');
  await t('workouts and meals can be saved for UUID users (was a cast error)', async () => {
    await Workout.create({ userId: users.maya.id, exercise: 'Run', duration: 30, calories: 300, timestamp: new Date(Date.now() - 1 * DAY) });
    await Workout.create({ userId: users.maya.id, exercise: 'Lift', duration: 45, calories: 250, timestamp: new Date(Date.now() - 1 * DAY) });
    await Meal.create({ userId: users.maya.id, foodName: 'Rice', calories: 500, protein: 20, carbs: 90, fat: 5, timestamp: new Date(Date.now() - 1 * DAY) });
    await Workout.create({ userId: users.ref.id, exercise: 'Other person', duration: 99, calories: 999, timestamp: new Date() });
  });
  await t('export requires sign-in', async () => assert.equal((await call(null, 'GET', '/api/reports/export?period=monthly')).status, 401));
  await t('export rejects an unknown period', async () => assert.equal((await call('maya', 'GET', '/api/reports/export?period=weekly')).status, 400));
  await t('monthly CSV has 30 daily rows with this user\'s totals only', async () => {
    const r = await call('maya', 'GET', '/api/reports/export?period=monthly');
    assert.equal(r.status, 200);
    const lines = r.body.trim().split('\n');
    assert.equal(lines.length, 31);
    const day = new Date(Date.now() - DAY).toISOString().slice(0, 10);
    assert.ok(lines.includes(`${day},2,75,550,500,20,90,5`), 'expected row not found:\n' + lines.slice(-4).join('\n'));
    assert.ok(!r.body.includes('999'), 'leaked another user');
  });
  await t('yearly CSV has 12 monthly rows; historical groups by year', async () => {
    assert.equal((await call('maya', 'GET', '/api/reports/export?period=yearly')).body.trim().split('\n').length, 13);
    const h = (await call('maya', 'GET', '/api/reports/export?period=historical')).body.trim().split('\n');
    assert.equal(h.length, 2); assert.match(h[1], /^\d{4},2,75,550,500,20,90,5$/);
  });

  console.log('Referral rewards');
  let code;
  await t('each user gets one stable code', async () => {
    const a = await call('ref', 'GET', '/api/referrals/me'); code = a.body.data.code;
    assert.match(code, /^[A-Z2-9]{8}$/); assert.equal(a.body.data.availablePercent, 0);
    assert.equal((await call('ref', 'GET', '/api/referrals/me')).body.data.code, code);
    assert.ok(a.body.data.link.endsWith('/invite/' + code));
  });
  await t('a new account claims a code: both get 5%', async () => {
    const c = await call('newbie', 'POST', '/api/referrals/claim', { code: code.toLowerCase() });
    assert.equal(c.status, 201); assert.equal(c.body.data.discountPercent, 5);
    const me = (await call('ref', 'GET', '/api/referrals/me')).body.data;
    assert.equal(me.availablePercent, 5); assert.equal(me.invited, 1);
  });
  await t('cannot claim twice, own code, bad code, or on an old account', async () => {
    assert.equal((await call('newbie', 'POST', '/api/referrals/claim', { code })).status, 409);
    assert.equal((await call('ref', 'POST', '/api/referrals/claim', { code })).status, 400);
    assert.equal((await call('newbie2', 'POST', '/api/referrals/claim', { code: 'ZZZZZZZZ' })).status, 404);
    assert.equal((await call('newbie2', 'POST', '/api/referrals/claim', { code: '!!' })).status, 400);
    const old = await call('oldtimer', 'POST', '/api/referrals/claim', { code });
    assert.equal(old.status, 400); assert.match(old.body.message, /new accounts/);
    assert.equal((await call(null, 'POST', '/api/referrals/claim', { code })).status, 401);
  });
  await t('referrer rewards stop at the 25% cap, the new user still gets theirs', async () => {
    const { ReferralCredit, ReferralProfile } = require(SRC + '/models/Referral.model');
    const prof = await ReferralProfile.findOne({ userId: users.ref.id });
    for (let i = 0; i < 4; i++) await ReferralCredit.create({ userId: users.ref.id, percent: 5, reason: 'referral' }); // now 25%
    const c = await call('newbie2', 'POST', '/api/referrals/claim', { code: prof.code });
    assert.equal(c.status, 201); assert.equal(c.body.data.discountPercent, 5);
    assert.equal((await call('ref', 'GET', '/api/referrals/me')).body.data.availablePercent, 25);
  });

  console.log('Business approval');
  await t('apply needs sign-in and valid details', async () => {
    assert.equal((await call(null, 'POST', '/api/business/apply', {})).status, 401);
    assert.equal((await call('owner', 'POST', '/api/business/apply', { name: 'X', type: 'Gym' })).status, 400);
    assert.equal((await call('owner', 'POST', '/api/business/apply', { name: 'Iron Gym', type: 'Spaceship' })).status, 400);
  });
  await t('apply creates a pending application; a second one is refused', async () => {
    assert.equal((await call('owner', 'POST', '/api/business/apply', { name: 'Iron Gym', type: 'Gym', city: 'Austin' })).status, 201);
    assert.equal((await call('owner', 'POST', '/api/business/apply', { name: 'Iron Gym', type: 'Gym' })).status, 409);
    assert.equal((await call('owner', 'GET', '/api/business/me')).body.data.business.status, 'pending');
  });
  await t('a pending business cannot use the dashboard APIs', async () => {
    const r = await call('owner', 'GET', '/api/business/members');
    assert.equal(r.status, 403); assert.equal(r.body.code, 'pending');
  });
  await t('only listed admins can review', async () => {
    assert.equal((await call('owner', 'GET', '/api/business/admin/applications')).status, 403);
    const list = await call('admin', 'GET', '/api/business/admin/applications');
    assert.equal(list.body.data.length, 1);
    const id = list.body.data[0].id;
    assert.equal((await call('owner', 'POST', `/api/business/admin/applications/${id}/approve`)).status, 403);
    assert.equal((await call('admin', 'POST', `/api/business/admin/applications/${id}/approve`)).status, 200);
    assert.equal((await call('admin', 'POST', `/api/business/admin/applications/${id}/approve`)).status, 404, 'already reviewed');
  });
  await t('rejection shows the reason and allows re-applying', async () => {
    await call('ownerB', 'POST', '/api/business/apply', { name: 'Shady', type: 'Gym' });
    const id = (await call('admin', 'GET', '/api/business/admin/applications')).body.data[0].id;
    assert.equal((await call('admin', 'POST', `/api/business/admin/applications/${id}/reject`, { reason: 'Incomplete details' })).status, 200);
    const me = (await call('ownerB', 'GET', '/api/business/me')).body.data.business;
    assert.equal(me.status, 'rejected'); assert.equal(me.rejectionReason, 'Incomplete details');
    assert.equal((await call('ownerB', 'POST', '/api/business/apply', { name: 'Real Gym', type: 'Gym' })).status, 200);
    assert.equal((await call('ownerB', 'GET', '/api/business/me')).body.data.business.status, 'pending');
    const id2 = (await call('admin', 'GET', '/api/business/admin/applications')).body.data[0].id;
    await call('admin', 'POST', `/api/business/admin/applications/${id2}/approve`);
  });

  console.log('Business data');
  let planId, mealId, memberId, planB;
  await t('plans, meal plans, foods validate input and save', async () => {
    assert.equal((await call('owner', 'POST', '/api/business/plans', { name: 'P', level: 'Beginner', weeks: 6, daysPerWeek: 3 })).status, 400);
    assert.equal((await call('owner', 'POST', '/api/business/plans', { name: 'Fat loss', level: 'Beginner', weeks: 99, daysPerWeek: 3 })).status, 400);
    const p = await call('owner', 'POST', '/api/business/plans', { name: 'Fat loss', goal: 'Lose fat', level: 'Beginner', weeks: 6, daysPerWeek: 3, notes: 'n' });
    assert.equal(p.status, 201); planId = p.body.data.id;
    assert.equal((await call('owner', 'POST', '/api/business/meal-plans', { name: 'Cut', calories: 100, protein: 1, carbs: 1, fat: 1, mealsPerDay: 3 })).status, 400);
    const m = await call('owner', 'POST', '/api/business/meal-plans', { name: 'Cut 1800', calories: 1800, protein: 140, carbs: 170, fat: 55, mealsPerDay: 4 });
    assert.equal(m.status, 201); mealId = m.body.data.id;
    assert.equal((await call('owner', 'POST', '/api/business/foods', { name: 'Egg', calories: 70, protein: 6, carbs: 0.5, fat: 5 })).status, 201);
    assert.equal((await call('owner', 'GET', '/api/business/foods')).body.data.length, 1);
    const b = await call('ownerB', 'POST', '/api/business/plans', { name: 'B plan', level: 'Advanced', weeks: 4, daysPerWeek: 5 });
    planB = b.body.data.id;
  });
  await t('members: invite, duplicate refused, bad plan refused', async () => {
    const r = await call('owner', 'POST', '/api/business/members', { name: 'Maya Patel', email: 'Maya@Members.test', planId });
    assert.equal(r.status, 201); memberId = r.body.data.id;
    assert.equal((await call('owner', 'POST', '/api/business/members', { name: 'Maya Again', email: 'maya@members.test' })).status, 409);
    assert.equal((await call('owner', 'POST', '/api/business/members', { name: 'Zed', email: 'not-an-email' })).status, 400);
    assert.equal((await call('owner', 'POST', '/api/business/members', { name: 'Zed Zed', email: 'zed@m.test', planId: 'nope' })).status, 400);
    const list = (await call('owner', 'GET', '/api/business/members')).body.data;
    assert.equal(list.length, 1); assert.equal(list[0].status, 'invited'); assert.equal(list[0].adherence, null);
  });
  await t('one business cannot see or change another business\'s data', async () => {
    assert.equal((await call('ownerB', 'GET', '/api/business/members')).body.data.length, 0);
    assert.equal((await call('ownerB', 'DELETE', `/api/business/members/${memberId}`)).status, 404);
    assert.equal((await call('ownerB', 'PATCH', `/api/business/members/${memberId}`, { planId: planB })).status, 404);
    const mB = await call('ownerB', 'POST', '/api/business/members', { name: 'B Member', email: 'bm@x.test' });
    assert.equal((await call('ownerB', 'PATCH', `/api/business/members/${mB.body.data.id}`, { planId })).status, 400, 'cannot attach another business\'s plan');
    assert.equal((await call('ownerB', 'DELETE', `/api/business/plans/${planId}`)).status, 404);
    assert.equal((await call('owner', 'GET', '/api/business/plans')).body.data.length, 1);
  });
  await t('assign meal plan; invited person links on first sign-in and sees their plans', async () => {
    assert.equal((await call('owner', 'PATCH', `/api/business/members/${memberId}`, { mealPlanId: mealId })).status, 200);
    const mine = await call('maya', 'GET', '/api/business/memberships');
    assert.equal(mine.body.data.length, 1);
    assert.equal(mine.body.data[0].business.name, 'Iron Gym');
    assert.equal(mine.body.data[0].workoutPlan.name, 'Fat loss');
    assert.equal(mine.body.data[0].mealPlan.calories, 1800);
    assert.equal((await call('newbie', 'GET', '/api/business/memberships')).body.data.length, 0);
  });
  await t('stats come from the member\'s real workouts (adherence = last 28 days vs plan)', async () => {
    const s = (await call('owner', 'GET', '/api/business/stats?weeks=4')).body.data;
    assert.equal(s.counts.members, 1); assert.equal(s.counts.active, 1); assert.equal(s.counts.invited, 0);
    assert.equal(s.weeklySessions.length, 4); assert.equal(s.weeklySessions.reduce((a, b) => a + b, 0), 2);
    // 2 sessions in 28 days vs 3/week * 4 = 12 planned
    assert.equal(s.avgAdherence, 17);
    assert.equal(s.adherenceBands.low, 1);
    const m = (await call('owner', 'GET', '/api/business/members')).body.data[0];
    assert.equal(m.status, 'active'); assert.equal(m.sessionsWeek, 2); assert.equal(m.lastActiveDays, 1);
  });

  console.log('Roles');
  await t('owner adds staff; one person cannot join two teams', async () => {
    assert.equal((await call('owner', 'POST', '/api/business/staff', { name: 'Chris Coach', email: 'coach@gym.test', role: 'Coach' })).status, 201);
    assert.equal((await call('owner', 'POST', '/api/business/staff', { name: 'Nina', email: 'nutri@gym.test', role: 'Nutritionist' })).status, 201);
    assert.equal((await call('owner', 'POST', '/api/business/staff', { name: 'Vic', email: 'viewer@gym.test', role: 'Viewer' })).status, 201);
    assert.equal((await call('ownerB', 'POST', '/api/business/staff', { name: 'Chris', email: 'coach@gym.test', role: 'Coach' })).status, 409);
    assert.equal((await call('owner', 'POST', '/api/business/staff', { name: 'Boss', email: 'owner@gym.test', role: 'Coach' })).status, 400);
    assert.equal((await call('owner', 'POST', '/api/business/staff', { name: 'Bad', email: 'bad@x.test', role: 'Admin' })).status, 400);
  });
  await t('coach: manages members and plans, can read but not edit nutrition, no team access', async () => {
    assert.equal((await call('coach', 'GET', '/api/business/me')).body.data.role, 'Coach');
    assert.equal((await call('coach', 'POST', '/api/business/members', { name: 'Walk In', email: 'walk@in.test' })).status, 201);
    assert.equal((await call('coach', 'POST', '/api/business/plans', { name: 'Coach plan', level: 'Beginner', weeks: 4, daysPerWeek: 2 })).status, 201);
    assert.equal((await call('coach', 'GET', '/api/business/foods')).status, 200);
    assert.equal((await call('coach', 'POST', '/api/business/foods', { name: 'Egg2', calories: 1, protein: 1, carbs: 1, fat: 1 })).status, 403);
    assert.equal((await call('coach', 'GET', '/api/business/staff')).status, 403);
    assert.equal((await call('coach', 'PATCH', '/api/business/profile', { name: 'Hacked' })).status, 403);
  });
  await t('nutritionist edits nutrition only; viewer is read-only', async () => {
    assert.equal((await call('nutri', 'POST', '/api/business/foods', { name: 'Oats', calories: 150, protein: 5, carbs: 27, fat: 3 })).status, 201);
    assert.equal((await call('nutri', 'POST', '/api/business/plans', { name: 'No', level: 'Beginner', weeks: 4, daysPerWeek: 2 })).status, 403);
    assert.equal((await call('nutri', 'POST', '/api/business/members', { name: 'No No', email: 'n@n.test' })).status, 403);
    assert.equal((await call('viewer', 'GET', '/api/business/members')).status, 200);
    assert.equal((await call('viewer', 'GET', '/api/business/stats')).status, 200);
    for (const [m, p, b] of [['POST', '/api/business/members', { name: 'V V', email: 'v@v.test' }], ['POST', '/api/business/foods', { name: 'Vv', calories: 1, protein: 1, carbs: 1, fat: 1 }], ['DELETE', `/api/business/plans/${planId}`]]) {
      assert.equal((await call('viewer', m, p, b)).status, 403, `${m} ${p}`);
    }
  });
  await t('owner can update the profile and remove staff; removed staff lose access', async () => {
    assert.equal((await call('owner', 'PATCH', '/api/business/profile', { name: 'Iron Gym Austin', type: 'Gym' })).status, 200);
    const staff = (await call('owner', 'GET', '/api/business/staff')).body.data;
    const coach = staff.find((s) => s.email === 'coach@gym.test');
    assert.equal((await call('owner', 'DELETE', `/api/business/staff/${coach.id}`)).status, 200);
    assert.equal((await call('coach', 'GET', '/api/business/members')).status, 404);
  });
  await t('deleting a plan unassigns it from members', async () => {
    assert.equal((await call('owner', 'DELETE', `/api/business/plans/${planId}`)).status, 200);
    const m = (await call('owner', 'GET', '/api/business/members')).body.data.find((x) => x.email === 'maya@members.test');
    assert.equal(m.planId, null);
  });
  await t('malformed ids and operator injection are rejected', async () => {
    assert.equal((await call('owner', 'DELETE', '/api/business/members/not-an-id')).status, 400);
    assert.equal((await call('owner', 'PATCH', `/api/business/members/${memberId}`, { planId: { $ne: null } })).status, 400);
    assert.equal((await call('owner', 'POST', '/api/business/members', { name: { $gt: '' }, email: 'x@y.test' })).status, 400);
  });

  console.log(`\n${pass} checks passed${process.exitCode ? ' (some FAILED)' : ''}`);
  server.close(); await require('mongoose').disconnect(); await mms.stop();
})().catch((e) => { console.error('Harness error:', e); process.exit(1); });
