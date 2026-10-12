// A small stand-in for the parts of Stripe that billing uses, so the billing rules can be tested
// without a network or real keys. It keeps just enough state (customers, cards, subscriptions,
// schedules) to behave like Stripe for upgrades, next-cycle downgrades and renewals.
const Stripe = require('stripe');
const DAY = 86400;
const now = () => Math.floor(Date.now() / 1000);

function createFakeStripe() {
  let n = 0;
  const id = (prefix) => `${prefix}_${++n}`;
  const state = { customers: {}, cards: {}, subs: {}, schedules: {}, coupons: [], calls: [], failCharges: false, failCancel: false };
  const log = (name, args) => state.calls.push({ name, args });
  const notFound = () => Object.assign(new Error('No such resource'), { code: 'resource_missing' });
  const price = (pid) => ({ id: pid });
  const item = (sub) => sub.items.data[0];

  const subscriptions = {
    async create(p) {
      log('subscriptions.create', p);
      const c = state.customers[p.customer];
      if (!c) throw notFound();
      const trialing = !!p.trial_period_days;
      if (!trialing && (state.failCharges || !c.invoice_settings.default_payment_method)) {
        throw Object.assign(new Error('Your card was declined.'), { code: 'card_declined' });
      }
      const start = now();
      const trialEnd = trialing ? start + p.trial_period_days * DAY : null;
      const sub = {
        id: id('sub'), customer: p.customer, status: trialing ? 'trialing' : 'active', metadata: p.metadata || {},
        cancel_at_period_end: false, trial_end: trialEnd, schedule: null, default_payment_method: null,
        items: { data: [{ id: id('si'), price: price(p.items[0].price), current_period_end: trialEnd || start + 30 * DAY }] },
      };
      state.subs[sub.id] = sub;
      return structuredClone(sub);
    },
    async retrieve(sid) { const s = state.subs[sid]; if (!s) throw notFound(); return structuredClone(s); },
    async update(sid, p) {
      log('subscriptions.update', p);
      const s = state.subs[sid]; if (!s) throw notFound();
      if (p.items) {
        if (state.failCharges && p.proration_behavior === 'always_invoice') throw Object.assign(new Error('Your card was declined.'), { code: 'card_declined' });
        item(s).price = price(p.items[0].price);
      }
      if (typeof p.cancel_at_period_end === 'boolean') s.cancel_at_period_end = p.cancel_at_period_end;
      if (p.default_payment_method) s.default_payment_method = p.default_payment_method;
      return structuredClone(s);
    },
    async cancel(sid) {
      log('subscriptions.cancel', sid);
      if (state.failCancel) throw new Error('Stripe is unavailable');
      const s = state.subs[sid]; if (!s) throw notFound();
      s.status = 'canceled'; return structuredClone(s);
    },
  };

  const stripe = {
    webhooks: Stripe.webhooks,
    customers: {
      async create(p) { log('customers.create', p); const c = { id: id('cus'), email: p.email, invoice_settings: { default_payment_method: null } }; state.customers[c.id] = c; state.cards[c.id] = []; return c; },
      async update(cid, p) { log('customers.update', p); Object.assign(state.customers[cid].invoice_settings, p.invoice_settings || {}); return state.customers[cid]; },
      async del(cid) { log('customers.del', cid); if (!state.customers[cid]) throw notFound(); delete state.customers[cid]; return { id: cid, deleted: true }; },
    },
    setupIntents: { async create(p) { log('setupIntents.create', p); return { id: id('seti'), client_secret: `seti_secret_${n}` }; } },
    paymentMethods: {
      async list(p) { return { data: [...(state.cards[p.customer] || [])] }; },
      async detach(pid) { for (const cid of Object.keys(state.cards)) state.cards[cid] = state.cards[cid].filter((c) => c.id !== pid); return {}; },
    },
    coupons: { async create(p) { log('coupons.create', p); state.coupons.push(p); return { id: id('coupon') }; } },
    subscriptions,
    subscriptionSchedules: {
      async create(p) {
        log('schedules.create', p);
        const s = state.subs[p.from_subscription];
        const sched = { id: id('sub_sched'), subscription: s.id, phases: [{ start_date: now(), end_date: item(s).current_period_end, items: [{ price: item(s).price.id, quantity: 1 }] }] };
        state.schedules[sched.id] = sched; s.schedule = sched.id;
        return structuredClone(sched);
      },
      async update(sid, p) { log('schedules.update', p); if (!state.schedules[sid]) throw notFound(); state.schedules[sid].phases = p.phases.map((ph) => ({ ...ph })); return structuredClone(state.schedules[sid]); },
      async release(sid) { log('schedules.release', sid); const sc = state.schedules[sid]; if (!sc) throw notFound(); state.subs[sc.subscription].schedule = null; delete state.schedules[sid]; return {}; },
    },
  };

  /** Test helpers that act as the outside world. */
  const helpers = {
    state,
    /** The person types a card into Stripe's secure form. */
    addCard(customerId, last4, brand = 'visa') {
      const card = { id: id('pm'), created: now() + n, card: { brand, last4, exp_month: 12, exp_year: 2030 } };
      state.cards[customerId].push(card); return card;
    },
    /** The billing period ends: scheduled changes happen, cancellations take effect, or it renews. */
    renew(subId) {
      const s = state.subs[subId];
      const sched = s.schedule && state.schedules[s.schedule];
      if (s.cancel_at_period_end) { s.status = 'canceled'; return structuredClone(s); }
      if (sched && sched.phases[1]) { item(s).price = price(sched.phases[1].items[0].price); delete state.schedules[sched.id]; s.schedule = null; }
      if (s.status === 'trialing') s.status = 'active';
      item(s).current_period_end += 30 * DAY;
      return structuredClone(s);
    },
  };
  return { stripe, helpers };
}
module.exports = { createFakeStripe };
