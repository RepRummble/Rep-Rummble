import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Check, CreditCard, Globe, LayoutDashboard, Megaphone, Smartphone,
} from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { PRICING } from '../config/pricing';
import { GymDashboard } from '../components/site/Mockups';
import Faq from '../components/site/Faq';

const API_BASE = import.meta.env.VITE_API_URL || '';

const BENEFITS = [
  { icon: Globe, tone: '', title: 'Reach beyond your four walls', desc: 'Members who can\'t make it in every day can still train with your coaches from anywhere.' },
  { icon: CreditCard, tone: 'is-orange', title: 'New revenue, zero upfront cost', desc: `No setup or monthly fees. You keep ${PRICING.gymPayoutPercent}% of every program you sell.` },
  { icon: Smartphone, tone: 'is-violet', title: 'Your programs, in a real app', desc: 'Publish workouts and plans to iOS, Android, and web without building anything yourself.' },
  { icon: LayoutDashboard, tone: '', title: 'One partner dashboard', desc: 'See who joined, who is training, and who needs a check-in — all in one place.' },
  { icon: BarChart3, tone: 'is-orange', title: 'Data that improves coaching', desc: 'Member workouts, nutrition, and recovery data help you coach with context.' },
  { icon: Megaphone, tone: 'is-violet', title: 'Get discovered', desc: 'Your gym and programs appear to Reprummble members looking for coaching nearby.' },
];

const STEPS = [
  { title: 'Apply in two minutes', desc: 'Tell us about your gym or coaching business. We review every application personally.' },
  { title: 'Publish your programs', desc: 'Upload your training programs and set your own prices. We help you onboard.' },
  { title: 'Get paid monthly', desc: `Members buy and train through Reprummble. You receive ${PRICING.gymPayoutPercent}% of every sale.` },
];

const FAQS = [
  { q: 'What does it cost to become a partner?', a: `Nothing upfront. There are no setup fees and no monthly subscription. Reprummble keeps ${100 - PRICING.gymPayoutPercent}% of program sales to cover the app, payments, and support; you keep ${PRICING.gymPayoutPercent}%.` },
  { q: 'Who sets the price of my programs?', a: 'You do. Premium Reprummble members receive member pricing, which we agree with you during onboarding.' },
  { q: 'Do my existing members need to pay for Reprummble?', a: 'No. Your members can use the free plan and buy your programs directly. Premium is optional.' },
  { q: 'What kinds of businesses can partner?', a: 'Gyms, CrossFit boxes, studios, personal trainers, and online coaches. If you deliver training, we want to hear from you.' },
  { q: 'Is there a long-term contract?', a: 'No. You can pause or remove your programs at any time.' },
];

function EarningsCalculator() {
  const [members, setMembers] = useState(50);
  const [price, setPrice] = useState(30);
  const monthly = Math.round(members * price * (PRICING.gymPayoutPercent / 100));
  return (
    <div className="rr-calc">
      <div>
        <div className="rr-app-label">Earnings estimator</div>
        <h3 style={{ fontSize: 20, marginTop: 6 }}>What could your gym earn?</h3>
      </div>
      <label>
        <span style={{ display: 'flex', justifyContent: 'space-between' }}>Members buying a program <b>{members}</b></span>
        <input type="range" min={5} max={500} step={5} value={members} onChange={(e) => setMembers(Number(e.target.value))} />
      </label>
      <label>
        <span style={{ display: 'flex', justifyContent: 'space-between' }}>Program price (per month) <b>{PRICING.currency}{price}</b></span>
        <input type="range" min={5} max={150} step={5} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
      </label>
      <div className="rr-calc-out">
        <span style={{ fontWeight: 600 }}>Your monthly payout</span>
        <strong>{PRICING.currency}{monthly.toLocaleString()}</strong>
      </div>
      <small>Estimate only, based on a {PRICING.gymPayoutPercent}% payout. Actual earnings depend on your pricing and sales.</small>
    </div>
  );
}

function ApplyForm() {
  const [form, setForm] = useState({ name: '', email: '', gym: '', city: '', type: 'Gym', size: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.gym.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError('Please fill in your name, business name, and a valid email.');
      return;
    }
    setError('');
    setStatus('loading');
    const message = [
      '[Gym partner application]',
      `Business: ${form.gym}`,
      `Type: ${form.type}`,
      `City: ${form.city || '—'}`,
      `Members / clients: ${form.size || '—'}`,
      '',
      form.message || '(no message)',
    ].join('\n');
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), message }),
      });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="rr-msg-ok" style={{ padding: 24, fontSize: 16 }}>
        <strong>Application received.</strong> We'll get back to you within two business days.
      </div>
    );
  }

  return (
    <form className="rr-form" onSubmit={submit} noValidate>
      <div className="rr-form-row">
        <label className="rr-field">Your name<input className="rr-input" value={form.name} onChange={set('name')} autoComplete="name" /></label>
        <label className="rr-field">Work email<input className="rr-input" type="email" value={form.email} onChange={set('email')} autoComplete="email" /></label>
      </div>
      <div className="rr-form-row">
        <label className="rr-field">Business name<input className="rr-input" value={form.gym} onChange={set('gym')} autoComplete="organization" /></label>
        <label className="rr-field">City<input className="rr-input" value={form.city} onChange={set('city')} autoComplete="address-level2" /></label>
      </div>
      <div className="rr-form-row">
        <label className="rr-field">Business type
          <select className="rr-input" value={form.type} onChange={set('type')}>
            <option>Gym</option>
            <option>CrossFit box</option>
            <option>Studio (yoga, pilates, boxing…)</option>
            <option>Personal trainer</option>
            <option>Online coach</option>
          </select>
        </label>
        <label className="rr-field">Number of members / clients
          <select className="rr-input" value={form.size} onChange={set('size')}>
            <option value="">Select…</option>
            <option>Under 50</option>
            <option>50–200</option>
            <option>200–500</option>
            <option>500+</option>
          </select>
        </label>
      </div>
      <label className="rr-field">Anything else we should know? (optional)
        <textarea className="rr-input" value={form.message} onChange={set('message')} maxLength={2000} />
      </label>
      {error && <div className="rr-msg-err">{error}</div>}
      {status === 'error' && <div className="rr-msg-err">Something went wrong. Please try again or email us via the Contact page.</div>}
      <button className="rr-btn rr-btn-primary rr-btn-lg" type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Sending…' : 'Apply to partner'} <ArrowRight size={18} />
      </button>
    </form>
  );
}

export default function ForGyms() {
  usePageMeta({
    title: 'For Gyms & Coaches',
    description: `Partner with Reprummble: free to join, publish your training programs in our app, and keep ${PRICING.gymPayoutPercent}% of every sale.`,
    canonical: '/for-gyms',
  });
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="rr-page">
      <section className="rr-hero">
        <div className="rr-container rr-hero-grid">
          <div>
            <span className="rr-eyebrow"><span className="rr-eyebrow-dot" /> Partner program · Free to join</span>
            <h1>Put your gym in <span className="rr-gradient-text">every member's pocket.</span></h1>
            <p className="rr-hero-lead">
              Sell your training programs through the Reprummble app, coach members wherever they are,
              and keep {PRICING.gymPayoutPercent}% of every sale. No setup fees. No monthly subscription.
            </p>
            <div className="rr-hero-ctas">
              <a className="rr-btn rr-btn-primary rr-btn-lg" href="#apply">Apply to partner <ArrowRight size={18} /></a>
              <a className="rr-btn rr-btn-outline rr-btn-lg" href="#how">How it works</a>
            </div>
            <ul className="rr-hero-checks">
              <li><Check size={16} /> $0 to join</li>
              <li><Check size={16} /> Keep {PRICING.gymPayoutPercent}% of revenue</li>
              <li><Check size={16} /> No contract</li>
            </ul>
          </div>
          <div className="rr-visual">
            <div style={{ width: '100%' }}>
              <GymDashboard />
              <p className="rr-dash-note">Illustrative preview of the partner dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rr-section rr-section-tint">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <span className="rr-eyebrow">Why partner</span>
            <h2>Grow your gym without growing your rent</h2>
            <p>Reprummble handles the app, payments, and tracking. You focus on coaching.</p>
          </div>
          <div className="rr-grid-3" data-stagger>
            {BENEFITS.map(({ icon: Icon, tone, title, desc }) => (
              <div className="rr-card" key={title}>
                <span className={`rr-icon ${tone}`}><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rr-section rr-section-dark" id="how">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <span className="rr-eyebrow" style={{ background: 'rgba(255,255,255,0.08)', color: '#5eead4' }}>How it works</span>
            <h2>Live in three simple steps</h2>
          </div>
          <div className="rr-steps" data-stagger>
            {STEPS.map((s, i) => (
              <div className="rr-step" key={s.title}>
                <div className="rr-step-num">{i + 1}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rr-section">
        <div className="rr-container rr-split" data-reveal>
          <div>
            <span className="rr-eyebrow">Transparent revenue share</span>
            <h2>You keep {PRICING.gymPayoutPercent}%. Always.</h2>
            <p>
              No hidden fees and no subscription. Reprummble's {100 - PRICING.gymPayoutPercent}% covers the app, payment
              processing, hosting, and partner support. You set your own program prices.
            </p>
            <ul>
              <li><Check size={18} /> Monthly payouts</li>
              <li><Check size={18} /> Clear sales reporting in your dashboard</li>
              <li><Check size={18} /> Your members can stay on the free plan</li>
            </ul>
          </div>
          <div className="rr-split-visual"><EarningsCalculator /></div>
        </div>
      </section>

      <section className="rr-section rr-section-tint" id="apply">
        <div className="rr-container rr-split" style={{ alignItems: 'start' }}>
          <div data-reveal>
            <span className="rr-eyebrow">Become a partner</span>
            <h2>Let's grow together</h2>
            <p>Tell us a little about your business. We personally review every application and reply within two business days.</p>
            <ul>
              <li><Check size={18} /> Free onboarding help</li>
              <li><Check size={18} /> Help publishing your first program</li>
              <li><Check size={18} /> Direct line to our team</li>
            </ul>
          </div>
          <div className="rr-card" style={{ padding: 'clamp(22px, 4vw, 36px)' }} data-reveal>
            <ApplyForm />
          </div>
        </div>
      </section>

      <section className="rr-section">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <h2>Partner questions</h2>
          </div>
          <Faq items={FAQS} />
        </div>
      </section>
    </div>
  );
}
