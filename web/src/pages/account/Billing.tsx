import { useEffect, useState } from 'react';
import { Check, CreditCard, Gift, RefreshCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { type BillingPlanId, type BillingView } from '../../config/api';
import { PLANS, PRICING, fmtPrice } from '../../config/pricing';

const RANK: Record<BillingPlanId, number> = { free: 0, pro: 1, premium: 2 };
const planName = (id: BillingPlanId) => PLANS.find((p) => p.id === id)?.name ?? id;
const planPrice = (id: BillingPlanId) => PLANS.find((p) => p.id === id)?.price ?? 0;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '');
const cardLabel = (c: NonNullable<BillingView['paymentMethod']>) => `${c.brand.charAt(0).toUpperCase()}${c.brand.slice(1)} ending in ${c.last4}`;

export default function Billing() {
  const [params] = useSearchParams();
  const [billing, setBilling] = useState<BillingView | null>(null);
  const [loadError, setLoadError] = useState('');
  const [pending, setPending] = useState<BillingPlanId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; needsCard: boolean } | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.billing.get().then(({ data, error: err }) => {
      if (cancelled) return;
      if (!data) { setLoadError(err || 'Could not load your billing details.'); return; }
      setBilling(data);
      // Arriving from the pricing page with a plan in the link opens that choice for confirming.
      const wanted = params.get('plan');
      if (wanted === 'pro' || wanted === 'premium') {
        if (wanted !== data.plan) setPending(wanted);
      }
    });
    return () => { cancelled = true; };
  }, [params]);

  if (loadError) return <><div className="dash-head"><h1>Billing</h1></div><p className="pf-status is-error" role="alert">{loadError}</p></>;
  if (!billing) return <p className="dash-muted">Loading…</p>;

  const run = async (action: () => ReturnType<typeof api.billing.get>, done: string) => {
    setBusy(true); setError(null); setNotice('');
    const { data, error: err, code } = await action();
    setBusy(false);
    if (!data) { setError({ message: err || 'Something went wrong. Please try again.', needsCard: code === 'payment_method_required' }); return; }
    setBilling(data); setPending(null); setNotice(done);
  };

  const confirmPlan = (target: BillingPlanId) => {
    const lower = RANK[target] < RANK[billing.plan];
    const same = target === billing.plan;
    const startsTrial = billing.plan === 'free' && target === 'pro' && billing.trialAvailable;
    return run(
      () => api.billing.changePlan(target),
      same ? `You are staying on ${planName(target)}.`
        : lower ? `Done. You will move to ${planName(target)} on ${day(billing.currentPeriodEnd)}.`
        : startsTrial ? `Your ${billing.trialDays}-day free trial of Pro has started.`
        : `You are now on ${planName(target)}.`,
    );
  };

  const paid = billing.plan !== 'free';
  const ending = paid && !billing.autoRenew;
  const trialing = billing.status === 'trialing';
  const price = planPrice(billing.plan);

  const actionFor = (id: BillingPlanId) => {
    if (id === billing.plan) return billing.scheduledPlan || ending ? 'Keep this plan' : null;
    if (RANK[id] > RANK[billing.plan]) return billing.plan === 'free' && id === 'pro' && billing.trialAvailable ? `Start ${billing.trialDays}-day free trial` : `Upgrade to ${planName(id)}`;
    return billing.scheduledPlan === id ? null : `Switch at next renewal`;
  };

  const explain = (target: BillingPlanId) => {
    const t = planName(target);
    if (target === billing.plan) return `Cancel the scheduled change and stay on ${t}.`;
    if (RANK[target] > RANK[billing.plan]) {
      if (billing.plan === 'free') {
        return target === 'pro' && billing.trialAvailable
          ? `Start ${t} free for ${billing.trialDays} days. You will not be charged until the trial ends, and if you do not add a payment method it simply ends.`
          : `${t} is ${fmtPrice(planPrice(target))}/month and starts right away. A payment method is required.`;
      }
      return trialing
        ? `Move to ${t} now. Nothing is charged until your trial ends on ${day(billing.trialEnd)}.`
        : `Move to ${t} now. You pay only the difference for the rest of this billing period, then ${fmtPrice(planPrice(target))}/month.`;
    }
    if (target === 'free') return `You keep ${planName(billing.plan)} until ${day(billing.currentPeriodEnd)}, then move to Free. You will not be charged again.`;
    return trialing
      ? `Switch to ${t} now. Nothing has been charged yet.`
      : `You keep ${planName(billing.plan)} until ${day(billing.currentPeriodEnd)}, then move to ${t} (${fmtPrice(planPrice(target))}/month). Nothing changes before then.`;
  };

  return (
    <>
      <div className="dash-head"><h1>Billing</h1><p>Your plan, renewal and payment method.</p></div>

      {!billing.configured && (
        <div className="dash-banner-inline" role="note">
          <strong>Online payments are coming soon.</strong> You can see your plan here now; paid plans open up when billing goes live. Questions? <Link to="/contact">Contact us</Link>.
        </div>
      )}
      {notice && <div className="bl-notice" role="status"><Check size={16} /> {notice}</div>}

      <section className="dash-card bl-current" aria-label="Current plan">
        <div className="bl-current-top">
          <div>
            <span className="bl-eyebrow">Current plan</span>
            <h2>{planName(billing.plan)}</h2>
            <p className="bl-price">{price === 0 ? 'Free forever' : <>{fmtPrice(price)}<small>/month</small></>}</p>
          </div>
          <div className="bl-badges">
            {trialing && <span className="pf-badge is-ok">Free trial</span>}
            {billing.status === 'past_due' && <span className="bl-badge-warn">Payment issue</span>}
            {paid && billing.status === 'active' && <span className="pf-badge is-ok">Active</span>}
          </div>
        </div>

        {billing.includedBy && billing.effectivePlan !== billing.plan && (
          <p className="bl-line"><Gift size={16} /> <span><strong>Pro is included</strong> with your {billing.includedBy} membership.</span></p>
        )}

        {paid && (
          <div className="pf-rows bl-rows">
            <div className="pf-row">
              <div>
                <strong><RefreshCw size={16} /> {ending ? 'Ends' : trialing ? 'Trial ends and billing starts' : 'Renews'}</strong>
                <small>{ending
                  ? `Your ${planName(billing.plan)} plan ends on ${day(billing.currentPeriodEnd)}. After that you are on Free.`
                  : trialing ? `${day(billing.trialEnd || billing.currentPeriodEnd)}${billing.paymentMethod ? '' : ' · add a payment method before then to keep your plan'}`
                  : `${day(billing.currentPeriodEnd)} · ${fmtPrice(price)}`}</small>
              </div>
            </div>
            <div className="pf-row">
              <div>
                <strong>Auto-renew</strong>
                <small>{billing.autoRenew ? 'Your plan renews automatically each month.' : 'Off. Your plan will end at the end of this period.'}</small>
              </div>
              <button
                role="switch" aria-checked={billing.autoRenew} aria-label="Auto-renew" className={`bl-switch${billing.autoRenew ? ' on' : ''}`} disabled={busy}
                onClick={() => run(() => api.billing.setAutoRenew(!billing.autoRenew), billing.autoRenew ? 'Auto-renew is off. Your plan will end on ' + day(billing.currentPeriodEnd) + '.' : 'Auto-renew is on.')}
              ><span /></button>
            </div>
            <div className="pf-row">
              <div>
                <strong><CreditCard size={16} /> Payment method</strong>
                <small>{billing.paymentMethod ? cardLabel(billing.paymentMethod) : 'None added yet'}</small>
              </div>
              <Link className="rr-btn rr-btn-outline" to="/dashboard/profile?section=payment">{billing.paymentMethod ? 'Change' : 'Add'}</Link>
            </div>
          </div>
        )}

        {billing.scheduledPlan && billing.scheduledPlan !== 'free' && (
          <div className="bl-scheduled" role="status">
            <span>Next billing cycle: you move to <strong>{planName(billing.scheduledPlan)}</strong> on {day(billing.scheduledFor)}.</span>
            <button className="rr-btn rr-btn-outline" disabled={busy} onClick={() => run(() => api.billing.changePlan(billing.plan), `You are staying on ${planName(billing.plan)}.`)}>Keep {planName(billing.plan)}</button>
          </div>
        )}
        {billing.referralDiscountPercent > 0 && (
          <p className="bl-line"><Gift size={16} /> <span>You have a <strong>{billing.referralDiscountPercent}% referral discount</strong> that will be applied to your next payment.</span></p>
        )}
      </section>

      <h2 className="bl-heading">{paid ? 'Change plan' : 'Choose a plan'}</h2>
      <div className="dash-plans" role="list" aria-label="Plans">
        {PLANS.map((p) => {
          const id = p.id as BillingPlanId;
          const action = actionFor(id);
          const isCurrent = id === billing.plan;
          return (
            <div role="listitem" key={id} className={`dash-plan-opt bl-plan${isCurrent ? ' active' : ''}`}>
              <strong>{p.name}{isCurrent && <span className="bl-current-tag">Current</span>}</strong>
              <b>{fmtPrice(p.price)}<small style={{ fontSize: 13, fontWeight: 500 }}>{p.price === 0 ? ' forever' : '/month'}</small></b>
              <ul>{p.highlights.slice(0, 4).map((h) => <li key={h}><Check size={12} /> {h}</li>)}</ul>
              {action ? (
                <button className={`rr-btn ${RANK[id] > RANK[billing.plan] ? 'rr-btn-primary' : 'rr-btn-outline'}`} disabled={busy || (!billing.configured && id !== billing.plan)} onClick={() => { setError(null); setNotice(''); setPending(id); }}>{action}</button>
              ) : <span className="bl-plan-note">{isCurrent ? 'Your plan' : `Scheduled for ${day(billing.scheduledFor)}`}</span>}
            </div>
          );
        })}
      </div>

      {pending && (
        <section className="dash-card bl-confirm" aria-label={`Confirm ${planName(pending)}`}>
          <h2>{pending === billing.plan ? `Stay on ${planName(pending)}` : `${RANK[pending] > RANK[billing.plan] ? 'Move up to' : 'Move down to'} ${planName(pending)}`}</h2>
          <p>{explain(pending)}</p>
          {pending === 'pro' && billing.plan === 'free' && billing.trialAvailable && <p className="dash-muted">After the trial, Pro is {fmtPrice(PRICING.proMonthly)}/month. Cancel anytime.</p>}
          {error && (
            <p className="pf-status is-error" role="alert">
              {error.message} {error.needsCard && <Link to="/dashboard/profile?section=payment">Add a payment method</Link>}
            </p>
          )}
          <div className="bl-actions">
            <button className="rr-btn rr-btn-outline" disabled={busy} onClick={() => { setPending(null); setError(null); }}>Cancel</button>
            <button className="rr-btn rr-btn-primary" disabled={busy} onClick={() => confirmPlan(pending)}>{busy ? 'Working…' : 'Confirm'}</button>
          </div>
        </section>
      )}
      {error && !pending && <p className="pf-status is-error" role="alert">{error.message} {error.needsCard && <Link to="/dashboard/profile?section=payment">Add a payment method</Link>}</p>}
    </>
  );
}
