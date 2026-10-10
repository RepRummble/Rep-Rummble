import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';
import Breadcrumb from '../components/Breadcrumb';

const FEATURES: { label: string; starter: string | boolean; pro: string | boolean; elite: string | boolean }[] = [
  { label: 'Meal logging',               starter: true,    pro: true,          elite: true },
  { label: 'Habit streaks',              starter: true,    pro: true,          elite: true },
  { label: 'Weekly insights',            starter: true,    pro: true,          elite: true },
  { label: 'Community challenges',       starter: '1/mo',  pro: 'Unlimited',   elite: 'Unlimited' },
  { label: 'AI meal analysis',           starter: false,   pro: true,          elite: true },
  { label: 'Custom meal plans',          starter: false,   pro: true,          elite: true },
  { label: 'Workout programming',        starter: false,   pro: true,          elite: true },
  { label: 'Wearable sync',             starter: false,   pro: 'All devices', elite: 'All devices' },
  { label: 'Recovery readiness score',   starter: false,   pro: true,          elite: true },
  { label: 'Advanced analytics',         starter: false,   pro: true,          elite: true },
  { label: 'Coach check-ins',            starter: false,   pro: false,         elite: '2× / month' },
  { label: 'Priority support',           starter: false,   pro: false,         elite: true },
  { label: 'Body-comp scanning',         starter: false,   pro: false,         elite: true },
];

const FAQ = [
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes — upgrades take effect immediately and you get credit for unused days. Downgrades kick in at the next billing cycle.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Every paid plan starts with a 14-day free trial. No credit card required to sign up.',
  },
  {
    q: 'What happens when my trial ends?',
    a: "We'll email you before the trial ends. If you don't add a payment method, you'll automatically move to the Starter (free) plan — no surprise charges.",
  },
  {
    q: 'Can I cancel at any time?',
    a: "Absolutely. Cancel from your profile page and billing stops at the end of your current period. You keep full access until then.",
  },
];

function FeatureValue({ val }: { val: string | boolean }) {
  if (val === false) return <span className="feat-no">—</span>;
  if (val === true)  return <span className="feat-yes">✓</span>;
  return <span className="feat-val">{val}</span>;
}

export default function Plans() {
  usePageMeta({
    title: 'Pricing Plans',
    description: 'Choose a Reprummble plan — Free, Pro ($9/mo), or Elite ($19/mo). Every paid plan includes a 14-day free trial. No credit card required.',
    canonical: '/plans',
  });
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const proPrice  = annual ? 7  : 9;
  const elitePrice = annual ? 15 : 19;

  return (
    <section className="section page-section plans-page" data-reveal>
      <Breadcrumb items={[{ label: 'Plans', to: '/plans' }]} />

      {/* ── HEADER ── */}
      <div className="section-head plans-head">
        <span className="pill pill-green">Pricing</span>
        <h1 className="gradient-heading">Start free. Upgrade when ready.</h1>
        <p>Every plan includes a 14-day free trial. No credit card required to get started.</p>

        {/* billing toggle */}
        <div className="billing-toggle">
          <button
            className={`billing-opt${!annual ? ' active' : ''}`}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </button>
          <button
            className={`billing-opt${annual ? ' active' : ''}`}
            onClick={() => setAnnual(true)}
          >
            Annual
            <span className="billing-save-badge">Save 20%</span>
          </button>
        </div>
      </div>

      {/* ── PLAN CARDS ── */}
      <div className="pricing-grid" data-stagger>

        {/* Starter */}
        <div className="price-card">
          <div className="price-card-head">
            <h3>Starter</h3>
            <div className="price-row">
              <p className="price">$0</p>
              <span className="price-cycle">/month</span>
            </div>
            <p className="price-desc">Everything you need to get moving.</p>
          </div>
          <ul className="price-features">
            <li>Meal &amp; habit logging</li>
            <li>Weekly progress insights</li>
            <li>1 community challenge / month</li>
          </ul>
          <div className="price-card-footer">
            <Link className="ghost-btn price-cta" to="/?auth=signup">
              Get started free
            </Link>
          </div>
        </div>

        {/* Pro */}
        <div className="price-card featured">
          <div className="price-badge-row">
            <span className="price-popular-badge">Most popular</span>
          </div>
          <div className="price-card-head">
            <h3>Pro</h3>
            <div className="price-row">
              <p className="price">${proPrice}</p>
              <span className="price-cycle">/month</span>
            </div>
            {annual && <p className="price-annual-note">Billed as ${proPrice * 12}/yr</p>}
            <p className="price-desc">AI coaching, wearables, and full analytics.</p>
          </div>
          <ul className="price-features">
            <li>Everything in Starter</li>
            <li>AI meal analysis + custom plans</li>
            <li>Full workout programming</li>
            <li>Wearable sync (all devices)</li>
            <li>Recovery readiness score</li>
            <li>Unlimited challenges</li>
          </ul>
          <div className="price-card-footer">
            <Link className="solid-btn price-cta" to="/?auth=signup">
              Start Pro trial
            </Link>
          </div>
        </div>

        {/* Elite */}
        <div className="price-card">
          <div className="price-card-head">
            <h3>Elite</h3>
            <div className="price-row">
              <p className="price">${elitePrice}</p>
              <span className="price-cycle">/month</span>
            </div>
            {annual && <p className="price-annual-note">Billed as ${elitePrice * 12}/yr</p>}
            <p className="price-desc">Pro + coach check-ins and priority support.</p>
          </div>
          <ul className="price-features">
            <li>Everything in Pro</li>
            <li>2 coach check-ins / month</li>
            <li>Body-composition scanning</li>
            <li>Priority support</li>
          </ul>
          <div className="price-card-footer">
            <Link className="ghost-btn price-cta" to="/?auth=signup">
              Go Elite
            </Link>
          </div>
        </div>

      </div>

      {/* ── FEATURE COMPARISON TABLE ── */}
      <div className="plans-compare" data-reveal>
        <h3 className="plans-compare-title">Full feature comparison</h3>
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th className="feat-col">Feature</th>
                <th className="plan-col">Starter</th>
                <th className="plan-col featured-col">Pro</th>
                <th className="plan-col">Elite</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.label}>
                  <td className="feat-label">{f.label}</td>
                  <td className="plan-val"><FeatureValue val={f.starter} /></td>
                  <td className="plan-val featured-col"><FeatureValue val={f.pro} /></td>
                  <td className="plan-val"><FeatureValue val={f.elite} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="plans-faq" data-reveal>
        <h3 className="plans-compare-title">Frequently asked questions</h3>
        <div className="plans-faq-list">
          {FAQ.map((item, i) => (
            <div
              key={i}
              className={`plans-faq-item${openFaq === i ? ' open' : ''}`}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div className="plans-faq-q">
                <span>{item.q}</span>
                <span className="plans-faq-chevron">{openFaq === i ? '−' : '+'}</span>
              </div>
              {openFaq === i && <p className="plans-faq-a">{item.a}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM CTA ── */}
      <div className="plans-bottom-cta" data-reveal>
        <p className="muted">Still unsure? Every plan starts with a free trial — no card needed.</p>
        <Link className="brutalist-btn" to="/?auth=signup">Start your free trial</Link>
      </div>

    </section>
  );
}
