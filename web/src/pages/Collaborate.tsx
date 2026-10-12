import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Apple, Building2, Check, ClipboardList, CreditCard, Dumbbell, FileBarChart, Gift, Globe,
  HeartPulse, LayoutDashboard, Megaphone, Smartphone, Stethoscope, UserRound, Users, Utensils,
} from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { PREMIUM_UPGRADE, PRICING, fmtPrice } from '../config/pricing';
import { GymDashboard } from '../components/site/Mockups';
import Faq from '../components/site/Faq';
import { DEV_BYPASS_AUTH } from '../config/devAuth';
import { supabase } from '../config/supabase';
import { biz } from './business/api';

const BUSINESS_TYPES = ['Gym', 'CrossFit box', 'Studio', 'Personal trainer', 'Online coach', 'Nutritionist / dietitian', 'Employer / corporate wellness', 'Clinic / physiotherapist', 'Club / community', 'Other'];

const AUDIENCES = [
  { icon: Dumbbell, tone: '', title: 'Gyms & studios', desc: 'Give every member a training app with your branding on the programs, and add a perk that keeps them.' },
  { icon: UserRound, tone: 'is-violet', title: 'Personal trainers & online coaches', desc: 'Deliver plans, check in with clients, and get paid, without spreadsheets or messaging apps.' },
  { icon: Apple, tone: 'is-orange', title: 'Nutritionists & dietitians', desc: 'Build meal plans, set targets, and see what your clients actually eat.' },
  { icon: Building2, tone: '', title: 'Employers & wellness teams', desc: 'Offer Reprummble to your staff and track participation, not personal health data.' },
  { icon: Stethoscope, tone: 'is-violet', title: 'Clinics & physiotherapists', desc: 'Send rehab and mobility plans to patients and follow their progress between visits.' },
  { icon: Users, tone: 'is-orange', title: 'Clubs & communities', desc: 'Run challenges and leaderboards for a team, school, or running group.' },
];

const DASHBOARD_FEATURES = [
  { icon: Users, title: 'Manage your members', desc: 'Invite people, see who is active, and spot who needs a check-in.' },
  { icon: ClipboardList, title: 'Create workout plans', desc: 'Build plans once and assign them to one member or a whole group.' },
  { icon: Utensils, title: 'Create nutrition & food plans', desc: 'Set calorie and macro targets and build meal plans for each client.' },
  { icon: FileBarChart, title: 'Reports you can share', desc: 'Attendance, progress, and revenue reports you can export as CSV.' },
  { icon: HeartPulse, title: 'Progress at a glance', desc: 'Training consistency and results per member and for your whole business.' },
  { icon: CreditCard, title: 'Billing & payouts', desc: 'See sales, member pricing, and monthly payouts in one place.' },
];

const BENEFITS = [
  { icon: Gift, tone: '', title: 'Pro included for your members', desc: `Every member of your gym gets Reprummble Pro (normally ${fmtPrice(PRICING.proMonthly)}/month) as part of their membership — a perk that helps you win and keep members.` },
  { icon: Globe, tone: 'is-violet', title: 'Reach beyond your four walls', desc: 'Members who can\'t make it in every day can still train with your coaches from anywhere.' },
  { icon: CreditCard, tone: 'is-orange', title: 'New revenue, zero upfront cost', desc: `No setup or monthly fees. You keep ${PRICING.gymPayoutPercent}% of every program you sell.` },
  { icon: Smartphone, tone: '', title: 'Your programs, in a real app', desc: 'Publish workouts and plans to iOS, Android, and web without building anything yourself.' },
  { icon: LayoutDashboard, tone: '', title: 'One business dashboard', desc: 'See who joined, who is training, and who needs a check-in, all in one place.' },
  { icon: Megaphone, tone: 'is-violet', title: 'Get discovered', desc: 'Your gym and programs appear to Reprummble members looking for coaching nearby.' },
];

const STEPS = [
  { title: 'Apply in two minutes', desc: 'Tell us about your gym or coaching business. We review every application personally.' },
  { title: 'Publish your programs', desc: 'Upload your training programs and set your own prices. We help you onboard.' },
  { title: 'Get paid monthly', desc: `Members buy and train through Reprummble. You receive ${PRICING.gymPayoutPercent}% of every sale.` },
];

const FAQS = [
  { q: 'Is the business dashboard a separate login?', a: 'It uses your normal Reprummble account. Once your application is approved, your account gets access to the business dashboard, which is separate from the member app.' },
  { q: 'Do my members see each other\'s data?', a: 'No. Members only see their own data. You see the progress and activity members have shared with your business, and nothing else.' },
  { q: 'What does it cost to become a partner?', a: `Nothing upfront. There are no setup fees and no monthly subscription. Reprummble keeps ${100 - PRICING.gymPayoutPercent}% of program sales to cover the app, payments, and support; you keep ${PRICING.gymPayoutPercent}%.` },
  { q: 'Who sets the price of my programs?', a: 'You do. Pro and Premium members receive member pricing, which we agree with you during onboarding.' },
  { q: 'Do my members need to pay for Reprummble?', a: `No. Members of partner gyms get Reprummble Pro included. If they want 1-on-1 coaching extras, they can upgrade to Premium for just ${fmtPrice(PREMIUM_UPGRADE)}/month.` },
  { q: 'What kinds of businesses can collaborate?', a: 'Gyms, studios, personal trainers, online coaches, nutritionists, clinics, employers, and clubs. If you help people get healthier, we want to hear from you.' },
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
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState<boolean | null>(DEV_BYPASS_AUTH ? true : null);
  const [form, setForm] = useState({ name: '', contactEmail: '', city: '', type: 'Gym', size: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (DEV_BYPASS_AUTH) return;
    supabase.auth.getSession().then(({ data: { session } }) => setSignedIn(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => subscription.unsubscribe();
  }, []);

  const signIn = () => {
    try { sessionStorage.setItem('postAuthPath', '/collaborate#apply'); } catch { /* ignore */ }
    navigate('/?auth=signup');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) { setError('Please enter your business name.'); return; }
    if (form.contactEmail.trim() && !/^\S+@\S+\.\S+$/.test(form.contactEmail.trim())) { setError('Please enter a valid contact email.'); return; }
    setError('');
    setStatus('loading');
    const res = await biz.apply({ ...form, name: form.name.trim(), contactEmail: form.contactEmail.trim() });
    if (res.error) { setError(res.error); setStatus('error'); return; }
    setStatus('done');
  };

  if (signedIn === null) return <p className="dash-muted">Loading…</p>;

  if (!signedIn) {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <h3>Create a free account to apply</h3>
        <p>Your business account is linked to your Reprummble sign-in, so you can open the business dashboard as soon as we approve your application.</p>
        <div className="rr-hero-ctas">
          <button className="rr-btn rr-btn-primary rr-btn-lg" onClick={signIn}>Sign up to apply <ArrowRight size={18} /></button>
          <Link className="rr-btn rr-btn-outline rr-btn-lg" to="/?auth=signin">I already have an account</Link>
        </div>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="rr-msg-ok" style={{ padding: 24, fontSize: 16 }}>
        <strong>Application received.</strong> We review every application personally and reply within two business days.{' '}
        <Link to="/business">Check your application status</Link>
      </div>
    );
  }

  return (
    <form className="rr-form" onSubmit={submit} noValidate>
      <div className="rr-form-row">
        <label className="rr-field">Business name<input className="rr-input" value={form.name} onChange={set('name')} maxLength={120} autoComplete="organization" /></label>
        <label className="rr-field">Contact email (optional)<input className="rr-input" type="email" value={form.contactEmail} onChange={set('contactEmail')} placeholder="Defaults to your account email" autoComplete="email" /></label>
      </div>
      <div className="rr-form-row">
        <label className="rr-field">Business type
          <select className="rr-input" value={form.type} onChange={set('type')}>
            {BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="rr-field">City<input className="rr-input" value={form.city} onChange={set('city')} maxLength={120} autoComplete="address-level2" /></label>
      </div>
      <label className="rr-field">Number of members / clients
        <select className="rr-input" value={form.size} onChange={set('size')}>
          <option value="">Select…</option><option>Under 50</option><option>50–200</option><option>200–500</option><option>500+</option>
        </select>
      </label>
      <label className="rr-field">Anything else we should know? (optional)
        <textarea className="rr-input" value={form.message} onChange={set('message')} maxLength={2000} />
      </label>
      {error && <div className="rr-msg-err" role="alert">{error}</div>}
      <button className="rr-btn rr-btn-primary rr-btn-lg" type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Sending…' : 'Apply to collaborate'} <ArrowRight size={18} />
      </button>
    </form>
  );
}

export default function Collaborate() {
  usePageMeta({
    title: 'Collaboration',
    description: 'Gyms, coaches, nutritionists, clinics, and employers: collaborate with Reprummble and manage your members, plans, nutrition, and reports from one business dashboard.',
    canonical: '/collaborate',
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
            <span className="rr-eyebrow"><span className="rr-eyebrow-dot" /> For businesses · Free to join</span>
            <h1>Bring Reprummble to <span className="rr-gradient-text">your members and clients.</span></h1>
            <p className="rr-hero-lead">
              Run your members, plans, nutrition, and reports from one business dashboard, while your
              people train in the Reprummble app. No setup fees. No monthly subscription.
            </p>
            <div className="rr-hero-ctas">
              <a className="rr-btn rr-btn-primary rr-btn-lg" href="#apply">Apply to collaborate <ArrowRight size={18} /></a>
              <Link className="rr-btn rr-btn-outline rr-btn-lg" to="/business">Open business dashboard</Link>
            </div>
            <ul className="rr-hero-checks">
              <li><Check size={16} /> $0 to join</li>
              <li><Check size={16} /> Members get Pro free</li>
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

      <section className="rr-section">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <span className="rr-eyebrow">Who it's for</span>
            <h2>Built for anyone who helps people get healthier</h2>
            <p>Choose how you want to work with Reprummble. Many businesses do more than one.</p>
          </div>
          <div className="rr-grid-3" data-stagger>
            {AUDIENCES.map(({ icon: Icon, tone, title, desc }) => (
              <div className="rr-card" key={title}>
                <span className={`rr-icon ${tone}`}><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rr-section rr-section-tint" id="dashboard">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <span className="rr-eyebrow"><LayoutDashboard size={14} /> Business dashboard</span>
            <h2>One place to run it all</h2>
            <p>A separate dashboard built for businesses, so you can look after your people without touching the member app.</p>
          </div>
          <div className="rr-grid-3" data-stagger>
            {DASHBOARD_FEATURES.map(({ icon: Icon, title, desc }) => (
              <div className="rr-card" key={title}>
                <span className="rr-icon"><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
          <div className="rr-hero-ctas" style={{ justifyContent: 'center', marginTop: 36 }}>
            <Link className="rr-btn rr-btn-primary rr-btn-lg" to="/business">Open business dashboard <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      <section className="rr-section">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <span className="rr-eyebrow">Why collaborate</span>
            <h2>Grow without growing your overhead</h2>
            <p>Reprummble handles the app, payments, and tracking. You focus on your people.</p>
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
            <span className="rr-eyebrow">Apply to collaborate</span>
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
            <h2>Business questions</h2>
          </div>
          <Faq items={FAQS} />
        </div>
      </section>
    </div>
  );
}
