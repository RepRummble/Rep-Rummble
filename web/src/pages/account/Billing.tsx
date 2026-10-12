import { useState } from 'react';
import { Check } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PLANS, PRICING, fmtPrice } from '../../config/pricing';

export default function Billing() {
  const [params] = useSearchParams();
  const initial = PLANS.some((p) => p.id === params.get('plan')) ? (params.get('plan') as string) : 'pro';
  const [selected, setSelected] = useState(initial);
  const plan = PLANS.find((p) => p.id === selected) ?? PLANS[1];

  return (
    <>
      <div className="dash-head"><h1>Billing</h1><p>Choose a plan. You can cancel anytime.</p></div>

      <div className="dash-plans" role="radiogroup" aria-label="Plan">
        {PLANS.map((p) => (
          <button key={p.id} role="radio" aria-checked={selected === p.id} className={`dash-plan-opt${selected === p.id ? ' active' : ''}`} onClick={() => setSelected(p.id)}>
            <strong>{p.name}</strong>
            <b>{fmtPrice(p.price)}<small style={{ fontSize: 13, fontWeight: 500 }}>{p.price === 0 ? ' forever' : '/month'}</small></b>
            <ul>{p.highlights.slice(0, 4).map((h) => <li key={h}><Check size={12} /> {h}</li>)}</ul>
          </button>
        ))}
      </div>

      <section className="dash-card">
        <h2>Order summary</h2>
        <div className="dash-row"><span>{plan.name} plan</span><strong>{fmtPrice(plan.price)}{plan.price === 0 ? '' : '/month'}</strong></div>
        {plan.id === 'pro' && <div className="dash-row"><span>Free trial</span><strong>{PRICING.trialDays} days</strong></div>}
        <div className="dash-row"><span>Billed</span><span>{plan.price === 0 ? 'Never' : 'Monthly, cancel anytime'}</span></div>
        <div className="dash-banner-inline" role="note">
          <strong>Online payments are coming soon.</strong> We'll let you know when billing is live. Questions? <Link to="/contact">Contact us</Link>.
        </div>
      </section>
    </>
  );
}
