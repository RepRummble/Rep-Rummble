// API integration tests: business approval and roles, referral rewards, and real-data reports.
// Runs against an in-memory MongoDB (downloaded on first run). Usage: npm run test:api
const assert = require('node:assert/strict');
const path = require('node:path');
// Runs against the compiled output (`npm run build` first; `npm run test:api` does it for you).
const SRC = path.resolve(__dirname, '../dist');
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

  // Stand in for Supabase: token = key of the users map.
  const sup = require(SRC + '/services/supabase.service');
  // A JWT-shaped token for a person, optionally carrying a client_id like Supabase's OAuth server adds.
  const jwtFor = (key, claims) => 'h.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.s';
  const firstParty = jwtFor('owner', { sub: users.owner.id });
  const thirdParty = jwtFor('owner', { sub: users.owner.id, client_id: 'c-1234' });
  const realVerify = async (token) => users[token] ? { success: true, user: { id: users[token].id, email: users[token].email, user_metadata: {}, email_confirmed_at: users[token].verified === false ? null : new Date().toISOString() } } : { success: false };
  sup.verifyToken = async (token) => (token === firstParty || token === thirdParty) ? realVerify('owner') : realVerify(token);
  sup.getUserById = async (id) => { const u = Object.values(users).find((x) => x.id === id); if (u && u.noAdmin) return { success: false, error: 'service unreachable' }; return u ? { success: true, user: { id, email: u.email, user_metadata: {}, email_confirmed_at: u.verified === false ? null : new Date().toISOString(), created_at: new Date(u.created).toISOString() } } : { success: false }; };

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
  const resetMails = [];
  sup.sendPasswordReset = async (email) => { resetMails.push(email); };
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
  app.use('/api/users', require(SRC + '/routes/user.routes').default);
  app.use('/api/ai', require(SRC + '/routes/ai.routes').default);
  app.use('/api/progress', require(SRC + '/routes/progress.routes').default);
  app.use('/api/agent', require(SRC + '/routes/agent.routes').default);
  app.use('/api/safety', require(SRC + '/routes/safety.routes').default);
  app.use('/api/stories', require(SRC + '/routes/story.routes').default);
  app.use('/api/messages', require(SRC + '/routes/message.routes').default);
  app.use('/api/people', require(SRC + '/routes/people.routes').default);
  app.use('/api/meals', require(SRC + '/routes/meal.routes').default);
  app.use('/api/workouts', require(SRC + '/routes/workout.routes').default);
  app.use('/api/social', require(SRC + '/routes/social.routes').default);
  app.use('/api/friends', require(SRC + '/routes/friend.routes').default);
  app.use('/api/challenges', require(SRC + '/routes/challenge.routes').default);
  app.use('/api/devices', require(SRC + '/routes/devices.routes').default);
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


  console.log('Social sign-in redirects');
  await t('the mobile return address and Microsoft are accepted, and anything else falls back to the website', async () => {
    const seen = [];
    const realGet = sup.getOAuthUrl;
    sup.getOAuthUrl = async (provider, redirectTo) => { seen.push({ provider, redirectTo }); return { url: 'https://idp.example/authorize' }; };
    try {
      const hit = async (provider, redirect) => (await fetch(`${base}/api/auth/oauth/${provider}${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`, { redirect: 'manual' })).status;
      assert.equal(await hit('azure', 'reprummble://auth-callback'), 302);
      assert.deepEqual(seen[0], { provider: 'azure', redirectTo: 'reprummble://auth-callback' });
      for (const evil of ['evilapp://auth-callback', 'reprummble://other', 'javascript:alert(1)', 'https://evil.example/auth/callback']) {
        assert.equal(await hit('google', evil), 302);
        assert.ok(!seen.at(-1).redirectTo.startsWith('evilapp') && !seen.at(-1).redirectTo.includes('evil.example') && !seen.at(-1).redirectTo.startsWith('javascript') && seen.at(-1).redirectTo !== 'reprummble://other', 'unlisted return address was refused: ' + evil);
      }
      assert.equal(await hit('instagram', 'reprummble://auth-callback'), 400, 'unsupported providers are refused');
    } finally { sup.getOAuthUrl = realGet; }
  });


  console.log('Social features for Supabase accounts');
  await t('the feed, friends and challenges work for an account whose id is a Supabase UUID (this used to fail with "Failed to get feed")', async () => {
    const feed = await call('maya', 'GET', '/api/social/feed');
    assert.equal(feed.status, 200); assert.equal(feed.body.success, true); assert.deepEqual(feed.body.posts, []);
    assert.equal((await call('maya', 'GET', '/api/friends')).status, 200);
    assert.equal((await call('maya', 'GET', '/api/challenges')).status, 200);
  });
  await t('a post is saved under the person and appears in their feed with their name', async () => {
    const made = await call('maya', 'POST', '/api/social/posts', { content: 'First real post', postType: 'general' });
    assert.equal(made.status, 201);
    const feed = await call('maya', 'GET', '/api/social/feed');
    assert.equal(feed.body.posts.length, 1);
    assert.equal(feed.body.posts[0].content, 'First real post');
    assert.equal(feed.body.posts[0].author.email, undefined); // names only: the feed never shows email addresses
    assert.match(feed.body.posts[0].author._id, /^[0-9a-f]{24}$/);
  });
  await t('login and /auth/me hand the app the id the social features use, so it can tell which posts are the person\'s own', async () => {
    const me = await call('maya', 'GET', '/api/auth/me');
    assert.equal(me.status, 200); assert.match(me.body.data._id, /^[0-9a-f]{24}$/);
    const feed = await call('maya', 'GET', '/api/social/feed');
    assert.equal(feed.body.posts[0].author._id, me.body.data._id);
  });
  await t('an unverified email cannot use social features (it could be borrowing someone else\'s address)', async () => {
    const r = await call('unver', 'GET', '/api/social/feed');
    assert.equal(r.status, 403); assert.equal(r.body.code, 'email_not_verified');
  });

  console.log('Profile, XP and AI for Supabase accounts');
  await t('a person can rename themselves but cannot give themselves XP, a level or a streak', async () => {
    const r = await call('maya', 'PUT', '/api/users/profile', { displayName: 'Maya Chen', xp: 99999, level: 50, streak: 400 });
    assert.equal(r.status, 200); assert.equal(r.body.data.displayName, 'Maya Chen'); assert.equal(r.body.data.xp, 0); assert.equal(r.body.data.level, 1); assert.equal(r.body.data.streak, 0);
    assert.equal((await call('maya', 'GET', '/api/users/profile')).status, 200);
  });
  await t('food photo analysis says so when the AI is unavailable, instead of inventing nutrition numbers', async () => {
    const r = await call('maya', 'POST', '/api/ai/analyze-food', { imageBase64: 'A'.repeat(300) });
    assert.equal(r.status, 503); assert.equal(r.body.code, 'ai_unavailable');
    assert.equal(r.body.data, undefined);
  });

  console.log('Password reset and saved preferences');
  await t('forgot-password emails a reset link and answers the same way for any address', async () => {
    const r = await fetch(base + '/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: '  Maya@Members.test ' }) });
    assert.equal(r.status, 200); assert.deepEqual(resetMails, ['maya@members.test']);
    const r2 = await fetch(base + '/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'nobody@nowhere.test' }) });
    assert.equal(r2.status, 200); assert.equal((await r2.json()).message, (await r.json()).message);
  });
  await t('forgot-password rejects something that is not an email, without sending anything', async () => {
    const before = resetMails.length;
    for (const body of [{}, { email: 'not-an-email' }, { email: 42 }, { email: 'a@b' }]) {
      const r = await fetch(base + '/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      assert.equal(r.status, 400);
    }
    assert.equal(resetMails.length, before);
  });
  await t('/auth/me carries the goals and preferences the person saved, with safe defaults when there are none', async () => {
    const me = await call('maya', 'GET', '/api/auth/me');
    assert.equal(me.status, 200);
    assert.deepEqual(me.body.data.profile, { goal: null, activity: null, diets: [], notifications: null });
  });

  console.log('Daily missions, XP and streak (decided by the server)');
  const prog = require(SRC + '/services/progress.service');
  const today = () => new Date().toISOString().slice(0, 10);
  const q = (extra = {}) => new URLSearchParams({ day: today(), tz: '0', glasses: '0', ...extra }).toString();
  await t('streak counting: consecutive days ending today or yesterday, nothing after a gap', () => {
    const d = (n) => new Date(Date.UTC(2026, 10, 7 - n)).toISOString().slice(0, 10);
    assert.equal(prog.streakFromDays(new Set([d(0), d(1), d(2), d(4)]), d(0)), 3);
    assert.equal(prog.streakFromDays(new Set([d(1), d(2)]), d(0)), 2);            // today still open
    assert.equal(prog.streakFromDays(new Set([d(2), d(3)]), d(0)), 0);            // a missed day ends it
    assert.equal(prog.streakFromDays(new Set(), d(0)), 0);
  });
  await t('a day is the person\'s own local day, not UTC', () => {
    // 23:30 UTC on Nov 7 is already Nov 8 in Sydney (UTC+11: tz offset -660) and still Nov 7 in New York (tz 300)
    const now = new Date(Date.UTC(2026, 10, 7, 23, 30));
    assert.equal(prog.localDay(now, -660), '2026-11-08'); assert.equal(prog.localDay(now, 300), '2026-11-07');
    const w = prog.dayWindow('2026-11-08', -660); assert.equal(w.start.toISOString(), '2026-11-07T13:00:00.000Z');
  });
  await t('missions start empty and only complete from things really logged', async () => {
    const r = await call('maya', 'GET', '/api/progress/missions?' + q());
    assert.equal(r.status, 200); assert.equal(r.body.data.missions.length, 5); assert.ok(r.body.data.missions.every((m) => !m.done)); assert.equal(r.body.data.claimableXp, 0); assert.equal(r.body.data.xp, 0);
    await call('maya', 'POST', '/api/meals', { foodName: 'Chicken bowl', calories: 600, protein: 55, carbs: 50, fat: 15 });
    const r2 = await call('maya', 'GET', '/api/progress/missions?' + q());
    assert.deepEqual(r2.body.data.missions.filter((m) => m.done).map((m) => m.id), ['log-meal']); assert.equal(r2.body.data.claimableXp, 20);
  });
  await t('collecting pays once, and the same request many times at once still pays once', async () => {
    const body = { day: today(), tz: 0, glasses: 0, ids: ['log-meal'] };
    const results = await Promise.all(Array.from({ length: 6 }, () => call('maya', 'POST', '/api/progress/missions/claim', body)));
    assert.ok(results.every((r) => r.status === 200));
    assert.equal(results.reduce((s, r) => s + (r.body.data.awarded || 0), 0), 20);
    const after = await call('maya', 'GET', '/api/progress/missions?' + q());
    assert.equal(after.body.data.xp, 20); assert.equal(after.body.data.missions.find((m) => m.id === 'log-meal').claimed, true); assert.equal(after.body.data.claimableXp, 0);
    const again = await call('maya', 'POST', '/api/progress/missions/claim', body); assert.equal(again.body.data.awarded, 0); assert.equal(again.body.data.xp, 20);
  });
  await t('asking for a mission that is not complete pays nothing', async () => {
    const r = await call('maya', 'POST', '/api/progress/missions/claim', { day: today(), tz: 0, glasses: 0, ids: ['train', 'protein', 'not-a-mission'] });
    assert.equal(r.status, 200); assert.equal(r.body.data.awarded, 0); assert.equal(r.body.data.xp, 20);
  });
  await t('water and targets: a hydration mission completes at the person\'s own target, and targets are kept sensible', async () => {
    const r = await call('maya', 'GET', '/api/progress/missions?' + q({ glasses: '6', water: '6' }));
    assert.equal(r.body.data.missions.find((m) => m.id === 'hydrate').done, true);
    const silly = await call('maya', 'GET', '/api/progress/missions?' + q({ protein: '1', calories: '99999' }));
    const prot = silly.body.data.missions.find((m) => m.id === 'protein'); assert.equal(prot.target, 20);                  // protein target clamped to 20 g
    assert.equal(silly.body.data.missions.find((m) => m.id === 'calories').target, 6000);
  });
  await t('only today can be read or collected, and the request must be well formed', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    assert.equal((await call('maya', 'GET', '/api/progress/missions?' + q({ day: yesterday }))).status, 400);
    assert.equal((await call('maya', 'GET', '/api/progress/missions?day=banana&tz=0')).status, 400);
    assert.equal((await call('maya', 'POST', '/api/progress/missions/claim', { day: today(), tz: 0, ids: [] })).status, 400);
    assert.equal((await call(null, 'GET', '/api/progress/missions?' + q())).status, 401);
  });
  await t('the streak is counted from real workouts: today and yesterday make 2, a gap breaks it', async () => {
    const now = Date.now(), day = 86400000;
    await call('newbie', 'POST', '/api/workouts', { exercise: 'Run', duration: 30, timestamp: new Date(now).toISOString() });
    await call('newbie', 'POST', '/api/workouts', { exercise: 'Squat', duration: 30, timestamp: new Date(now - day).toISOString() });
    await call('newbie', 'POST', '/api/workouts', { exercise: 'Old', duration: 30, timestamp: new Date(now - 5 * day).toISOString() });
    const r = await call('newbie', 'GET', '/api/progress/missions?' + q());
    assert.equal(r.status, 200); assert.equal(r.body.data.streak, 2);
    const me = await call('newbie', 'GET', '/api/auth/me'); assert.equal(me.status, 200); assert.ok(me.body.data.streak >= 1 && me.body.data.streak <= 2);
  });

  console.log('Workouts with sets');
  await t('a workout keeps its sets and volume, and only known fields are taken from the request', async () => {
    const r = await call('dash', 'POST', '/api/workouts', { exercise: 'Push day', duration: 52, completed: true, volume: 5400, sets: [{ exercise: 'Bench Press', reps: 8, weight: 80 }, { exercise: 'Bench Press', reps: 6, weight: 85 }], userId: 'someone-else', hacked: true });
    assert.equal(r.status, 201); assert.equal(r.body.data.sets.length, 2); assert.equal(r.body.data.volume, 5400);
    assert.notEqual(r.body.data.userId, 'someone-else'); assert.equal(r.body.data.hacked, undefined);
    const list = await call('dash', 'GET', '/api/workouts'); assert.equal(list.body.data[0].sets[1].weight, 85);
  });
  await t('absurd sets are refused with a clear error, and nothing is saved', async () => {
    const before = (await call('dash', 'GET', '/api/workouts')).body.count;
    const r = await call('dash', 'POST', '/api/workouts', { exercise: 'x', duration: 5, sets: [{ exercise: 'Bench', reps: 8, weight: 99999 }] });
    assert.equal(r.status, 400); assert.equal((await call('dash', 'GET', '/api/workouts')).body.count, before);
  });

  console.log('Community: feed, statuses, messages, reports and blocking');
  const meId = async (as) => (await call(as, 'GET', '/api/auth/me')).body.data._id;
  const befriend = async (a, b) => {
    const r = await call(a, 'POST', '/api/friends/request', { friendId: await meId(b) });
    assert.equal(r.status, 200, 'request: ' + JSON.stringify(r.body));
    const acc = await call(b, 'POST', '/api/friends/accept/' + r.body.friendship._id);
    assert.equal(acc.status, 200, 'accept: ' + JSON.stringify(acc.body));
  };
  const [A, B, C, D] = ['billB', 'billC', 'billD', 'ownerC'];            // A and B become friends; C and D start as strangers
  for (const [who, name] of [[A, 'Ava Alpha'], [B, 'Ben Bravo'], [C, 'Cleo Charlie'], [D, 'Dev Delta']]) await call(who, 'PUT', '/api/users/profile', { displayName: name });
  await befriend(A, B);
  const tzq = '?tz=0';
  const feedOf = async (as) => (await call(as, 'GET', '/api/social/feed' + tzq)).body;

  await t('a post reaches friends and yourself, never strangers', async () => {
    const r = await call(A, 'POST', '/api/social/posts', { content: 'Leg day done <b>done</b>', postType: 'general' });
    assert.equal(r.status, 201); assert.equal(r.body.post.content, 'Leg day done bdone/b'); assert.equal(r.body.post.author.displayName, 'Ava Alpha'); assert.equal(r.body.post.author.email, undefined);
    assert.equal((await feedOf(B)).posts.length, 1); assert.equal((await feedOf(A)).posts.length, 1); assert.equal((await feedOf(C)).posts.length, 0);
  });
  await t('a client cannot attach media links or fake what a post is made of', async () => {
    const r = await call(A, 'POST', '/api/social/posts', { content: 'look', mediaUrls: ['https://evil.test/x.png'] });
    assert.equal(r.status, 201); const f = await feedOf(A); assert.ok(f.posts.every((p) => !p.mediaUrls));
    assert.equal((await call(A, 'POST', '/api/social/posts', { content: 'x', postType: 'hax' })).status, 400);
    assert.equal((await call(A, 'POST', '/api/social/posts', { content: '   ' })).status, 400);
  });
  await t('sharing a workout copies the facts from the real record, and only your own workout can be shared once', async () => {
    const w = await call(A, 'POST', '/api/workouts', { exercise: 'Push day', duration: 55, volume: 6200, sets: [{ exercise: 'Bench Press', reps: 8, weight: 80 }, { exercise: 'Bench Press', reps: 5, weight: 90 }] });
    const share = await call(A, 'POST', '/api/social/posts', { postType: 'workout', workoutId: w.body.data._id, content: 'Felt strong', snapshot: { exercise: 'FAKE', duration: 999 } });
    assert.equal(share.status, 201); assert.equal(share.body.post.snapshot.exercise, 'Push day'); assert.equal(share.body.post.snapshot.duration, 55); assert.equal(share.body.post.snapshot.topSet.weight, 90); assert.equal(share.body.post.snapshot.setCount, 2);
    assert.equal((await call(A, 'POST', '/api/social/posts', { postType: 'workout', workoutId: w.body.data._id })).status, 409);
    assert.equal((await call(C, 'POST', '/api/social/posts', { postType: 'workout', workoutId: w.body.data._id })).status, 404);   // not C's workout
  });
  await t('a scanned meal keeps what each food is, how much, and what it contains', async () => {
    const m = await call(A, 'POST', '/api/meals', { foodName: 'Dal, Rice', calories: 520, protein: 18, carbs: 88, fat: 9, isAIGenerated: true, detectedFoods: [
      { name: 'Dal', confidence: 0.9, portion: 'medium', estimatedCalories: 180, estimatedProtein: 10, estimatedCarbs: 24, estimatedFat: 5, description: 'Yellow lentil curry', amount: 'about 1 cup (200 g)', grams: 200, ingredients: ['lentils', 'turmeric', 'ghee'] },
      { name: 'Rice', confidence: 0.85, portion: 'medium', estimatedCalories: 340 } ] });
    assert.equal(m.status, 201);
    const f = m.body.data.detectedFoods[0];
    assert.equal(f.description, 'Yellow lentil curry'); assert.equal(f.estimatedCalories, 180); assert.equal(f.grams, 200); assert.deepEqual([...f.ingredients], ['lentils', 'turmeric', 'ghee']);
  });
  await t('sharing a meal copies its nutrition from the real record', async () => {
    const m = await call(A, 'POST', '/api/meals', { foodName: 'Chicken bowl', calories: 600, protein: 50, carbs: 55, fat: 14, mealType: 'lunch' });
    const r = await call(A, 'POST', '/api/social/posts', { postType: 'meal', mealId: m.body.data._id, content: 'Lunch' });
    assert.equal(r.status, 201); assert.equal(r.body.post.snapshot.calories, 600); assert.equal(r.body.post.snapshot.foodName, 'Chicken bowl');
    assert.equal((await call(C, 'POST', '/api/social/posts', { postType: 'meal', mealId: m.body.data._id })).status, 404);
  });
  await t('the post of the day: one a day, the same prompt for everyone, and the feed says whether you posted', async () => {
    const f0 = await feedOf(B); assert.equal(f0.daily.posted, false); assert.ok(f0.daily.prompt.length > 5);
    const r = await call(B, 'POST', '/api/social/posts', { postType: 'daily', content: 'Ran my first 10k', tz: 0 });
    assert.equal(r.status, 201); assert.equal(r.body.post.snapshot.prompt, f0.daily.prompt);
    assert.equal((await call(B, 'POST', '/api/social/posts', { postType: 'daily', content: 'Another', tz: 0 })).status, 409);
    assert.equal((await feedOf(B)).daily.posted, true); assert.equal((await feedOf(A)).daily.prompt, f0.daily.prompt);
  });
  await t('the feed tells you what you liked, counts, and your friends\' workout streaks', async () => {
    const f = await feedOf(B); const post = f.posts.find((p) => p.content === 'Ran my first 10k') || f.posts[0];
    const liked = await call(B, 'POST', `/api/social/posts/${f.posts[0]._id}/like`); assert.equal(liked.status, 200);
    const f2 = await feedOf(B); assert.equal(f2.posts.find((p) => p._id === f.posts[0]._id).liked, true); assert.ok(f2.posts[0].likeCount >= 0);
    const fa = await feedOf(B); const avaPost = fa.posts.find((p) => p.author.displayName === 'Ava Alpha'); assert.ok(avaPost.authorStreak >= 1);
  });
  await t('comments carry a name, never an email, and a stranger cannot read or write them', async () => {
    const f = await feedOf(A); const pid = f.posts[0]._id;
    assert.equal((await call(B, 'POST', `/api/social/posts/${pid}/comments`, { content: 'Nice!' })).status, 201);
    const list = await call(A, 'GET', `/api/social/posts/${pid}/comments`); assert.equal(list.status, 200); assert.ok(!JSON.stringify(list.body).includes('@'));
    assert.equal((await call(C, 'GET', `/api/social/posts/${pid}/comments`)).status, 404); assert.equal((await call(C, 'POST', `/api/social/posts/${pid}/comments`, { content: 'hi' })).status, 404);
    assert.equal((await call(C, 'POST', `/api/social/posts/${pid}/like`)).status, 404);
  });

  console.log('  Statuses');
  await t('a status can be text, or built from your real workout, meal or streak', async () => {
    assert.equal((await call(A, 'POST', '/api/stories', { kind: 'text', text: 'Rest day', theme: 2 })).status, 201);
    assert.equal((await call(A, 'POST', '/api/stories', { kind: 'text', text: '  ' })).status, 400);
    const w = (await call(A, 'GET', '/api/workouts')).body.data[0];
    const sw = await call(A, 'POST', '/api/stories', { kind: 'workout', workoutId: w._id }); assert.equal(sw.status, 201); assert.equal(sw.body.data.snapshot.exercise, w.exercise);
    assert.equal((await call(A, 'POST', '/api/stories', { kind: 'workout', workoutId: w._id }) ).status, 201);
    const ss = await call(A, 'POST', '/api/stories', { kind: 'streak', tz: 0 }); assert.equal(ss.status, 201); assert.ok(ss.body.data.snapshot.streak >= 1);
    assert.equal((await call(C, 'POST', '/api/stories', { kind: 'streak', tz: 0 })).status, 400);                       // no streak, no streak card
    assert.equal((await call(C, 'POST', '/api/stories', { kind: 'workout', workoutId: w._id })).status, 404);           // not C's workout
  });
  await t('friends see your statuses grouped by person, strangers do not, and viewing marks them seen', async () => {
    const before = (await call(B, 'GET', '/api/stories')).body.data; const ava = before.find((g) => g.author.displayName === 'Ava Alpha');
    assert.ok(ava && ava.stories.length >= 3); assert.equal(ava.seen, false); assert.equal(before[0].isMe, true === before[0].isMe ? before[0].isMe : false);
    assert.equal((await call(C, 'GET', '/api/stories')).body.data.some((g) => g.author.displayName === 'Ava Alpha'), false);
    for (const st of ava.stories) assert.equal((await call(B, 'POST', `/api/stories/${st._id}/view`)).status, 200);
    const after = (await call(B, 'GET', '/api/stories')).body.data.find((g) => g.author.displayName === 'Ava Alpha'); assert.equal(after.seen, true);
    assert.equal((await call(C, 'POST', `/api/stories/${ava.stories[0]._id}/view`)).status, 403);
    const mine = (await call(A, 'GET', '/api/stories')).body.data[0]; assert.equal(mine.isMe, true); assert.equal(mine.stories[0].viewCount, 1);
    const v = await call(A, 'GET', `/api/stories/${ava.stories[0]._id}/viewers`); assert.equal(v.body.data[0].displayName, 'Ben Bravo');
    assert.equal((await call(B, 'GET', `/api/stories/${ava.stories[0]._id}/viewers`)).status, 404);                       // only the author
  });
  await t('only the author can delete a status, and ten at a time is the limit', async () => {
    const id = (await call(A, 'GET', '/api/stories')).body.data[0].stories[0]._id;
    assert.equal((await call(B, 'DELETE', '/api/stories/' + id)).status, 404); assert.equal((await call(A, 'DELETE', '/api/stories/' + id)).status, 200);
    let last; for (let i = 0; i < 12; i++) last = await call(A, 'POST', '/api/stories', { kind: 'text', text: 'status ' + i });
    assert.equal(last.status, 429);
  });

  console.log('  Messages');
  await t('friends can message each other; strangers cannot; text is cleaned', async () => {
    const aId = await meId(A), bId = await meId(B), cId = await meId(C);
    assert.equal((await call(A, 'POST', '/api/messages/' + bId, { text: 'Gym at 6? <script>' })).status, 201);
    assert.equal((await call(A, 'POST', '/api/messages/' + cId, { text: 'hey' })).status, 403);
    assert.equal((await call(A, 'POST', '/api/messages/' + bId, { text: '   ' })).status, 400); assert.equal((await call(A, 'POST', '/api/messages/' + aId, { text: 'me' })).status, 403);
    const th = await call(B, 'GET', '/api/messages/' + aId); assert.equal(th.status, 200); assert.equal(th.body.data.messages[0].text, 'Gym at 6? script'); assert.equal(th.body.data.messages[0].mine, false); assert.equal(th.body.data.with.displayName, 'Ava Alpha');
    assert.equal((await call(C, 'GET', '/api/messages/' + aId)).status, 403);
  });
  await t('the inbox lists conversations with unread counts, and reading clears them', async () => {
    const aId = await meId(A), bId = await meId(B);
    await call(A, 'POST', '/api/messages/' + bId, { text: 'Second message' });
    const inbox = (await call(B, 'GET', '/api/messages')).body.data; assert.equal(inbox.length, 1); assert.equal(inbox[0].unread, 2); assert.equal(inbox[0].lastText, 'Second message'); assert.equal(inbox[0].displayName, 'Ava Alpha');
    assert.equal((await call(B, 'GET', '/api/messages/unread')).body.data.unread, 2);
    await call(B, 'POST', `/api/messages/${aId}/read`);
    assert.equal((await call(B, 'GET', '/api/messages/unread')).body.data.unread, 0); assert.equal((await call(B, 'GET', '/api/messages')).body.data[0].unread, 0);
    assert.equal((await call(A, 'GET', '/api/messages')).body.data[0].lastFromMe, true);
  });

  await t('the friends list shows the other person (not you, even if you sent the request), with a streak and no email', async () => {
    const fa = (await call(A, 'GET', '/api/friends')).body.friends; assert.ok(fa.some((f) => f.displayName === 'Ben Bravo'));
    assert.ok(fa.every((f) => f.displayName !== 'Ava Alpha')); assert.ok(!JSON.stringify(fa).includes('@')); assert.equal(typeof fa[0].streak, 'number');
    const fb = (await call(B, 'GET', '/api/friends')).body.friends; assert.equal(fb.length, 1); assert.equal(fb[0].displayName, 'Ava Alpha');
  });
  await t('friend requests list incoming and sent requests by name only', async () => {
    const cId = await meId(C), eId = await meId('ref');
    const r = await call('ref', 'POST', '/api/friends/request', { friendId: cId }); assert.equal(r.status, 200);
    const inc = (await call(C, 'GET', '/api/friends/requests')).body; assert.equal(inc.requests.length, 1); assert.ok(!JSON.stringify(inc).includes('@'));
    const sent = (await call('ref', 'GET', '/api/friends/requests')).body.sent; assert.equal(sent.length, 1); assert.equal(sent[0].recipient.displayName, 'Cleo Charlie');
    assert.equal((await call(C, 'POST', '/api/friends/decline/' + inc.requests[0].id)).status, 200);
    assert.equal((await call('ref', 'POST', '/api/friends/request', { friendId: cId })).status, 200);                      // can ask again after a decline
  });

  console.log('  People and streaks');
  await t('people can be found by name, without emails, and the board lists you and your friends by streak', async () => {
    const r = await call(A, 'GET', '/api/people/search?q=' + encodeURIComponent('cleo'));
    assert.equal(r.body.data.length, 1); assert.equal(r.body.data[0].displayName, 'Cleo Charlie'); assert.equal(r.body.data[0].relation, 'none'); assert.ok(!JSON.stringify(r.body).includes('@'));
    assert.equal((await call(A, 'GET', '/api/people/search?q=ben')).body.data[0].relation, 'friends'); assert.deepEqual((await call(A, 'GET', '/api/people/search?q=b')).body.data, []);
    assert.deepEqual((await call(A, 'GET', '/api/people/search?q=' + encodeURIComponent('(a+)+['))).body.data, []);
    const board = (await call(A, 'GET', '/api/people/streaks?tz=0')).body.data; assert.equal(board.length, 2); assert.equal(board[0].displayName, 'Ava Alpha'); assert.ok(board[0].streak >= 1); assert.equal(board[0].isMe, true);
  });

  console.log('  Reporting and blocking');
  await t('reports need a real target and a reason, cannot be filed twice, and you cannot report yourself', async () => {
    const aPosts = (await feedOf(A)).posts.filter((p) => p.mine); const pid = aPosts[0]._id;
    assert.equal((await call(B, 'POST', '/api/safety/report', { targetType: 'post', targetId: pid, reason: 'spam' })).status, 200);
    assert.equal((await call(B, 'POST', '/api/safety/report', { targetType: 'post', targetId: pid, reason: 'spam' })).body.alreadyReported, true);
    assert.equal((await call(A, 'POST', '/api/safety/report', { targetType: 'post', targetId: pid, reason: 'spam' })).status, 400);
    assert.equal((await call(B, 'POST', '/api/safety/report', { targetType: 'post', targetId: pid, reason: 'because' })).status, 400);
    assert.equal((await call(B, 'POST', '/api/safety/report', { targetType: 'post', targetId: 'not-an-id', reason: 'spam' })).status, 400);
    assert.equal((await call(B, 'POST', '/api/safety/report', { targetType: 'post', targetId: '64b64c8a2f1a2b3c4d5e6f70', reason: 'spam' })).status, 404);
  });
  await t('a post reported by three different people disappears from every feed', async () => {
    const r = await call(A, 'POST', '/api/social/posts', { content: 'Buy followers now' }); const pid = r.body.post._id;
    for (const who of [B]) await call(who, 'POST', '/api/safety/report', { targetType: 'post', targetId: pid, reason: 'spam' });
    assert.ok((await feedOf(B)).posts.some((p) => p._id === pid));                                                         // one report: still visible
    await befriend(A, C); await befriend(A, D);
    for (const who of [C, D]) await call(who, 'POST', '/api/safety/report', { targetType: 'post', targetId: pid, reason: 'spam' });
    assert.ok(!(await feedOf(B)).posts.some((p) => p._id === pid)); assert.ok(!(await feedOf(A)).posts.some((p) => p._id === pid));
  });
  await t('you can only report a message that was sent to you', async () => {
    const aId = await meId(A), bId = await meId(B);
    const sent = (await call(A, 'GET', '/api/messages/' + bId)).body.data.messages[0];
    assert.equal((await call(A, 'POST', '/api/safety/report', { targetType: 'message', targetId: sent._id, reason: 'harassment' })).status, 404);
    assert.equal((await call(B, 'POST', '/api/safety/report', { targetType: 'message', targetId: sent._id, reason: 'harassment', details: 'rude' })).status, 200);
  });
  await t('reviewers can read the reports, other people cannot', async () => {
    assert.equal((await call(A, 'GET', '/api/safety/reports')).status, 403);
    const r = await call('admin', 'GET', '/api/safety/reports'); assert.equal(r.status, 200); assert.ok(r.body.data.length >= 3); assert.ok(r.body.data[0].snippet !== undefined);
    assert.equal((await call('admin', 'PATCH', '/api/safety/reports/' + r.body.data[0]._id, { status: 'reviewed' })).status, 200);
  });
  await t('blocking removes the friendship, and each person disappears from the other\'s feed, statuses, messages and search', async () => {
    const aId = await meId(A), bId = await meId(B);
    assert.equal((await call(B, 'POST', '/api/safety/block/' + aId)).status, 200);
    assert.ok(!(await feedOf(B)).posts.some((p) => p.author.displayName === 'Ava Alpha'));
    assert.ok(!(await feedOf(A)).posts.some((p) => p.author.displayName === 'Ben Bravo'));
    assert.equal((await call(B, 'GET', '/api/stories')).body.data.some((g) => g.author.displayName === 'Ava Alpha'), false);
    assert.equal((await call(A, 'POST', '/api/messages/' + bId, { text: 'hello?' })).status, 403); assert.equal((await call(B, 'GET', '/api/messages')).body.data.length, 0);
    assert.equal((await call(A, 'GET', '/api/people/search?q=ben')).body.data.length, 0); assert.equal((await call(B, 'GET', '/api/people/search?q=ava')).body.data.length, 0);
    assert.equal((await call(B, 'GET', '/api/safety/blocks')).body.data[0].displayName, 'Ava Alpha');
    assert.equal((await call(B, 'POST', '/api/safety/block/' + bId)).status, 400);                                          // not yourself
  });
  await t('unblocking does not bring the friendship back; they would have to be friends again', async () => {
    const aId = await meId(A), bId = await meId(B);
    assert.equal((await call(B, 'DELETE', '/api/safety/block/' + aId)).status, 200);
    assert.equal((await call(A, 'POST', '/api/messages/' + bId, { text: 'hi again' })).status, 403);
    await befriend(A, B); assert.equal((await call(A, 'POST', '/api/messages/' + bId, { text: 'hi again' })).status, 201);
  });

  console.log('Support-agent live chat requires a signed-in agent');
  const { initializeSocket } = require(SRC + '/config/socket');
  initializeSocket(server);
  const { io: ioClient } = require('socket.io-client');
  const tryAgentSocket = (token) => new Promise((resolve) => {
    const sock = ioClient(base + '/agent', { transports: ['websocket'], auth: token === undefined ? {} : { token }, reconnection: false, timeout: 4000 });
    const done = (r) => { sock.close(); resolve(r); };
    sock.on('connect_error', (e) => done({ ok: false, message: e.message }));
    sock.on('agent_ready', (d) => done({ ok: true, ...d }));
  });
  await t('someone who is not signed in cannot connect to the agent queue', async () => {
    assert.deepEqual(await tryAgentSocket(undefined), { ok: false, message: 'Not authorized' });
    assert.deepEqual(await tryAgentSocket('not-a-token'), { ok: false, message: 'Not authorized' });
  });
  await t('a signed-in person who is not a support agent is refused too', async () => {
    assert.deepEqual(await tryAgentSocket('maya'), { ok: false, message: 'Agent access required' });
  });
  await t('a real support agent connects, and is identified by their account, not by anything they send', async () => {
    const { ensureLegacyUser } = require(SRC + '/services/legacy-user.service');
    const { SupportAgent } = require(SRC + '/models/SupportAgent.model');
    const acct = await ensureLegacyUser(users.coach.email, 'Casey Coach');
    const agent = await SupportAgent.create({ userId: acct._id, displayName: 'Casey', email: users.coach.email });
    const r = await tryAgentSocket('coach');
    assert.equal(r.ok, true); assert.equal(r.agentId, agent._id.toString()); assert.equal(r.agentName, 'Casey');
    assert.equal((await call('coach', 'GET', '/api/agent/dashboard')).status !== 403, true);
  });

  console.log('AI allowances (cost protection)');
  const gem = require(SRC + '/services/gemini.service');
  const realAnalyze = gem.analyzeFoodImageWithGemini; let aiMode = 'ok';
  gem.analyzeFoodImageWithGemini = async () => { if (aiMode === 'down') throw new gem.AiUnavailableError(); return { detectedFoods: [], totalNutrition: { calories: 100, protein: 5, carbs: 10, fat: 2 }, healthScore: 70, suggestions: [], alternatives: [], confidence: 0.9, mealType: 'lunch' }; };
  const photo = { imageBase64: 'A'.repeat(300) };
  await t('a Free account gets 3 photo scans a day, counted on the server; the 4th is refused with a clear message', async () => {
    for (let i = 0; i < 3; i++) assert.equal((await call('oldtimer', 'POST', '/api/ai/analyze-food', photo)).status, 200);
    const r = await call('oldtimer', 'POST', '/api/ai/analyze-food', photo);
    assert.equal(r.status, 429); assert.equal(r.body.code, 'quota_exceeded'); assert.equal(r.body.limit, 3); assert.match(r.body.message, /free photo scans/);
  });
  await t('scans that fail (AI down, bad photo) are not counted against the allowance', async () => {
    aiMode = 'down';
    for (let i = 0; i < 5; i++) assert.equal((await call('ref', 'POST', '/api/ai/analyze-food', photo)).status, 503);
    assert.equal((await call('ref', 'POST', '/api/ai/analyze-food', { imageBase64: 'short' })).status, 400);
    aiMode = 'ok';
    for (let i = 0; i < 3; i++) assert.equal((await call('ref', 'POST', '/api/ai/analyze-food', photo)).status, 200);
    assert.equal((await call('ref', 'POST', '/api/ai/analyze-food', photo)).status, 429);
  });
  await t('one person\'s allowance does not affect another\'s', async () => {
    assert.equal((await call('lateReal', 'POST', '/api/ai/analyze-food', photo)).status, 200);
  });
  await t('a photo that is far too large is refused before it reaches the AI', async () => {
    const r = await call('lateReal', 'POST', '/api/ai/analyze-food', { imageBase64: 'A'.repeat(8_100_000) });
    assert.equal(r.status, 413);
  });
  gem.analyzeFoodImageWithGemini = realAnalyze;


  console.log('Connected devices (Apple Watch, Galaxy Watch, Fitbit, WHOOP, Oura)');
  const devCrypto = require(SRC + '/services/devices/crypto');
  const { DeviceConnection } = require(SRC + '/models/DeviceConnection.model');
  const { DeviceReading } = require(SRC + '/models/DeviceReading.model');
  const { mergeDays } = require(SRC + '/services/devices/summary.service');
  const DA = 'dash', DB = 'twin';
  const dToday = new Date().toISOString().slice(0, 10), dYesterday = new Date(Date.now() - DAY).toISOString().slice(0, 10);
  const dJson = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

  // DA stand-in for every provider's servers. Local requests (to our own test server) pass straight through.
  const realFetchDev = global.fetch;
  const dHits = []; let whoopRefreshes = 0; let whoopDataStatus = 200; let whoopRefreshStatus = 200; let googleNotLinked = false;
  global.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('http://127.0.0.1')) return realFetchDev(url, init);
    const body = init.body ? String(init.body) : '';
    dHits.push({ method: init.method || 'GET', url: u, body, auth: init.headers && init.headers.Authorization });
    // WHOOP
    if (u === 'https://api.prod.whoop.com/oauth/oauth2/token') {
      const f = new URLSearchParams(body);
      if (f.get('grant_type') === 'authorization_code') return f.get('code') === 'good-code' && f.get('client_secret') === 'whoop-secret' ? dJson({ access_token: 'wA1', refresh_token: 'wR1', expires_in: 3600, scope: 'offline' }) : dJson({ error: 'invalid_grant' }, 400);
      whoopRefreshes++;
      return whoopRefreshStatus === 200 && f.get('refresh_token') ? dJson({ access_token: 'wA' + (whoopRefreshes + 1), refresh_token: 'wR' + (whoopRefreshes + 1), expires_in: 3600 }) : dJson({ error: 'invalid_grant' }, 400);
    }
    if (u.startsWith('https://api.prod.whoop.com/developer/v2/')) {
      if (init.method === 'DELETE') return dJson({}, 204 === 204 ? 200 : 200);
      if (whoopDataStatus !== 200) return dJson({ error: 'unauthorized' }, whoopDataStatus);
      if (u.includes('/user/profile/basic')) return dJson({ user_id: 4242, first_name: 'Sam', last_name: 'Lee', email: 'sam@private.test' });
      if (u.includes('/cycle')) return dJson({ records: [{ id: 77, start: dYesterday + 'T22:00:00.000Z', end: null, timezone_offset: '+00:00', score_state: 'SCORED', score: { strain: 12.4, kilojoule: 9000 } }] });
      if (u.includes('/recovery')) return dJson({ records: [{ cycle_id: 77, score_state: 'SCORED', score: { recovery_score: 81, resting_heart_rate: 52, hrv_rmssd_milli: 64.2, spo2_percentage: 97 } }] });
      if (u.includes('/activity/sleep')) return dJson({ records: [
        { nap: false, end: dToday + 'T06:30:00.000Z', timezone_offset: '+00:00', score: { sleep_performance_percentage: 88, stage_summary: { total_light_sleep_time_milli: 3 * 3600000, total_slow_wave_sleep_time_milli: 2 * 3600000, total_rem_sleep_time_milli: 2 * 3600000, total_awake_time_milli: 1800000 } } },
        { nap: true, end: dToday + 'T14:00:00.000Z', timezone_offset: '+00:00', score: { stage_summary: { total_light_sleep_time_milli: 1800000 } } }] });
    }
    // Oura
    if (u === 'https://api.ouraring.com/oauth/token') return dJson({ access_token: 'oA1', refresh_token: 'oR1', expires_in: 86400 });
    if (u.startsWith('https://api.ouraring.com/v2/usercollection/daily_activity')) return dJson({ data: [{ day: dToday, steps: 7000, active_calories: 410, score: 80 }] });
    if (u.startsWith('https://api.ouraring.com/v2/usercollection/daily_readiness')) return dJson({ data: [{ day: dToday, score: 74 }] });
    if (u.startsWith('https://api.ouraring.com/v2/usercollection/daily_sleep')) return dJson({ data: [{ day: dToday, score: 91 }] });
    if (u.startsWith('https://api.ouraring.com/v2/usercollection/sleep')) return dJson({ data: [{ day: dToday, type: 'long_sleep', total_sleep_duration: 27000, average_hrv: 48, lowest_heart_rate: 49 }, { day: dToday, type: 'nap', total_sleep_duration: 1200, average_hrv: 10, lowest_heart_rate: 99 }] });
    if (u.startsWith('https://api.ouraring.com/oauth/revoke')) return dJson({});
    // Fitbit through Google Health
    if (u === 'https://oauth2.googleapis.com/token') return dJson({ access_token: 'gA1', refresh_token: 'gR1', expires_in: 3600 });
    if (u === 'https://oauth2.googleapis.com/revoke') return dJson({});
    if (u === 'https://health.googleapis.com/v4/users/me/identity') return googleNotLinked ? dJson({ error: { code: 400, status: 'FAILED_PRECONDITION', details: [{ reason: 'ACCOUNT_NOT_LINKED' }] } }, 400) : dJson({ healthUserId: 'h-1', legacyUserId: 'AB12CD' });
    if (u.includes('/dataTypes/steps/dataPoints:dailyRollUp')) { const d = new Date(); return dJson({ rollupDataPoints: [{ civilStartTime: { date: { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }, time: {} }, steps: { countSum: '8430' } }] }); }
    if (u.includes('/dataTypes/sleep/dataPoints:reconcile')) { const d = new Date(); return dJson({ dataPoints: [{ sleep: { interval: { civilEndTime: { date: { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() } } }, summary: { minutesAsleep: '420' } } }, { sleep: { interval: { civilEndTime: { date: { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() } } }, summary: { minutesAsleep: '30' } } }] }); }
    if (u.includes('/daily-resting-heart-rate/')) return dJson({ error: { code: 400 } }, 400); // this person has no such data: skipped, not invented
    if (u.includes('/daily-heart-rate-variability/')) { const d = new Date(); return dJson({ dataPoints: [{ dailyHeartRateVariability: { date: { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }, averageHeartRateVariabilityMilliseconds: 41 } }] }); }
    return dJson({ error: 'unexpected call to ' + u }, 599);
  };
  const dState = (url) => new URL(url).searchParams.get('state');
  const dCallback = async (provider, query) => { const r = await realFetchDev(`${base}/api/devices/callback/${provider}?${new URLSearchParams(query)}`, { redirect: 'manual' }); return { status: r.status, location: r.headers.get('location') || '' }; };
  const dConnectUrl = async (as, provider) => (await call(as, 'POST', `/api/devices/${provider}/connect`)).body.data.url;
  const dListOf = async (as) => Object.fromEntries((await call(as, 'GET', '/api/devices')).body.data.map((d) => [d.id, d]));
  const dSummaryOf = async (as) => (await call(as, 'GET', '/api/devices/summary?days=3')).body.data;
  const dTodayOf = async (as) => (await dSummaryOf(as)).find((d) => d.date === dToday) || {};

  await t('the list shows all five devices; cloud ones say honestly when they are not switched on, and nothing is invented', async () => {
    const r = await call(DA, 'GET', '/api/devices');
    assert.equal(r.status, 200); assert.deepEqual(r.body.data.map((d) => d.id), ['apple_watch', 'galaxy_watch', 'fitbit', 'whoop', 'oura']);
    const by = Object.fromEntries(r.body.data.map((d) => [d.id, d]));
    assert.equal(by.whoop.available, false); assert.equal(by.whoop.unavailableReason, 'not_configured'); assert.equal(by.apple_watch.available, true);
    assert.ok(r.body.data.every((d) => d.connection === null));
    assert.equal((await call(null, 'GET', '/api/devices')).status, 401);
  });
  await t('connecting an unconfigured service is refused with a clear reason', async () => {
    const r = await call(DA, 'POST', '/api/devices/whoop/connect');
    assert.equal(r.status, 503); assert.equal(r.body.code, 'not_configured');
  });

  process.env.DEVICE_TOKEN_KEY = require('node:crypto').randomBytes(32).toString('base64');
  Object.assign(process.env, { WHOOP_CLIENT_ID: 'whoop-id', WHOOP_CLIENT_SECRET: 'whoop-secret', OURA_CLIENT_ID: 'oura-id', OURA_CLIENT_SECRET: 'oura-secret', GOOGLE_HEALTH_CLIENT_ID: 'g-id', GOOGLE_HEALTH_CLIENT_SECRET: 'g-secret', PUBLIC_API_URL: 'https://api.reprummble.test' });

  await t('the sign-in address is built for the right service, with the right app id, return address and a one-time state', async () => {
    const w = new URL(await dConnectUrl(DA, 'whoop'));
    assert.equal(w.origin + w.pathname, 'https://api.prod.whoop.com/oauth/oauth2/auth');
    assert.equal(w.searchParams.get('client_id'), 'whoop-id'); assert.equal(w.searchParams.get('redirect_uri'), 'https://api.reprummble.test/api/devices/callback/whoop');
    assert.equal(w.searchParams.get('state').length, 8); assert.match(w.searchParams.get('scope'), /offline/); assert.match(w.searchParams.get('scope'), /read:recovery/);
    const g = new URL(await dConnectUrl(DA, 'fitbit'));
    assert.equal(g.origin, 'https://accounts.google.com'); assert.equal(g.searchParams.get('access_type'), 'offline'); assert.match(g.searchParams.get('scope'), /googlehealth\.sleep\.readonly/);
    const o = new URL(await dConnectUrl(DA, 'oura')); assert.equal(o.origin + o.pathname, 'https://cloud.ouraring.com/oauth/authorize');
    assert.equal(w.searchParams.get('client_secret'), null);   // the secret never travels in the browser address
  });
  await t('Apple Watch and Galaxy Watch do not use a sign-in; asking for one is a 400', async () => {
    assert.equal((await call(DA, 'POST', '/api/devices/apple_watch/connect')).status, 400);
    assert.equal((await call(DA, 'POST', '/api/devices/nonsense/connect')).status, 400);
  });
  await t('a return from the sign-in with a wrong, expired or denied state stores nothing', async () => {
    await dConnectUrl(DB, 'whoop');
    let r = await dCallback('whoop', { code: 'good-code', state: 'WRONGSTA' });
    assert.equal(r.status, 302); assert.match(r.location, /^reprummble:\/\/devices\?/); assert.match(r.location, /error=expired/);
    r = await dCallback('whoop', { error: 'access_denied', state: 'x' }); assert.match(r.location, /error=denied/);
    r = await dCallback('whoop', {}); assert.match(r.location, /error=invalid/);
    assert.equal(await DeviceConnection.countDocuments({ userId: users[DB].id }), 0);
    // DA state made for one service cannot be used on another.
    const st = dState(await dConnectUrl(DB, 'oura')); r = await dCallback('whoop', { code: 'good-code', state: st }); assert.match(r.location, /error=expired/);
  });
  await t('WHOOP: a real sign-in return stores an encrypted connection, syncs real numbers, and the list never reveals tokens', async () => {
    const st = dState(await dConnectUrl(DA, 'whoop'));
    const r = await dCallback('whoop', { code: 'good-code', state: st });
    assert.match(r.location, /connected=1/); assert.match(r.location, /provider=whoop/);
    const row = await mongoose.connection.db.collection('deviceconnections').findOne({ userId: users[DA].id, provider: 'whoop' });
    assert.ok(row.accessTokenEnc.startsWith('v1.') && !row.accessTokenEnc.includes('wA1'), 'access token must be encrypted');
    assert.ok(row.refreshTokenEnc.startsWith('v1.') && !row.refreshTokenEnc.includes('wR1'), 'refresh token must be encrypted');
    assert.equal(devCrypto.decrypt(row.refreshTokenEnc), 'wR1');
    const raw = JSON.stringify((await call(DA, 'GET', '/api/devices')).body);
    for (const secret of ['wA1', 'wR1', 'accessTokenEnc', 'refreshTokenEnc', 'sam@private.test', 'whoop-secret']) assert.ok(!raw.includes(secret), 'leaked ' + secret);
    const d = (await dListOf(DA)).whoop;
    assert.equal(d.connection.status, 'connected'); assert.equal(d.connection.label, 'WHOOP · Sam'); assert.ok(d.connection.lastSyncAt);
    const day = await dTodayOf(DA);
    assert.deepEqual([day.strain.value, day.recovery.value, day.restingHR.value, day.hrv.value, day.sleepScore.value], [12.4, 81, 52, 64.2, 88]);
    assert.equal(day.sleepHours.value, 7); assert.equal(day.sleepHours.source, 'whoop');   // light + deep + REM, the nap not added
  });
  await t('the same sign-in link cannot be used twice', async () => {
    const st = dState(await dConnectUrl(DA, 'whoop'));
    assert.match((await dCallback('whoop', { code: 'good-code', state: st })).location, /connected=1/);
    assert.match((await dCallback('whoop', { code: 'good-code', state: st })).location, /error=expired/);
  });
  await t('a provider that rejects the code ends in a clean failure, with no connection created', async () => {
    const st = dState(await dConnectUrl(DB, 'whoop'));
    assert.match((await dCallback('whoop', { code: 'bad-code', state: st })).location, /error=failed/);
    assert.equal(await DeviceConnection.countDocuments({ userId: users[DB].id }), 0);
  });
  await t('Oura: connects and syncs; the main night counts, naps do not, and Oura\'s sleep outranks WHOOP\'s', async () => {
    assert.match((await dCallback('oura', { code: 'c', state: dState(await dConnectUrl(DA, 'oura')) })).location, /connected=1/);
    const day = await dTodayOf(DA);
    assert.equal(day.sleepHours.value, 7.5); assert.equal(day.sleepHours.source, 'oura');
    assert.deepEqual([day.hrv.value, day.hrv.source, day.restingHR.value], [48, 'oura', 49]);
    assert.deepEqual([day.recovery.value, day.recovery.source], [81, 'whoop']);   // recovery: WHOOP first
    assert.deepEqual([day.steps.value, day.steps.source], [7000, 'oura']);
  });
  await t('Fitbit (Google Health): connects, reads steps and sleep, skips what Google cannot give instead of inventing it', async () => {
    assert.match((await dCallback('fitbit', { code: 'c', state: dState(await dConnectUrl(DA, 'fitbit')) })).location, /connected=1/);
    const reading = await DeviceReading.findOne({ userId: users[DA].id, provider: 'fitbit', date: dToday }).lean();
    assert.equal(reading.steps, 8430); assert.equal(reading.sleepHours, 7); assert.equal(reading.hrv, 41); assert.equal(reading.restingHR, undefined);
    assert.equal((await dListOf(DA)).fitbit.connection.label, 'Fitbit');
  });
  await t('Fitbit before Google Health is set up: told to link the account, nothing stored', async () => {
    googleNotLinked = true;
    const r = await dCallback('fitbit', { code: 'c', state: dState(await dConnectUrl(DB, 'fitbit')) });
    googleNotLinked = false;
    assert.match(r.location, /error=not_linked/); assert.equal(await DeviceConnection.countDocuments({ userId: users[DB].id }), 0);
  });
  await t('Apple Watch / Galaxy Watch: the phone sends what the watch recorded; bad values are dropped, and steps from a watch outrank a ring', async () => {
    const r = await call(DA, 'POST', '/api/devices/phone/apple_watch', { label: 'Sam’s Apple Watch', days: [
      { date: dToday, steps: 9000, activeCalories: 500, restingHR: 55, hrv: 60 }, { date: dYesterday, steps: 9e9 }, { date: 'not-a-date', steps: 1 }, { date: dYesterday, sleepHours: 99 }] });
    assert.equal(r.status, 200); assert.equal(r.body.data.stored, 1);
    const d = (await dListOf(DA)).apple_watch.connection; assert.equal(d.label, 'Sam’s Apple Watch'); assert.equal(d.status, 'connected');
    const day = await dTodayOf(DA); assert.deepEqual([day.steps.value, day.steps.source], [9000, 'apple_watch']); assert.equal(day.activeCalories.source, 'apple_watch');
    assert.equal((await call(DA, 'POST', '/api/devices/cloud_nope/../phone')).status, 404);
    assert.equal((await call(DA, 'POST', '/api/devices/phone/whoop', { days: [] })).status, 400);   // cloud devices cannot be faked from the phone
    assert.equal((await call(DA, 'POST', '/api/devices/phone/galaxy_watch', { label: 'Galaxy Watch 7', days: [] })).status, 200);
  });
  await t('an expired access token is refreshed, and the new single-use refresh token replaces the old one', async () => {
    await DeviceConnection.updateOne({ userId: users[DA].id, provider: 'whoop' }, { expiresAt: new Date(Date.now() - 1000) });
    const before = whoopRefreshes;
    const r = await call(DA, 'POST', '/api/devices/whoop/sync');
    assert.equal(r.status, 200); assert.equal(whoopRefreshes, before + 1);
    const row = await mongoose.connection.db.collection('deviceconnections').findOne({ userId: users[DA].id, provider: 'whoop' });
    assert.equal(devCrypto.decrypt(row.refreshTokenEnc), 'wR' + (before + 2));
    assert.ok(dHits.some((h) => h.url.includes('/developer/v2/cycle') && h.auth === 'Bearer wA' + (before + 2)), 'data call used the new token');
  });
  await t('if the person revoked access (refresh fails), the device shows "sign in again" and keeps its old readings', async () => {
    await DeviceConnection.updateOne({ userId: users[DA].id, provider: 'whoop' }, { expiresAt: new Date(Date.now() - 1000) });
    whoopRefreshStatus = 400;
    const r = await call(DA, 'POST', '/api/devices/whoop/sync');
    whoopRefreshStatus = 200;
    assert.equal(r.status, 409); assert.equal(r.body.data.error, 'reauth');
    const c = (await dListOf(DA)).whoop.connection; assert.equal(c.status, 'needs_reauth'); assert.match(c.lastError, /Sign in again/);
    assert.equal(await DeviceReading.countDocuments({ userId: users[DA].id, provider: 'whoop' }) > 0, true);
  });
  await t('signing in again repairs the same connection (no duplicate)', async () => {
    assert.match((await dCallback('whoop', { code: 'good-code', state: dState(await dConnectUrl(DA, 'whoop')) })).location, /connected=1/);
    assert.equal(await DeviceConnection.countDocuments({ userId: users[DA].id, provider: 'whoop' }), 1);
    assert.equal((await dListOf(DA)).whoop.connection.status, 'connected');
  });
  await t('syncing everything is throttled, so opening the screen repeatedly does not hammer the providers', async () => {
    await call(DA, 'POST', '/api/devices/sync');
    const n = dHits.length; const r = await call(DA, 'POST', '/api/devices/sync');
    assert.equal(r.status, 200); assert.ok(r.body.data.every((x) => x.skipped), 'second sync skipped'); assert.equal(dHits.length, n);
  });
  await t('devices belong to their owner: others see none, and cannot sync, disconnect or read them', async () => {
    assert.ok(Object.values(await dListOf(DB)).every((d) => d.connection === null));
    assert.equal((await call(DB, 'POST', '/api/devices/whoop/sync')).status, 404);
    assert.equal((await call(DB, 'DELETE', '/api/devices/whoop')).status, 404);
    assert.deepEqual(await dSummaryOf(DB), []);
    assert.equal(await DeviceConnection.countDocuments({ userId: users[DA].id, provider: 'whoop' }), 1);
  });
  await t('disconnecting tells the service to stop, deletes the sign-in and that device\'s readings, and keeps the others', async () => {
    const r = await call(DA, 'DELETE', '/api/devices/whoop');
    assert.equal(r.status, 200); assert.ok(r.body.data.removedReadings > 0);
    assert.ok(dHits.some((h) => h.method === 'DELETE' && h.url === 'https://api.prod.whoop.com/developer/v2/user/access'), 'WHOOP was told to revoke');
    assert.equal(await DeviceConnection.countDocuments({ userId: users[DA].id, provider: 'whoop' }), 0);
    assert.equal(await DeviceReading.countDocuments({ userId: users[DA].id, provider: 'whoop' }), 0);
    const day = await dTodayOf(DA); assert.equal(day.strain, undefined); assert.equal(day.recovery.source, 'oura');   // falls back to the next device, honestly labelled
    assert.equal((await call(DA, 'DELETE', '/api/devices/whoop')).status, 404);
    assert.equal((await call(DA, 'DELETE', '/api/devices/apple_watch')).status, 200);
    assert.equal((await dListOf(DA)).apple_watch.connection, null);
  });
  await t('numbers from two devices are never added together; the merge is by priority', () => {
    const merged = mergeDays([{ provider: 'oura', date: '2026-01-01', steps: 7000, sleepHours: 7 }, { provider: 'apple_watch', date: '2026-01-01', steps: 9000 }, { provider: 'whoop', date: '2026-01-01', sleepHours: 6 }, { provider: 'unknown_thing', date: '2026-01-01', steps: 1 }]);
    assert.equal(merged.length, 1); assert.deepEqual(merged[0].steps, { value: 9000, source: 'apple_watch' }); assert.deepEqual(merged[0].sleepHours, { value: 7, source: 'oura' });
  });
  await t('stored tokens are tamper-evident and unreadable without the key', () => {
    const blob = devCrypto.encrypt('secret-token');
    assert.equal(devCrypto.decrypt(blob), 'secret-token');
    const parts = blob.split('.'); parts[3] = Buffer.from('x' + Buffer.from(parts[3], 'base64url').toString('binary')).toString('base64url');
    assert.throws(() => devCrypto.decrypt(parts.join('.')));
    const keep = process.env.DEVICE_TOKEN_KEY; process.env.DEVICE_TOKEN_KEY = 'too-short'; assert.throws(() => devCrypto.encrypt('x')); process.env.DEVICE_TOKEN_KEY = keep;
  });
  await t('without the lock key, services are reported unavailable rather than storing tokens in the clear', async () => {
    const keep = process.env.DEVICE_TOKEN_KEY; delete process.env.DEVICE_TOKEN_KEY;
    const d = await dListOf(DA); process.env.DEVICE_TOKEN_KEY = keep;
    assert.equal(d.oura.available, false); assert.equal(d.apple_watch.available, true);
  });
  await t('deleting an account also removes its devices, their readings and sign-ins', async () => {
    const uid = users.newbie2.id;
    await DeviceConnection.create({ userId: uid, provider: 'oura', kind: 'cloud', label: 'Oura Ring' });
    await DeviceConnection.create({ userId: uid, provider: 'apple_watch', kind: 'phone', label: 'Watch' });
    await DeviceReading.create({ userId: uid, provider: 'oura', date: dToday, steps: 100 });
    const r = await call('newbie2', 'DELETE', '/api/auth/account');
    assert.equal(r.status, 200);
    assert.equal(await DeviceConnection.countDocuments({ userId: uid }), 0); assert.equal(await DeviceReading.countDocuments({ userId: uid }), 0);
  });
  global.fetch = realFetchDev;

  console.log(`\n${pass} checks passed${process.exitCode ? ' (some FAILED)' : ''}`);
  server.close(); await require('mongoose').disconnect(); await mms.stop();
})().catch((e) => { console.error('Harness error:', e); process.exit(1); });
