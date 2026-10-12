import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Check, Minus } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { PLAN_FEATURES, PLANS, PREMIUM_UPGRADE, PRICING, fmtPrice } from '../config/pricing';
import Faq from '../components/site/Faq';

const FAQS = [
  { q: 'Is the free plan really free?', a: 'Yes. The free plan has no time limit and never asks for a card. It has limits on logging and challenges, and you can upgrade whenever you want more.' },
  { q: "What's the difference between Pro and Premium?", a: `Pro gives you full access to every app feature. Premium adds a human touch: 1-on-1 check-ins with a coach twice a month, a custom nutrition plan, PDF progress reports, and priority support — for ${fmtPrice(PREMIUM_UPGRADE)} more a month.` },
  { q: 'I train at a partner gym. Do I get Pro for free?', a: `Yes. Members of Reprummble partner gyms get Pro included with their gym membership. Want coaching extras? Upgrade to Premium for just ${fmtPrice(PREMIUM_UPGRADE)}/month.` },
  { q: `How does the ${PRICING.trialDays}-day Pro trial work?`, a: `You get full Pro access for ${PRICING.trialDays} days. We remind you before it ends, and if you don't continue you simply return to the free plan — no surprise charges.` },
  { q: 'Can I switch plans or cancel anytime?', a: 'Yes. Upgrade, downgrade, or cancel from your account settings. Changes apply at the end of your current billing period.' },
  { q: 'Do I need a gym membership or a wearable?', a: 'No. Reprummble works at home, outdoors, or in any gym. Wearables add richer recovery data but are completely optional.' },
  { q: 'I run a gym. How do I partner with you?', a: `It's free to join. Your members get Pro included, you publish programs, and you keep ${PRICING.gymPayoutPercent}% of every program sale. Apply on our Collaboration page.` },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check size={18} className="rr-yes" aria-label="Included" />;
  if (value === false) return <Minus size={18} className="rr-no" aria-label="Not included" />;
  return <span>{value}</span>;
}

export default function Pricing() {
  usePageMeta({
    title: 'Pricing',
    description: `Reprummble plans: Free, Pro ${fmtPrice(PRICING.proMonthly)}/month, Premium ${fmtPrice(PRICING.premiumMonthly)}/month. Pro is included for members of partner gyms.`,
    canonical: '/pricing',
  });

  return (
    <div className="rr-page">
      <header className="rr-pagehead">
        <div className="rr-container">
          <span className="rr-eyebrow">Pricing</span>
          <h1>Simple pricing for <span className="rr-gradient-text">every household.</span></h1>
          <p>Start free. Go Pro for full access, or Premium for real coaching. No contracts, cancel anytime.</p>
        </div>
      </header>

      <section className="rr-section" style={{ paddingTop: 16 }}>
        <div className="rr-container">
          <div className="rr-price-grid" data-stagger>
            {PLANS.map((plan) => (
              <div className={`rr-price${plan.id === 'pro' ? ' is-featured' : ''}`} key={plan.id}>
                {'badge' in plan && <span className="rr-price-badge">{plan.badge}</span>}
                <h3>{plan.name}</h3>
                <div className="rr-price-amount">
                  {fmtPrice(plan.price)}<span className="rr-price-per">{plan.price === 0 ? 'forever' : '/month'}</span>
                </div>
                <p>{plan.tagline}</p>
                <Link
                  className={`rr-btn rr-btn-block ${plan.id === 'pro' ? 'rr-btn-primary' : plan.id === 'premium' ? 'rr-btn-dark' : 'rr-btn-outline'}`}
                  to="/?auth=signup"
                >
                  {plan.cta}
                </Link>
                <ul>
                  {plan.highlights.map((h) => <li key={h}><Check size={18} />{h}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <div className="rr-gym-perk" data-reveal>
            <span className="rr-icon"><Building2 size={22} /></span>
            <div>
              <strong>Train at a partner gym? Pro is included.</strong>
              <p>Members of Reprummble partner gyms get Pro at no extra cost — and can upgrade to Premium for just {fmtPrice(PREMIUM_UPGRADE)}/month.</p>
            </div>
            <Link className="rr-link-arrow" to="/collaborate">Is my gym a partner? <ArrowRight size={16} /></Link>
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
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col">Free</th>
                  <th scope="col">Pro<br /><small>{fmtPrice(PRICING.proMonthly)}/mo</small></th>
                  <th scope="col">Premium<br /><small>{fmtPrice(PRICING.premiumMonthly)}/mo</small></th>
                </tr>
              </thead>
              <tbody>
                {PLAN_FEATURES.map((f) => (
                  <tr key={f.label}>
                    <td>{f.label}</td>
                    <td><Cell value={f.free} /></td>
                    <td><Cell value={f.pro} /></td>
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
              <h2 style={{ marginTop: 14 }}>Give your members Pro. Keep {PRICING.gymPayoutPercent}% of every sale.</h2>
              <p>Free to join, no monthly subscription. Your members get Pro included, and you earn from every program you publish.</p>
            </div>
            <div className="rr-cta-actions">
              <Link className="rr-btn rr-btn-white rr-btn-lg" to="/collaborate">Learn about collaborating <ArrowRight size={18} /></Link>
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
