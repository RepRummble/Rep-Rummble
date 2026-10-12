import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { PRICING } from '../config/pricing';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: `${PRICING.currency}0`,
    cycle: '/month',
    features: ['Workout & meal logging', 'Habit streaks', 'Weekly insights'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: `${PRICING.currency}${PRICING.premiumMonthly}`,
    cycle: '/month',
    features: ['Personalized AI training plan', 'AI meal photo analysis', 'Wearable sync', 'Daily recovery score', 'Unlimited challenges'],
    featured: true,
  },
];

export default function Payment() {
  const [searchParams] = useSearchParams();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(searchParams.get('plan') || 'premium');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, []);

  const plan = PLANS.find((p) => p.id === selectedPlan) || PLANS[1];

  return (
    <section className="section split page-section payment-page" data-reveal>
      <div>
        <h2>Secure payments</h2>
        <p>
          All payments are encrypted and PCI-ready. Pay with cards, wallets, or
          local payment methods.
        </p>
        <div className="payment-row" data-stagger>
          <span>Visa</span>
          <span>Mastercard</span>
          <span>Apple Pay</span>
          <span>Google Pay</span>
          <span>ACH</span>
          <span>Local wallets</span>
        </div>
        <div className="payment-notes" data-stagger>
          <div>
            <strong>PCI-compliant</strong>
            <span>Encrypted checkout with tokenized storage.</span>
          </div>
          <div>
            <strong>Flexible billing</strong>
            <span>Upgrade, pause, or cancel anytime in your dashboard.</span>
          </div>
          <div>
            <strong>Instant receipts</strong>
            <span>Invoice history for reimbursements and taxes.</span>
          </div>
        </div>
        <div className="page-actions" data-stagger>
          <Link className="solid-btn" to="/pricing">View All Plans</Link>
          {!isLoggedIn && <Link className="ghost-btn" to="/?auth=signup">Create Account</Link>}
        </div>

        <div className="plan-selector" data-stagger>
          <h4>Select plan</h4>
          <div className="plan-tabs" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {PLANS.map((p) => (
              <button
                key={p.id}
                className={`tab-chip${selectedPlan === p.id ? ' active' : ''}`}
                onClick={() => setSelectedPlan(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="payment-card" data-reveal>
        <h4>Order summary</h4>
        <div className="checkout-item">
          <span>{plan.name} Plan</span>
          <span>{plan.price}{plan.cycle}</span>
        </div>
        <ul className="price-features" style={{ margin: '12px 0' }}>
          {plan.features.map((f) => <li key={f}>{f}</li>)}
        </ul>
        <div className="checkout-total">
          <span>Total today</span>
          <span>{plan.price === '$0' ? 'Free' : plan.price}</span>
        </div>
        <div className="checkout-item muted">
          <span>Billed</span>
          <span>Monthly · cancel anytime</span>
        </div>
        {isLoggedIn ? (
          <div style={{ marginTop: 16, padding: '12px', background: 'var(--surface)', borderRadius: 8, textAlign: 'center' }}>
            <p style={{ margin: 0 }}>Payment processing coming soon.</p>
            <small className="muted">We'll notify you when billing is live.</small>
          </div>
        ) : (
          <Link className="solid-btn full" to="/?auth=signup" style={{ marginTop: 16, display: 'block', textAlign: 'center' }}>
            Sign up to get started
          </Link>
        )}
      </div>
    </section>
  );
}
