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
  // Same email as a real person but never verified (someone who signed up with an address they don't own).
  lateFake:  { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', email: 'late@gym.test', created: Date.now() - 1 * DAY, verified: false },
  lateReal:  { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', email: 'late@gym.test', created: Date.now() - 1 * DAY },
  inviteFake:{ id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', email: 'invitee@members.test', created: Date.now() - 1 * DAY, verified: false },
  inviteReal:{ id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', email: 'invitee@members.test', created: Date.now() - 1 * DAY },
  adminFake: { id: '12121212-1212-4212-8212-121212121212', email: 'admin@site.test', created: Date.now() - 1 * DAY, verified: false },
  leaver:    { id: '16161616-1616-4616-8616-161616161616', email: 'leaver@x.test', created: Date.now() - 1 * DAY },
  ghost:     { id: '17171717-1717-4717-8717-171717171717', email: 'ghost@x.test', created: Date.now() - 50 * DAY, noAdmin: true },
  dash:      { id: '15151515-1515-4515-8515-151515151515', email: 'dash@x.test', created: Date.now() - 100 * DAY },
  ownerC:    { id: '14141414-1414-4414-8414-141414141414', email: 'ownerc@gym.test', created: Date.now() - 400 * DAY },
  bill:      { id: '18181818-1818-4818-8818-181818181818', email: 'bill@x.test', created: Date.now() - 20 * DAY },
  billB:     { id: '19191919-1919-4919-8919-191919191919', email: 'billb@x.test', created: Date.now() - 20 * DAY },
  billC:     { id: '1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a1a', email: 'billc@x.test', created: Date.now() - 20 * DAY },
  billD:     { id: '1b1b1b1b-1b1b-4b1b-8b1b-1b1b1b1b1b1b', email: 'billd@x.test', created: Date.now() - 20 * DAY },
  billGym:   { id: '1c1c1c1c-1c1c-4c1c-8c1c-1c1c1c1c1c1c', email: 'billgym@x.test', created: Date.now() - 20 * DAY },
  twin:      { id: '1d1d1d1d-1d1d-4d1d-8d1d-1d1d1d1d1d1d', email: 'twin@x.test', created: Date.now() - 20 * DAY },
  twinFake:  { id: '1e1e1e1e-1e1e-4e1e-8e1e-1e1e1e1e1e1e', email: 'twin@x.test', created: Date.now() - 1 * DAY, verified: false },
  unver:     { id: '13131313-1313-4313-8313-131313131313', email: 'unver@x.test', created: Date.now() - 1 * DAY, verified: false },
};
process.env.ADMIN_EMAILS = 'admin@site.test';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
process.env.STRIPE_PRICE_PRO = 'price_pro';
process.env.STRIPE_PRICE_PREMIUM = 'price_premium';

let pass = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ok  ', name); } catch (e) { console.log('  FAIL', name, '\n      ', e.message); process.exitCode = 1; } };

(async () => {
  const mms = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mms.getUri() + 'reprummble';
  require('ts-node').register({ transpileOnly: true, project: path.resolve(__dirname, '../tsconfig.json') });

  // Stand in for Supabase: token = key of the users map.
  const sup = require(SRC + '/services/supabase.service');
  // A JWT-shaped token for a person, optionally carrying a client_id like Supabase's OAuth server adds.
  const jwtFor = (key, claims) => 'h.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.s';
  const firstParty = jwtFor('owner', { sub: users.owner.id });
  const thirdParty = jwtFor('owner', { sub: users.owner.id, client_id: 'c-1234' });
  const realVerify = async (token) => users[token] ? { success: true, user: { id: users[token].id, email: users[token].email, user_metadata: {}, email_confirmed_at: users[token].verified === false ? null : new Date().toISOString() } } : { success: false };
  sup.verifyToken = async (token) => (token === firstParty || token === thirdParty) ? realVerify('owner') : realVerify(token);
  sup.getUserById = async (id) => { const u = Object.values(users).find((x) => x.id === id); if (u && u.noAdmin) return { success: false, error: 'service unreachable' }; return u ? { success: true, user: { id, created_at: new Date(u.created).toISOString() } } : { success: false }; };

  const rl = require(SRC + '/middleware/rateLimit.middleware'); rl.businessApplyLimiter = (q, r, n) => n(); rl.referralClaimLimiter = (q, r, n) => n(); rl.authLimiter = (q, r, n) => n(); rl.loginLimiter = (q, r, n) => n(); rl.resendLimiter = (q, r, n) => n(); rl.refreshLimiter = (q, r, n) => n();
  const realPerUserLimiter = rl.perUserLimiter; // kept for its own tests below
  const realPerIpLimiter = rl.perIpLimiter;
  rl.perUserLimiter = () => (q, r, n) => n();
  rl.perIpLimiter = () => (q, r, n) => n();
  const sent = [];
  require(SRC + '/services/mail.service').sendMail = async (to, subject, body) => { sent.push({ to, subject, body }); return true; };
  const resent = [];
  let signUpMode = 'verify'; // 'verify' = Supabase "Confirm email" is on; 'open' = it is off
  sup.signUpWithEmail = async (email) => {
    if (signUpMode === 'existing') return { success: true, user: { id: 'x', email, identities: [] }, needsVerification: true, alreadyRegistered: true };
    return signUpMode === 'verify'
      ? { success: true, user: { id: 'new-1', email, user_metadata: {} }, needsVerification: true }
      : { success: true, user: { id: 'new-2', email, user_metadata: {} }, session: { access_token: 'sb-access', refresh_token: 'sb-refresh' }, needsVerification: false };
  };
  sup.signInWithEmail = async (email, password) => password === 'right-but-unverified' ? { success: false, error: 'Email not confirmed' } : { success: false, error: 'Invalid login credentials' };
  let deleteMode = 'ok'; const deletedAuth = [];
  sup.deleteUser = async (id) => { if (deleteMode === 'fail') return { success: false, error: 'Database error deleting user' }; deletedAuth.push(id); return { success: true }; };
  const goodRefresh = new Set(['refresh-good']);
  sup.refreshSession = async (token) => goodRefresh.delete(token) ? { success: true, user: { id: users.maya.id, email: users.maya.email, user_metadata: { displayName: 'Maya' } }, session: { access_token: 'access-2', refresh_token: 'refresh-2' } } : { success: false, error: 'Invalid Refresh Token: Already Used' };
  sup.resendVerification = async (email) => { resent.push(email); };
  const express = require('express');
  const { connectDB } = require(SRC + '/config/database');
  await connectDB();
  const { createFakeStripe } = require('./fake-stripe');
  const fake = createFakeStripe();
  require(SRC + '/services/stripe-client').setStripeClient(fake.stripe);
  const app = express();
  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), require(SRC + '/controllers/billing.controller').stripeWebhook);
  app.use(express.json());
  app.use('/api/billing', require(SRC + '/routes/billing.routes').default);
  app.use('/api/auth', require(SRC + '/routes/auth.routes').default);
  app.use('/api/business', require(SRC + '/routes/business.routes').default);
  app.use('/api/referrals', require(SRC + '/routes/referral.routes').default);
  app.use('/api/reports', require(SRC + '/routes/report.routes').default);
  app.use('/api/analytics', require(SRC + '/routes/analytics.routes').default);
  app.use('/api/wearables', require(SRC + '/routes/wearable.routes').default);
  // Unique indexes (e.g. one member per email per business) are built in the background on a fresh
  // database. Wait for them, or a fast test can slip a duplicate in before the index exists.
  await Promise.all(Object.values(require('mongoose').models).map((m) => m.init()));
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


  console.log('Email verification');
  await t('sign-up with verification on: accepted, but no token is issued', async () => {
    signUpMode = 'verify';
    const r = await call(null, 'POST', '/api/auth/register', { email: 'new@x.test', password: 'a-long-password', displayName: 'New' });
    assert.equal(r.status, 202);
    assert.equal(r.body.data.emailVerificationRequired, true);
    assert.equal(r.body.data.token, undefined, 'must not hand out a token before the email is confirmed');
    assert.equal(JSON.stringify(r.body).includes('token'), false);
  });
  await t('sign-up with an email that already exists looks identical (no account enumeration)', async () => {
    signUpMode = 'existing';
    const r = await call(null, 'POST', '/api/auth/register', { email: 'new@x.test', password: 'a-long-password' });
    assert.equal(r.status, 202); assert.equal(r.body.data.emailVerificationRequired, true);
  });
  await t('sign-up with verification off: signed in straight away with the Supabase session', async () => {
    signUpMode = 'open';
    const r = await call(null, 'POST', '/api/auth/register', { email: 'open@x.test', password: 'a-long-password' });
    assert.equal(r.status, 201); assert.equal(r.body.data.token, 'sb-access'); assert.equal(r.body.data.emailVerificationRequired, false);
  });
  await t('register rejects missing or non-string fields', async () => {
    assert.equal((await call(null, 'POST', '/api/auth/register', { email: 'a@b.test' })).status, 400);
    assert.equal((await call(null, 'POST', '/api/auth/register', { email: { $ne: '' }, password: 'x' })).status, 400);
  });
  await t('signing in before verifying gives a clear message; wrong passwords stay generic', async () => {
    const r = await call(null, 'POST', '/api/auth/login', { email: 'new@x.test', password: 'right-but-unverified' });
    assert.equal(r.status, 403); assert.equal(r.body.code, 'email_not_verified');
    assert.equal((await call(null, 'POST', '/api/auth/login', { email: 'new@x.test', password: 'nope' })).status, 401);
  });
  await t('resend gives the same answer for any address, and only sends for valid ones', async () => {
    const a = await call(null, 'POST', '/api/auth/resend-verification', { email: 'someone@x.test' });
    const b = await call(null, 'POST', '/api/auth/resend-verification', { email: 'not an email' });
    assert.equal(a.status, 200); assert.equal(b.status, 200); assert.deepEqual(a.body, b.body);
    assert.deepEqual(resent, ['someone@x.test']);
  });
  await t('an unverified account cannot apply as a business', async () => {
    const r = await call('unver', 'POST', '/api/business/apply', { name: 'Fake Gym', type: 'Gym' });
    assert.equal(r.status, 403); assert.match(r.body.message, /verify/i);
  });
  await t('an unverified account cannot use an admin email to review applications', async () => {
    assert.equal((await call('adminFake', 'GET', '/api/business/admin/applications')).status, 403);
    assert.equal((await call('admin', 'GET', '/api/business/admin/applications')).status, 200, 'the verified admin still can');
  });
  await t('team access by email needs a verified email', async () => {
    assert.equal((await call('owner', 'POST', '/api/business/staff', { name: 'Late Coach', email: 'late@gym.test', role: 'Coach' })).status, 201);
    const fake = await call('lateFake', 'GET', '/api/business/me');
    assert.equal(fake.body.data.business, null, 'unverified sign-up must not inherit the team seat');
    assert.equal((await call('lateFake', 'GET', '/api/business/members')).status, 404);
    const real = await call('lateReal', 'GET', '/api/business/me');
    assert.equal(real.body.data.role, 'Coach');
  });
  await t('an invite is only linked to a verified email', async () => {
    assert.equal((await call('owner', 'POST', '/api/business/members', { name: 'Invitee', email: 'invitee@members.test' })).status, 201);
    assert.deepEqual((await call('inviteFake', 'GET', '/api/business/memberships')).body.data, []);
    const stillInvited = (await call('owner', 'GET', '/api/business/members')).body.data.find((m) => m.email === 'invitee@members.test');
    assert.equal(stillInvited.status, 'invited', 'an unverified account must not link the invite');
    assert.equal((await call('inviteReal', 'GET', '/api/business/memberships')).body.data.length, 1);
  });


  console.log('Admin review');
  await t('reviewers see an admin flag and the pending count; everyone else does not', async () => {
    const a = (await call('admin', 'GET', '/api/business/admin/status')).body.data;
    assert.equal(a.isAdmin, true); assert.equal(typeof a.pending, 'number');
    assert.deepEqual((await call('owner', 'GET', '/api/business/admin/status')).body.data, { isAdmin: false });
    assert.deepEqual((await call('adminFake', 'GET', '/api/business/admin/status')).body.data, { isAdmin: false }, 'unverified email never counts as admin');
    assert.equal((await call(null, 'GET', '/api/business/admin/status')).status, 401);
  });
  await t('a new application emails the reviewers', async () => {
    sent.length = 0;
    assert.equal((await call('ownerC', 'POST', '/api/business/apply', { name: 'Peak Fitness', type: 'Studio', city: 'Denver' })).status, 201);
    const mail = sent.find((m) => /Peak Fitness/.test(m.subject));
    assert.ok(mail, 'no reviewer email'); assert.deepEqual(mail.to, ['admin@site.test']); assert.match(mail.body, /\/admin\/applications/);
    assert.equal((await call('admin', 'GET', '/api/business/admin/status')).body.data.pending, 1);
  });
  await t('approving emails the applicant and opens the dashboard', async () => {
    sent.length = 0;
    const id = (await call('admin', 'GET', '/api/business/admin/applications')).body.data.find((a) => a.name === 'Peak Fitness').id;
    assert.equal((await call('admin', 'POST', `/api/business/admin/applications/${id}/approve`)).status, 200);
    const mail = sent.find((m) => m.to === 'ownerc@gym.test'); assert.ok(mail); assert.match(mail.subject, /approved/i); assert.match(mail.body, /\/business/);
    assert.equal((await call('ownerC', 'GET', '/api/business/members')).status, 200);
  });
  await t('revoking turns access off at once, emails the owner, and cannot be applied twice', async () => {
    const id = (await call('admin', 'GET', '/api/business/admin/applications?status=approved')).body.data.find((a) => a.name === 'Peak Fitness').id;
    assert.equal((await call('owner', 'POST', `/api/business/admin/applications/${id}/revoke`, { reason: 'x' })).status, 403, 'only reviewers can revoke');
    sent.length = 0;
    assert.equal((await call('admin', 'POST', `/api/business/admin/applications/${id}/revoke`, { reason: 'Terms breach' })).status, 200);
    const mail = sent.find((m) => m.to === 'ownerc@gym.test'); assert.ok(mail); assert.match(mail.body, /Terms breach/);
    const blocked = await call('ownerC', 'GET', '/api/business/members');
    assert.equal(blocked.status, 403); assert.equal(blocked.body.code, 'rejected');
    assert.equal((await call('admin', 'POST', `/api/business/admin/applications/${id}/revoke`)).status, 404, 'already revoked');
    assert.equal((await call('ownerC', 'GET', '/api/business/me')).body.data.business.rejectionReason, 'Terms breach');
  });
  await t('only pending applications can be approved or rejected, and a revoked business can re-apply', async () => {
    const id = (await call('admin', 'GET', '/api/business/admin/applications?status=rejected')).body.data.find((a) => a.name === 'Peak Fitness').id;
    assert.equal((await call('admin', 'POST', `/api/business/admin/applications/${id}/approve`)).status, 404);
    assert.equal((await call('ownerC', 'POST', '/api/business/apply', { name: 'Peak Fitness', type: 'Studio' })).status, 200);
    assert.equal((await call('ownerC', 'GET', '/api/business/me')).body.data.business.status, 'pending');
  });


  console.log('Third-party OAuth tokens');
  await t('our own sign-in token works, a token issued to a third-party app is refused', async () => {
    assert.equal((await call(firstParty, 'GET', '/api/business/me')).status, 200);
    const r = await call(thirdParty, 'GET', '/api/business/me');
    assert.equal(r.status, 403); assert.match(r.body.message, /third-party/i);
    assert.equal((await call(thirdParty, 'GET', '/api/referrals/me')).status, 403);
    assert.equal((await call(thirdParty, 'GET', '/api/reports/export?period=monthly')).status, 403);
  });


  console.log('Hardening (from the security scan)');
  const { isEmail } = require(SRC + '/utils/validation');
  await t('email check accepts normal addresses and rejects malformed ones', async () => {
    for (const ok of ['a@b.co', 'first.last+tag@sub.example.com', 'x@y-z.org']) assert.equal(isEmail(ok), true, ok);
    for (const bad of ['', 'a', 'a@b', 'a@b.', 'a@.com', 'a@b..c', 'a b@c.com', 'a@@b.com', '@b.com', 'a@b.c@d.com']) assert.equal(isEmail(bad), false, bad);
    assert.equal(isEmail('a'.repeat(250) + '@b.co'), false, 'over 254 characters');
  });
  await t('email check stays fast on input crafted to make the old regex slow', async () => {
    const old = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const ms = (fn) => { const t0 = process.hrtime.bigint(); fn(); return Number(process.hrtime.bigint() - t0) / 1e6; };
    const attack = '!@!.'.repeat(5000) + '!'; // 20,000 characters, the pattern GitHub flagged
    const oldMs = ms(() => old.test(attack));
    const newMs = ms(() => isEmail(attack));
    console.log(`        20,000-character attack: old regex ${oldMs.toFixed(0)} ms, new check ${newMs.toFixed(3)} ms`);
    assert.ok(newMs < 5, `new check took ${newMs} ms`);
    assert.equal(isEmail(attack), false);
  });
  await t('sign-up rejects an invalid email before it reaches Supabase or the database', async () => {
    signUpMode = 'verify';
    assert.equal((await call(null, 'POST', '/api/auth/register', { email: 'not-an-email', password: 'a-long-password' })).status, 400);
    assert.equal((await call(null, 'POST', '/api/auth/register', { email: '!@!.'.repeat(300), password: 'a-long-password' })).status, 400);
  });
  await t('sign-up cannot be used to read or overwrite other users by sending query operators', async () => {
    const { User } = require(SRC + '/models/User.model');
    // Inserted directly: saving a User through the model currently fails on Mongoose 9 (old next() hook).
    await User.collection.insertOne({ email: 'victim@x.test', password: 'x', displayName: 'Victim', role: 'user' });
    const r = await call(null, 'POST', '/api/auth/register', { email: { $ne: 'nobody' }, password: 'a-long-password', displayName: 'Hacked' });
    assert.equal(r.status, 400);
    const v = await User.findOne({ email: 'victim@x.test' });
    assert.equal(v.displayName, 'Victim', 'existing record must be untouched');
    const r2 = await call(null, 'POST', '/api/auth/register', { email: 'fresh@x.test', password: 'a-long-password', displayName: { $set: { role: 'admin' } } });
    assert.equal(r2.status, 202);
    assert.equal((await User.findOne({ email: 'fresh@x.test' })).displayName, '', 'non-text display name is dropped');
  });
  await t('referral code lookups treat operators as plain text', async () => {
    assert.equal((await call('newbie', 'POST', '/api/referrals/claim', { code: { $ne: '' } })).status, 400);
  });
  await t('per-IP limiter sits in front of sign-in checks, so floods of junk tokens are stopped first', async () => {
    const guarded = express();
    let authChecks = 0;
    guarded.use(realPerIpLimiter(3, 60_000));
    guarded.use((req, res) => { authChecks++; res.status(401).json({ success: false }); }); // stands in for `protect`
    const srv = guarded.listen(0);
    const hit = () => fetch(`http://127.0.0.1:${srv.address().port}/x`, { headers: { Authorization: 'Bearer junk' } }).then((r) => r.status);
    assert.deepEqual([await hit(), await hit(), await hit(), await hit(), await hit()], [401, 401, 401, 429, 429]);
    assert.equal(authChecks, 3, 'the sign-in check must not run once the limit is hit');
    srv.close();
  });
  await t('per-user limiter: each person has their own allowance, and the limit holds', async () => {
    const limited = express();
    limited.use((req, res, next) => { req.user = { id: req.headers['x-user'] }; next(); });
    limited.use(realPerUserLimiter(3, 60_000));
    limited.get('/x', (req, res) => res.json({ ok: true }));
    const srv = limited.listen(0);
    const hit = (user) => fetch(`http://127.0.0.1:${srv.address().port}/x`, { headers: { 'x-user': user } }).then((r) => r.status);
    assert.deepEqual([await hit('a'), await hit('a'), await hit('a'), await hit('a')], [200, 200, 200, 429]);
    assert.equal(await hit('b'), 200, 'another person is not affected');
    srv.close();
  });


  console.log('Model save hooks (Mongoose 9)');
  const mongoose = require('mongoose');
  await t('a User can be saved and the password is hashed', async () => {
    const { User } = require(SRC + '/models/User.model');
    const u = await new User({ email: 'hash@x.test', password: 'plain-text-pw' }).save();
    const stored = await User.findById(u._id).select('+password');
    assert.notEqual(stored.password, 'plain-text-pw');
    assert.equal(await stored.comparePassword('plain-text-pw'), true);
    assert.equal(await stored.comparePassword('wrong'), false);
    stored.displayName = 'Renamed'; await stored.save(); // unchanged password is not hashed again
    assert.equal(await (await User.findById(u._id).select('+password')).comparePassword('plain-text-pw'), true);
  });
  await t('an Exercise gets its slug from its name', async () => {
    const { Exercise } = require(SRC + '/models/Exercise.model');
    const e = await new Exercise({ name: 'Push-Ups (Wide!)', category: 'strength', difficulty: 'beginner', description: 'd', instructions: ['i'] }).save();
    assert.equal(e.slug, 'push-ups-wide');
  });
  await t('a WorkoutPlan counts its training days', async () => {
    const { WorkoutPlan } = require(SRC + '/models/WorkoutPlan.model');
    const day = (n, rest) => ({ day: n, name: 'D' + n, focus: 'f', exercises: [], estimatedDuration: 30, estimatedCalories: 200, isRestDay: rest });
    const plan = await new WorkoutPlan({ userId: new mongoose.Types.ObjectId(), name: 'P', description: 'd', goal: 'strength', fitnessLevel: 'beginner', durationWeeks: 4, daysPerWeek: 3, minutesPerWorkout: 30, schedule: [day(1, false), day(2, true), day(3, false)] }).save();
    assert.equal(plan.totalWorkouts, 8); // 2 training days x 4 weeks
  });
  await t('a WorkoutSession totals its reps and sets and awards XP', async () => {
    const { WorkoutSession } = require(SRC + '/models/WorkoutSession.model');
    const oid = new mongoose.Types.ObjectId();
    const sess = await new WorkoutSession({ userId: oid, workoutPlanId: oid, exercises: [
      { exerciseName: 'Squat', completedSets: 3, completedReps: 30, averageFormScore: 90 },
      { exerciseName: 'Push-up', completedSets: 2, completedReps: 20, averageFormScore: 70 },
    ] }).save();
    assert.equal(sess.totalReps, 50); assert.equal(sess.totalSets, 5);
    assert.equal(sess.overallFormScore, 80); assert.equal(sess.xpEarned, 40); // 2 x 10 + 20 for good form
  });


  console.log('Dashboard analytics, history and PDF');
  const zlib = require('node:zlib');
  /** Text of a PDF made by pdfkit: inflate each stream and decode its hex-encoded strings. */
  const pdfText = (buf) => {
    const raw = buf.toString('latin1'); let out = '';
    for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
      let data; try { data = zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1'); } catch { continue; }
      for (const h of data.matchAll(/<([0-9a-fA-F]+)>/g)) out += Buffer.from(h[1], 'hex').toString('latin1');
      out += ' ';
    }
    return out;
  };
  const at = (daysAgo, hour = 12) => { const d = new Date(Date.now() - daysAgo * DAY); d.setUTCHours(hour, 0, 0, 0); return d; };
  await Workout.create({ userId: users.dash.id, exercise: 'Squat', duration: 30, calories: 250, timestamp: at(0, 8) });
  await Workout.create({ userId: users.dash.id, exercise: 'Bench press', duration: 40, calories: 300, timestamp: at(1) });
  await Workout.create({ userId: users.dash.id, exercise: 'Run', duration: 20, calories: 200, timestamp: at(2) });
  await Workout.create({ userId: users.dash.id, exercise: 'Row', duration: 25, calories: 180, timestamp: at(10) });
  await Meal.create({ userId: users.dash.id, foodName: 'Oats', calories: 400, protein: 20, carbs: 60, fat: 10, mealType: 'breakfast', timestamp: at(0, 7) });
  await Meal.create({ userId: users.dash.id, foodName: 'Chicken and rice', calories: 700, protein: 50, carbs: 80, fat: 15, mealType: 'lunch', timestamp: at(1) });
  await Workout.create({ userId: users.ref.id, exercise: 'SOMEONE ELSES SECRET', duration: 99, calories: 999, timestamp: at(0) });

  await t('analytics needs sign-in; the overview adds up this person\'s data only', async () => {
    assert.equal((await call(null, 'GET', '/api/analytics/overview')).status, 401);
    const d = (await call('dash', 'GET', '/api/analytics/overview')).body.data;
    assert.equal(d.totals.workouts, 4); assert.equal(d.totals.minutes, 115); assert.equal(d.totals.burned, 930);
    assert.equal(d.totals.meals, 2); assert.equal(d.totals.calories, 1100);
    assert.equal(d.week.workouts, 3); assert.equal(d.week.minutes, 90); assert.equal(d.week.activeDays, 3);
    assert.equal(d.today.calories, 400); assert.equal(d.today.protein, 20);
    assert.equal(d.daily.length, 30); assert.equal(d.daily[29].workouts, 1);
    assert.equal(d.recentWorkouts.length, 4); assert.equal(d.recentWorkouts[0].exercise, 'Squat');
    assert.equal(d.recentMeals[0].name, 'Oats');
    assert.ok(!JSON.stringify(d).includes('SOMEONE ELSES'), 'leaked another person');
  });
  await t('streaks: three days in a row now, the older workout does not extend it', async () => {
    const d = (await call('dash', 'GET', '/api/analytics/overview')).body.data;
    assert.equal(d.streak.current, 3); assert.equal(d.streak.longest, 3);
    const { streaks } = require(SRC + '/services/activity.service');
    const day = (n) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
    assert.deepEqual(streaks(new Set([day(1), day(2)])), { current: 2, longest: 2 }, 'today not logged yet does not break it');
    assert.deepEqual(streaks(new Set([day(2), day(3)])).current, 0, 'a gap of a full day ends it');
    assert.deepEqual(streaks(new Set()), { current: 0, longest: 0 });
  });
  await t('macro split reflects calories from protein, carbs and fat over the last 7 days', async () => {
    const m = (await call('dash', 'GET', '/api/analytics/overview')).body.data.macroSplit;
    assert.ok(Math.abs(m.protein + m.carbs + m.fat - 100) <= 1, JSON.stringify(m));
    assert.equal((await call('newbie', 'GET', '/api/analytics/overview')).body.data.macroSplit, null, 'no meals, no split');
  });
  await t('wearable sync keeps one row per day and only changes what was sent', async () => {
    const a = await call('dash', 'POST', '/api/wearables/sync', { steps: 8000, sleepHours: 7.5, restingHR: 55, hrv: 62 });
    assert.equal(a.status, 200);
    assert.equal((await call('dash', 'POST', '/api/wearables/sync', { steps: 9500 })).status, 200);
    const { WearableData } = require(SRC + '/models/WearableData.model');
    assert.equal(await WearableData.countDocuments({ userId: users.dash.id }), 1, 'one row for the day');
    const row = await WearableData.findOne({ userId: users.dash.id });
    assert.equal(row.steps, 9500); assert.equal(row.sleepHours, 7.5); assert.equal(row.restingHR, 55); assert.equal(row.hrv, 62);
  });
  await t('wearable sync ignores junk values instead of storing them', async () => {
    assert.equal((await call('dash', 'POST', '/api/wearables/sync', { steps: 'lots', sleepHours: -3, restingHR: { $gt: 0 }, hrv: 99999 })).status, 200);
    const { WearableData } = require(SRC + '/models/WearableData.model');
    const row = await WearableData.findOne({ userId: users.dash.id });
    assert.equal(row.steps, 9500); assert.equal(row.sleepHours, 7.5); assert.equal(row.restingHR, 55); assert.equal(row.hrv, 62);
  });
  await t('the dashboard shows the latest wearable reading and the 14-day list', async () => {
    const w = (await call('dash', 'GET', '/api/analytics/overview')).body.data.wearables;
    assert.equal(w.latest.steps, 9500); assert.equal(w.latest.restingHR, 55); assert.equal(w.days.length, 1);
    const metrics = (await call('dash', 'GET', '/api/wearables/metrics')).body.data;
    assert.equal(metrics.hrv, 62); assert.equal(metrics.sleepHours, 7.5);
    assert.equal((await call('dash', 'GET', '/api/wearables/data?days=banana')).status, 200, 'a bad days value falls back instead of crashing');
  });
  await t('report history: rows for the period, totals, and recent items', async () => {
    const h = (await call('dash', 'GET', '/api/reports/history?period=monthly')).body.data;
    assert.equal(h.rows.length, 30); assert.equal(h.totals.workouts, 4); assert.equal(h.totals.calories, 1100);
    assert.equal(h.recentWorkouts.length, 4); assert.equal(h.recentMeals.length, 2);
    const y = (await call('dash', 'GET', '/api/reports/history?period=yearly')).body.data;
    assert.equal(y.rows.length, 12); assert.equal(y.totals.workouts, 4);
    assert.equal((await call('dash', 'GET', '/api/reports/history?period=weekly')).status, 400);
    assert.equal((await call(null, 'GET', '/api/reports/history?period=monthly')).status, 401);
  });
  await t('the PDF download is a real PDF with this person\'s history in it', async () => {
    const r = await fetch(`${base}/api/reports/export?period=monthly&format=pdf`, { headers: { Authorization: 'Bearer dash' } });
    assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'application/pdf');
    assert.match(r.headers.get('content-disposition'), /reprummble-monthly-report\.pdf/);
    const buf = Buffer.from(await r.arrayBuffer());
    assert.equal(buf.subarray(0, 5).toString(), '%PDF-'); assert.ok(buf.length > 1500);
    const text = pdfText(buf);
    for (const word of ['progress report', 'Summary', 'Day by day', 'Recent workouts', 'Recent meals', 'Squat', 'Bench press', 'Oats', 'Wearable data', 'dash@x.test']) {
      assert.ok(text.includes(word), `PDF text is missing "${word}"`);
    }
    assert.ok(!text.includes('SOMEONE ELSES'), 'leaked another person');
  });
  await t('PDF works with no data, for each period, and rejects bad input', async () => {
    for (const period of ['monthly', 'yearly', 'historical']) {
      const r = await fetch(`${base}/api/reports/export?period=${period}&format=pdf`, { headers: { Authorization: 'Bearer newbie2' } });
      assert.equal(r.status, 200, period); assert.equal(Buffer.from(await r.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
    }
    assert.equal((await call('dash', 'GET', '/api/reports/export?period=monthly&format=docx')).status, 400);
    assert.equal((await call(null, 'GET', '/api/reports/export?period=monthly&format=pdf')).status, 401);
  });
  await t('CSV is still the default and has the same totals', async () => {
    const csv = (await call('dash', 'GET', '/api/reports/export?period=monthly')).body;
    assert.ok(csv.startsWith('Period (UTC),Workouts'));
    const today = new Date().toISOString().slice(0, 10);
    assert.ok(csv.split('\n').some((l) => l.startsWith(today + ',1,30,250,400,20,60,10')), 'today row');
  });
  await t('long or non-Latin names do not break the PDF', async () => {
    await Workout.create({ userId: users.dash.id, exercise: 'योग ' + 'x'.repeat(300), duration: 5, calories: 10, timestamp: at(3) });
    const r = await fetch(`${base}/api/reports/export?period=monthly&format=pdf`, { headers: { Authorization: 'Bearer dash' } });
    assert.equal(r.status, 200); assert.equal(Buffer.from(await r.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
  });


  console.log('Account deletion');
  const everything = async (id, email, legacyId) => {
    const m = require('mongoose'); const db = m.connection.db; const mdl = require(SRC + '/models/Business.model');
    const c = async (name, filter) => db.collection(name).countDocuments(filter);
    return {
      workouts: await c('workouts', { userId: id }), meals: await c('meals', { userId: id }), wearable: await c('wearabledatas', { userId: id }),
      refProfile: await c('referralprofiles', { userId: id }), refCredits: await c('referralcredits', { userId: id }),
      referrals: await c('referrals', { $or: [{ referrerId: id }, { referredId: id }] }),
      business: await c('businesses', { ownerId: id }), memberById: await c('businessmembers', { userId: id }), memberByEmail: await c('businessmembers', { email }),
      seats: await c('businessstaffs', { email }), contact: await c('contacts', { email }), lead: await c('leads', { email }),
      friendships: await c('friendships', { $or: [{ requester: id }, { recipient: id }] }), challengeEntries: await c('challengeparticipants', { user: id }),
      challenges: await c('challenges', { participants: id }),
      support: await c('supportconversations', { userEmail: email }), legacyUser: await c('users', { email }),
      legacyPlans: await c('workoutplans', { userId: legacyId }), legacySessions: await c('workoutsessions', { userId: legacyId }), posts: await c('socialposts', { author: legacyId }),
    };
  };
  const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const legacyId = new (require('mongoose').Types.ObjectId)();
  let bizId;
  await t('set up a person with data in every place we keep it', async () => {
    const L = users.leaver; const db = require('mongoose').connection.db; const oid = require('mongoose').Types.ObjectId;
    await Workout.create({ userId: L.id, exercise: 'Squat', duration: 20, calories: 100, timestamp: new Date() });
    await Meal.create({ userId: L.id, foodName: 'Oats', calories: 300, protein: 10, carbs: 40, fat: 5, timestamp: new Date() });
    assert.equal((await call('leaver', 'POST', '/api/wearables/sync', { steps: 5000, sleepHours: 7 })).status, 200);
    const code = (await call('ref', 'GET', '/api/referrals/me')).body.data.code;   // ref refers leaver (leaver is new)
    assert.equal((await call('leaver', 'POST', '/api/referrals/claim', { code })).status, 201);
    assert.equal((await call('leaver', 'GET', '/api/referrals/me')).status, 200);
    assert.equal((await call('leaver', 'POST', '/api/business/apply', { name: 'Leaver Gym', type: 'Gym' })).status, 201);
    const app = (await call('admin', 'GET', '/api/business/admin/applications')).body.data.find((a) => a.name === 'Leaver Gym');
    assert.equal((await call('admin', 'POST', `/api/business/admin/applications/${app.id}/approve`)).status, 200);
    bizId = app.id;
    assert.equal((await call('leaver', 'POST', '/api/business/members', { name: 'Their Member', email: 'theirmember@x.test' })).status, 201);
    assert.equal((await call('leaver', 'POST', '/api/business/plans', { name: 'Their plan', level: 'Beginner', weeks: 4, daysPerWeek: 3 })).status, 201);
    assert.equal((await call('leaver', 'POST', '/api/business/foods', { name: 'Their food', calories: 1, protein: 1, carbs: 1, fat: 1 })).status, 201);
    assert.equal((await call('leaver', 'POST', '/api/business/staff', { name: 'Their coach', email: 'theircoach@x.test', role: 'Coach' })).status, 201);
    // They are also a member and a team seat in other businesses, and appear elsewhere by email
    assert.equal((await call('owner', 'POST', '/api/business/members', { name: 'Leaver Member', email: 'leaver@x.test' })).status, 201);
    assert.equal((await call('leaver', 'GET', '/api/business/memberships')).status, 200); // signing in links the invite to their account
    await require(SRC + '/models/Business.model').BusinessStaff.collection.insertOne({ businessId: new oid(), email: 'leaver@x.test', name: 'L', role: 'Viewer' });
    await db.collection('contacts').insertOne({ name: 'L', email: 'leaver@x.test', message: 'hello there' });
    await db.collection('leads').insertOne({ email: 'leaver@x.test', name: 'L' });
    await db.collection('friendships').insertOne({ requester: L.id, recipient: 'someone-else', status: 'accepted' });
    await db.collection('challengeparticipants').insertOne({ user: L.id, challenge: 'c1' });
    await db.collection('challenges').insertOne({ name: 'C', participants: [L.id, 'someone-else'] });
    await db.collection('users').insertOne({ _id: legacyId, email: 'leaver@x.test', password: 'x', role: 'user' });
    await db.collection('workoutplans').insertOne({ userId: legacyId, name: 'old plan' });
    await db.collection('workoutsessions').insertOne({ userId: legacyId });
    await db.collection('socialposts').insertOne({ author: legacyId, content: 'hi', likes: [], comments: [] });
    await db.collection('supportconversations').insertOne({ userEmail: 'leaver@x.test', status: 'resolved' });
    const before = await everything(L.id, L.email, legacyId);
    for (const [k, v] of Object.entries(before)) assert.ok(v >= 1, `setup did not create "${k}"`);
  });
  const bystanderBefore = async () => ({ maya: await everything(users.maya.id, users.maya.email, new (require('mongoose').Types.ObjectId)()), dash: await everything(users.dash.id, users.dash.email, new (require('mongoose').Types.ObjectId)()), owner: await require('mongoose').connection.db.collection('businesses').countDocuments({ ownerId: users.owner.id }) });
  let snapshot;
  await t('deleting needs sign-in', async () => { snapshot = await bystanderBefore(); assert.equal((await call(null, 'DELETE', '/api/auth/account')).status, 401); });
  await t('if the sign-in service cannot be reached, nothing is deleted', async () => {
    await Workout.create({ userId: users.ghost.id, exercise: 'Keep me', duration: 5, timestamp: new Date() });
    const r = await call('ghost', 'DELETE', '/api/auth/account');
    assert.equal(r.status, 503); assert.equal(r.body.code, 'unavailable'); assert.match(r.body.message, /nothing was deleted/i);
    assert.equal(await Workout.countDocuments({ userId: users.ghost.id }), 1);
  });
  await t('when Supabase refuses to close the sign-in, the person is told clearly and their data is already gone', async () => {
    deleteMode = 'fail';
    const r = await call('leaver', 'DELETE', '/api/auth/account');
    assert.equal(r.status, 502); assert.equal(r.body.code, 'auth_delete_failed'); assert.match(r.body.message, /support@reprummble\.com/);
    assert.equal(total(await everything(users.leaver.id, users.leaver.email, legacyId)), 0, 'data should already be removed');
    assert.deepEqual(deletedAuth, []);
  });
  await t('trying again finishes the job (deleting is safe to repeat)', async () => {
    deleteMode = 'ok';
    const r = await call('leaver', 'DELETE', '/api/auth/account');
    assert.equal(r.status, 200); assert.equal(r.body.success, true);
    assert.deepEqual(deletedAuth, [users.leaver.id], 'the sign-in is closed');
  });
  await t('everything about them is gone, including the business they owned and its team', async () => {
    const after = await everything(users.leaver.id, users.leaver.email, legacyId);
    for (const [k, v] of Object.entries(after)) assert.equal(v, 0, `"${k}" still has ${v}`);
    const db = require('mongoose').connection.db; const oid = require('mongoose').Types.ObjectId;
    for (const col of ['businessmembers', 'businessplans', 'businessfoods', 'businessstaffs']) assert.equal(await db.collection(col).countDocuments({ businessId: new oid(bizId) }), 0, col);
    const challenge = await db.collection('challenges').findOne({ name: 'C' });
    assert.deepEqual(challenge.participants, ['someone-else'], 'other people stay in a shared challenge');
  });
  await t('nobody else lost anything', async () => {
    const now = await bystanderBefore();
    assert.deepEqual(now, snapshot);
    assert.equal((await call('owner', 'GET', '/api/business/members')).status, 200);
  });


  console.log('Billing (simulated Stripe)');
  const { Subscription } = require(SRC + '/models/Subscription.model');
  const { ReferralCredit } = require(SRC + '/models/Referral.model');
  const subOf = async (u) => Subscription.findOne({ userId: users[u].id });
  const view = async (u) => (await call(u, 'GET', '/api/billing')).body.data;
  const plan = (u, p) => call(u, 'POST', '/api/billing/plan', { plan: p });
  const webhook = async (event, signature) => {
    const payload = JSON.stringify(event);
    const header = signature ?? require('stripe').webhooks.generateTestHeaderString({ payload, secret: 'whsec_test_fake' });
    const r = await fetch(base + '/api/billing/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': header }, body: payload });
    return r.status;
  };

  await t('billing needs sign-in', async () => assert.equal((await call(null, 'GET', '/api/billing')).status, 401));
  await t('a new person is on Free, with the plans, a trial on offer and no card', async () => {
    const v = await view('bill');
    assert.equal(v.plan, 'free'); assert.equal(v.effectivePlan, 'free'); assert.equal(v.autoRenew, true);
    assert.equal(v.trialAvailable, true); assert.equal(v.paymentMethod, null); assert.equal(v.scheduledPlan, null);
    assert.deepEqual(v.plans.map((x) => x.id), ['free', 'pro', 'premium']);
    assert.equal(v.configured, true); assert.equal(v.publishableKey, 'pk_test_fake');
  });
  await t('changing plan needs a verified email and a real plan name', async () => {
    assert.equal((await plan('unver', 'pro')).status, 403);
    assert.equal((await plan('bill', 'platinum')).status, 400);
    assert.equal((await call('bill', 'POST', '/api/billing/plan', { plan: { $ne: 1 } })).status, 400);
  });
  await t('Premium cannot be started without a card', async () => {
    const r = await plan('billB', 'premium');
    assert.equal(r.status, 402); assert.equal(r.body.code, 'payment_method_required');
    assert.equal((await view('billB')).plan, 'free');
  });
  await t('Pro starts with a 14-day free trial and needs no card', async () => {
    const r = await plan('bill', 'pro');
    assert.equal(r.status, 200);
    const v = r.body.data;
    assert.equal(v.plan, 'pro'); assert.equal(v.status, 'trialing'); assert.equal(v.trialAvailable, false); assert.equal(v.autoRenew, true);
    const days = (new Date(v.trialEnd) - Date.now()) / DAY; assert.ok(days > 13 && days <= 14, `trial is ${days} days`);
    const call0 = fake.helpers.state.calls.find((c) => c.name === 'subscriptions.create');
    assert.equal(call0.args.trial_period_days, 14);
    assert.equal(call0.args.trial_settings.end_behavior.missing_payment_method, 'cancel', 'the trial just ends if no card is added');
  });
  await t('adding a card: Stripe collects it, we keep only the brand and last four', async () => {
    const si = await call('bill', 'POST', '/api/billing/setup-intent');
    assert.equal(si.status, 200); assert.match(si.body.data.clientSecret, /^seti_secret_/);
    const doc = await subOf('bill');
    fake.helpers.addCard(doc.stripeCustomerId, '4242');
    const r = await call('bill', 'POST', '/api/billing/payment-method/sync');
    assert.deepEqual(r.body.data.paymentMethod, { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030 });
    const raw = JSON.stringify((await subOf('bill')).toObject());
    assert.ok(!/\b\d{13,19}\b/.test(raw), 'no card number is stored');
  });
  await t('a new card replaces the old one (only one is kept)', async () => {
    const doc = await subOf('bill');
    fake.helpers.addCard(doc.stripeCustomerId, '1111', 'mastercard');
    const r = await call('bill', 'POST', '/api/billing/payment-method/sync');
    assert.equal(r.body.data.paymentMethod.last4, '1111');
    assert.equal(fake.helpers.state.cards[doc.stripeCustomerId].length, 1);
  });
  await t('upgrading Pro to Premium takes effect now (during a trial nothing is charged yet)', async () => {
    const r = await plan('bill', 'premium');
    assert.equal(r.status, 200); assert.equal(r.body.data.plan, 'premium'); assert.equal(r.body.data.scheduledPlan, null);
  });
  await t('lowering Premium to Pro waits for the next billing cycle', async () => {
    // The trial ends and the first payment is taken, so there is a paid period to wait out.
    const paid = fake.helpers.renew((await subOf('bill')).stripeSubscriptionId);
    assert.equal(await webhook({ id: 'evt_0', type: 'customer.subscription.updated', data: { object: paid } }), 200);
    assert.equal((await view('bill')).status, 'active');
    const r = await plan('bill', 'pro');
    assert.equal(r.status, 200);
    const v = r.body.data;
    assert.equal(v.plan, 'premium', 'still on the plan they paid for'); assert.equal(v.scheduledPlan, 'pro'); assert.ok(v.scheduledFor);
    assert.equal(v.autoRenew, true);
    const sched = Object.values(fake.helpers.state.schedules)[0];
    assert.equal(sched.phases.length, 2); assert.equal(sched.phases[1].items[0].price, 'price_pro');
  });
  await t('when the cycle ends the lower plan starts (via Stripe\'s signed notice)', async () => {
    const doc = await subOf('bill');
    const updated = fake.helpers.renew(doc.stripeSubscriptionId);
    assert.equal(await webhook({ id: 'evt_1', type: 'customer.subscription.updated', data: { object: updated } }), 200);
    const v = await view('bill');
    assert.equal(v.plan, 'pro'); assert.equal(v.scheduledPlan, null);
  });
  await t('webhooks with a wrong or missing signature are refused and change nothing', async () => {
    const doc = await subOf('bill');
    const fakeSub = { ...(await fake.stripe.subscriptions.retrieve(doc.stripeSubscriptionId)), status: 'canceled' };
    assert.equal(await webhook({ id: 'evt_2', type: 'customer.subscription.deleted', data: { object: fakeSub } }, 't=1,v1=deadbeef'), 400);
    assert.equal((await view('bill')).plan, 'pro');
  });
  await t('turning auto-renew off keeps the plan until the period ends', async () => {
    const r = await call('bill', 'POST', '/api/billing/auto-renew', { enabled: false });
    assert.equal(r.status, 200);
    const v = r.body.data;
    assert.equal(v.autoRenew, false); assert.equal(v.plan, 'pro'); assert.equal(v.scheduledPlan, 'free'); assert.ok(v.currentPeriodEnd);
  });
  await t('a card cannot be removed while auto-renew is on, but can be once it is off', async () => {
    assert.equal((await call('bill', 'POST', '/api/billing/auto-renew', { enabled: true })).body.data.autoRenew, true);
    const blocked = await call('bill', 'DELETE', '/api/billing/payment-method');
    assert.equal(blocked.status, 409); assert.equal(blocked.body.code, 'payment_method_required');
    await call('bill', 'POST', '/api/billing/auto-renew', { enabled: false });
    const ok = await call('bill', 'DELETE', '/api/billing/payment-method');
    assert.equal(ok.status, 200); assert.equal(ok.body.data.paymentMethod, null);
  });
  await t('choosing the current plan again undoes a pending cancellation', async () => {
    const r = await plan('bill', 'pro');
    assert.equal(r.status, 200); assert.equal(r.body.data.autoRenew, true); assert.equal(r.body.data.scheduledPlan, null);
    assert.equal((await plan('bill', 'pro')).body.code, 'already_on_plan');
  });
  await t('lowering to Free ends the plan at the end of the period, not now', async () => {
    const r = await plan('bill', 'free');
    assert.equal(r.status, 200); assert.equal(r.body.data.plan, 'pro'); assert.equal(r.body.data.scheduledPlan, 'free'); assert.equal(r.body.data.autoRenew, false);
    const doc = await subOf('bill');
    const ended = fake.helpers.renew(doc.stripeSubscriptionId);
    assert.equal(await webhook({ id: 'evt_3', type: 'customer.subscription.deleted', data: { object: ended } }), 200);
    const v = await view('bill');
    assert.equal(v.plan, 'free'); assert.equal(v.scheduledPlan, null); assert.equal(v.trialAvailable, false, 'the trial is only offered once');
  });
  await t('auto-renew does not apply to Free', async () => {
    assert.equal((await call('billB', 'POST', '/api/billing/auto-renew', { enabled: false })).status, 409);
    assert.equal((await call('bill', 'POST', '/api/billing/auto-renew', { enabled: 'no' })).status, 400);
  });
  await t('a declined card stops the upgrade and leaves the plan alone', async () => {
    await plan('billC', 'pro');
    const c = (await subOf('billC')).stripeCustomerId; fake.helpers.addCard(c, '4242'); await call('billC', 'POST', '/api/billing/payment-method/sync');
    const paid = fake.helpers.renew((await subOf('billC')).stripeSubscriptionId); // trial over, now paying
    assert.equal(await webhook({ id: 'evt_c', type: 'customer.subscription.updated', data: { object: paid } }), 200);
    fake.helpers.state.failCharges = true;
    const r = await plan('billC', 'premium');
    fake.helpers.state.failCharges = false;
    assert.equal(r.status, 402); assert.equal(r.body.code, 'payment_failed');
    assert.equal((await view('billC')).plan, 'pro');
  });
  await t('a referral discount is applied once to the first payment, then used up', async () => {
    await ReferralCredit.create({ userId: users.billB.id, percent: 5, reason: 'referred' });
    assert.equal((await view('billB')).referralDiscountPercent, 5);
    const si = await call('billB', 'POST', '/api/billing/setup-intent'); assert.equal(si.status, 200);
    fake.helpers.addCard((await subOf('billB')).stripeCustomerId, '4242'); await call('billB', 'POST', '/api/billing/payment-method/sync');
    const r = await plan('billB', 'premium');
    assert.equal(r.status, 200); assert.equal(r.body.data.plan, 'premium');
    assert.equal(fake.helpers.state.coupons.at(-1).percent_off, 5);
    assert.equal((await view('billB')).referralDiscountPercent, 0);
  });
  await t('a partner gym that includes Pro shows as Pro without paying', async () => {
    const { Business, BusinessMember } = require(SRC + '/models/Business.model');
    const biz = await Business.create({ ownerId: users.admin.id + '-gym', ownerEmail: 'g@gym.test', name: 'Iron Gym', type: 'Gym', status: 'approved' });
    await BusinessMember.create({ businessId: biz._id, name: 'G', email: users.billGym.email, userId: users.billGym.id });
    const v = await view('billGym');
    assert.equal(v.plan, 'free'); assert.equal(v.effectivePlan, 'pro'); assert.equal(v.includedBy, 'Iron Gym');
  });
  await t('billing says so plainly when it is not set up', async () => {
    const keep = process.env.STRIPE_PRICE_PREMIUM; process.env.STRIPE_PRICE_PREMIUM = '';
    const v = await view('billD'); const r = await plan('billD', 'pro');
    process.env.STRIPE_PRICE_PREMIUM = keep;
    assert.equal(v.configured, false); assert.equal(v.publishableKey, null);
    assert.equal(r.status, 503); assert.equal(r.body.code, 'billing_unavailable');
  });
  await t('billing endpoints accept no card numbers: the plan route ignores extra card data', async () => {
    const r = await call('billD', 'POST', '/api/billing/plan', { plan: 'pro', cardNumber: '4242424242424242' });
    assert.equal(r.status, 200);
    assert.ok(!/4242424242424242/.test(JSON.stringify((await subOf('billD')).toObject())));
  });
  await t('deleting an account first stops the subscription and removes the Stripe customer', async () => {
    const doc = await subOf('billD'); const subId = doc.stripeSubscriptionId; const cust = doc.stripeCustomerId;
    const r = await call('billD', 'DELETE', '/api/auth/account');
    assert.equal(r.status, 200);
    assert.equal(fake.helpers.state.subs[subId].status, 'canceled'); assert.equal(fake.helpers.state.customers[cust], undefined);
    assert.equal(await subOf('billD'), null);
  });
  await t('if Stripe cannot cancel, the account is not deleted so nobody is charged for a deleted account', async () => {
    fake.helpers.state.failCancel = true;
    const r = await call('billC', 'DELETE', '/api/auth/account');
    fake.helpers.state.failCancel = false;
    assert.equal(r.status, 500);
    assert.ok(await subOf('billC'), 'billing record is kept so it can be retried');
  });


  console.log('Supabase key check');
  await t('the health check says plainly when Supabase rejects a key, and never reveals the keys', async () => {
    const realFetch = global.fetch; const seen = [];
    process.env.SUPABASE_URL = 'https://fake-project.supabase.co'; process.env.SUPABASE_ANON_KEY = 'anon-rotated-key'; process.env.SUPABASE_SERVICE_KEY = 'service-good-key';
    global.fetch = async (url, opts) => {
      if (!String(url).startsWith('https://fake-project.supabase.co')) return realFetch(url, opts);
      seen.push(String(url));
      const key = opts.headers.apikey;
      return { ok: key === 'service-good-key', status: key === 'service-good-key' ? 200 : 401 };
    };
    try {
      const result = await sup.checkSupabaseKeys();
      assert.deepEqual(result, { anon: 'rejected', service: 'valid' });
      assert.ok(!JSON.stringify(result).includes('rotated') && !JSON.stringify(result).includes('good-key'));
      assert.equal(seen.length, 2);
      await sup.checkSupabaseKeys(); assert.equal(seen.length, 2, 'result is cached for a minute');
    } finally { global.fetch = realFetch; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY; delete process.env.SUPABASE_SERVICE_KEY; }
  });


  console.log('Session refresh');
  await t('a valid refresh token returns a new access token and the replacement refresh token', async () => {
    const r = await call(null, 'POST', '/api/auth/refresh', { refreshToken: 'refresh-good' });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.token, 'access-2'); assert.equal(r.body.data.refreshToken, 'refresh-2');
    assert.equal(r.body.data.user.email, users.maya.email);
  });
  await t('a used, expired or made-up refresh token is refused with session_expired', async () => {
    for (const token of ['refresh-good', 'nonsense']) {
      const r = await call(null, 'POST', '/api/auth/refresh', { refreshToken: token });
      assert.equal(r.status, 401); assert.equal(r.body.code, 'session_expired');
    }
  });
  await t('refresh rejects a missing, non-text or oversized token without asking Supabase', async () => {
    for (const body of [{}, { refreshToken: 42 }, { refreshToken: { $ne: 1 } }, { refreshToken: 'x'.repeat(3000) }]) {
      assert.equal((await call(null, 'POST', '/api/auth/refresh', body)).status, 400);
    }
  });


  console.log('Business owner on a different sign-in');
  await t('the owner is recognised by verified email when they sign in with a different account than they applied with', async () => {
    const { Business } = require(SRC + '/models/Business.model');
    await Business.create({ ownerId: 'applied-with-another-identity', ownerEmail: users.twin.email, name: 'Twin Gym', type: 'Gym', status: 'approved' });
    const r = await call('twin', 'GET', '/api/business/me');
    assert.equal(r.status, 200); assert.equal(r.body.data.role, 'Owner'); assert.equal(r.body.data.business.name, 'Twin Gym'); assert.equal(r.body.data.business.status, 'approved');
    assert.equal((await call('twin', 'GET', '/api/business/members')).status, 200, 'the dashboard data opens too');
  });
  await t('someone who only claims that email without verifying it gets nothing', async () => {
    const r = await call('twinFake', 'GET', '/api/business/me');
    assert.equal(r.body.data.business, null);
    assert.equal((await call('twinFake', 'GET', '/api/business/members')).status, 404);
  });
  await t('a second sign-in for the same email cannot create a duplicate application', async () => {
    const r = await call('twin', 'POST', '/api/business/apply', { name: 'Another', type: 'Gym' });
    assert.equal(r.status, 409);
  });

  console.log(`\n${pass} checks passed${process.exitCode ? ' (some FAILED)' : ''}`);
  server.close(); await require('mongoose').disconnect(); await mms.stop();
})().catch((e) => { console.error('Harness error:', e); process.exit(1); });
