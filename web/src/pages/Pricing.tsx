import { Link } from 'react-router-dom';
import { ArrowRight, Check, Minus } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { PLAN_FEATURES, PRICING } from '../config/pricing';
import Faq from '../components/site/Faq';

const FAQS = [
  { q: 'Is the free plan really free?', a: 'Yes. The free plan has no time limit and never asks for a card. Upgrade only if and when you want more.' },
  { q: `How does the ${PRICING.trialDays}-day Premium trial work?`, a: `You get full Premium access for ${PRICING.trialDays} days. We remind you before it ends, and if you don't continue you simply return to the free plan — no surprise charges.` },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your account settings in a couple of clicks. You keep Premium until the end of the period you paid for.' },
  { q: 'Do I need a gym membership or a wearable?', a: 'No. Reprummble works at home, outdoors, or in any gym. Wearables add richer recovery data but are completely optional.' },
  { q: 'What are partner gym programs?', a: 'Training programs created by coaches at gyms that partner with Reprummble. You can buy them individually on the free plan, and Premium members get member pricing.' },
  { q: 'I run a gym. How do I partner with you?', a: `It's free to join. You publish programs, we handle the app and payments, and you keep ${PRICING.gymPayoutPercent}% of every sale. Apply on our For Gyms page.` },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check size={18} className="rr-yes" aria-label="Included" />;
  if (value === false) return <Minus size={18} className="rr-no" aria-label="Not included" />;
  return <span>{value}</span>;
}

export default function Pricing() {
  usePageMeta({
    title: 'Pricing',
    description: `Reprummble is free to start. Premium is ${PRICING.currency}${PRICING.premiumMonthly}/month with a ${PRICING.trialDays}-day free trial. Gyms join free and keep ${PRICING.gymPayoutPercent}% of program sales.`,
    canonical: '/pricing',
  });

  const free = PLAN_FEATURES.filter((f) => f.free !== false);
  const premiumExtras = PLAN_FEATURES.filter((f) => f.free === false || typeof f.premium === 'string');

  return (
    <div className="rr-page">
      <header className="rr-pagehead">
        <div className="rr-container">
          <span className="rr-eyebrow">Pricing</span>
          <h1>Simple pricing for <span className="rr-gradient-text">every household.</span></h1>
          <p>Start free. Upgrade for less than one drop-in gym class a month. No contracts, cancel anytime.</p>
        </div>
      </header>

      <section className="rr-section" style={{ paddingTop: 16 }}>
        <div className="rr-container">
          <div className="rr-price-grid is-two" data-stagger>
            <div className="rr-price">
              <h3>Free</h3>
              <div className="rr-price-amount">{PRICING.currency}0<span className="rr-price-per">forever</span></div>
              <p>Build the habit with the essentials.</p>
              <Link className="rr-btn rr-btn-outline rr-btn-block" to="/?auth=signup">Create free account</Link>
              <ul>
                {free.map((f) => (
                  <li key={f.label}><Check size={18} />{f.label}{typeof f.free === 'string' ? ` (${f.free.toLowerCase()})` : ''}</li>
                ))}
              </ul>
            </div>
            <div className="rr-price is-featured">
              <span className="rr-price-badge">Most popular</span>
              <h3>Premium</h3>
              <div className="rr-price-amount">{PRICING.currency}{PRICING.premiumMonthly}<span className="rr-price-per">/month</span></div>
              <p>Everything in Free, plus your personal coaching tools.</p>
              <Link className="rr-btn rr-btn-primary rr-btn-block" to="/?auth=signup">Start {PRICING.trialDays}-day free trial</Link>
              <ul>
                <li><Check size={18} /><strong>Everything in Free</strong></li>
                {premiumExtras.map((f) => (
                  <li key={f.label}><Check size={18} />{f.label}{typeof f.premium === 'string' ? ` (${f.premium.toLowerCase()})` : ''}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="rr-price-note" style={{ marginTop: 20 }}>Prices in USD. Taxes may apply depending on your location.</p>
        </div>
      </section>

      <section className="rr-section rr-section-tint">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <h2>Compare plans</h2>
          </div>
          <div className="rr-compare-wrap" data-reveal>
            <table className="rr-compare">
              <thead>
                <tr><th scope="col">Feature</th><th scope="col">Free</th><th scope="col">Premium</th></tr>
              </thead>
              <tbody>
                {PLAN_FEATURES.map((f) => (
                  <tr key={f.label}>
                    <td>{f.label}</td>
                    <td><Cell value={f.free} /></td>
                    <td><Cell value={f.premium} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rr-section">
        <div className="rr-container">
          <div className="rr-cta" data-reveal>
            <div>
              <span className="rr-eyebrow" style={{ background: 'rgba(255,255,255,0.08)', color: '#5eead4' }}>For gyms & coaches</span>
              <h2 style={{ marginTop: 14 }}>Free to join. Keep {PRICING.gymPayoutPercent}% of every sale.</h2>
              <p>No setup fees, no monthly subscription. Publish your programs and reach members across the city.</p>
            </div>
            <div className="rr-cta-actions">
              <Link className="rr-btn rr-btn-white rr-btn-lg" to="/for-gyms">Learn about partnering <ArrowRight size={18} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rr-section rr-section-tint">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <h2>Pricing questions</h2>
          </div>
          <Faq items={FAQS} />
        </div>
      </section>
    </div>
  );
}
