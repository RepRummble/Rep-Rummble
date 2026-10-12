import { Link } from 'react-router-dom';
import {
  Activity, Apple, ArrowRight, Check, Dumbbell, HeartPulse, LineChart, MessageCircle, Monitor, Moon, RefreshCw, Smartphone,
  Trophy, Users, Watch,
} from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { PLANS, PREMIUM_UPGRADE, PRICING, fmtPrice } from '../config/pricing';
import { PhoneMockup } from '../components/site/Mockups';
import { LiveStats, ReviewsSection } from '../components/site/Reviews';
import StoreButtons from '../components/site/StoreButtons';
import Faq from '../components/site/Faq';
import { openChat } from '../components/chat/openChat';
import { Poster } from '../components/library/LibraryUI';
import { CHALLENGES, EXERCISES, PROGRAMS, WORKOUTS, type Focus } from '../content/library';

const DEVICES = ['Apple Health', 'Garmin', 'Oura', 'Whoop', 'Fitbit', 'Polar'];

const LIBRARY: { to: string; label: string; count: number; focus: Focus; blurb: string }[] = [
  { to: '/workouts', label: 'Workouts', count: WORKOUTS.length, focus: 'full-body', blurb: 'Sessions from 10 to 45 minutes' },
  { to: '/programs', label: 'Programs', count: PROGRAMS.length, focus: 'upper', blurb: 'Multi-week plans for every goal' },
  { to: '/challenges', label: 'Challenges', count: CHALLENGES.length, focus: 'lower', blurb: '14 to 30-day challenges' },
  { to: '/exercises', label: 'Exercises', count: EXERCISES.length, focus: 'mobility', blurb: 'Step-by-step how-to guides' },
];

const SYNC = [
  { icon: Smartphone, tone: '', title: 'iPhone & Android', desc: 'Train with guided workouts, log meals, and sync your wearable on the go.' },
  { icon: Monitor, tone: 'is-orange', title: 'Web', desc: 'Browse workouts, review your reports, and manage billing on a bigger screen.' },
  { icon: RefreshCw, tone: 'is-violet', title: 'Always in sync', desc: 'Finish a workout on one device and it shows up everywhere — no exporting, no manual sync.' },
];

const PILLARS = [
  { icon: Dumbbell, tone: '', title: 'Training that adapts', desc: 'A plan built around your schedule, equipment, and level — at home, outdoors, or in the gym.' },
  { icon: Apple, tone: 'is-orange', title: 'Nutrition made simple', desc: 'Snap a photo to log a meal. Hit your protein and calorie targets without counting by hand.' },
  { icon: Moon, tone: 'is-violet', title: 'Recovery you can see', desc: 'Sleep and heart-rate data become one daily readiness score, so you know when to push.' },
  { icon: Watch, tone: '', title: 'Your devices, connected', desc: 'Sync the wearable you already own. No new hardware needed to get started.' },
  { icon: LineChart, tone: 'is-orange', title: 'Progress, explained', desc: 'Weekly insights connect your habits to your results in plain language.' },
  { icon: Trophy, tone: 'is-violet', title: 'Motivation built in', desc: 'Challenges and streaks keep you going on the days motivation runs out.' },
];

const STEPS = [
  { title: 'Create a free account', desc: 'Sign up on the web or in the app with email, Google, or Apple. No card needed.' },
  { title: 'Tell us about you', desc: 'Pick your goal, level, training days, and the equipment you have. Takes about two minutes.' },
  { title: 'Follow your plan', desc: 'Get a weekly plan with guided workouts. It gets harder as you get fitter, on every device.' },
];

const HOME_FAQ = [
  { q: 'Is Reprummble really free?', a: `Yes. The Free plan costs nothing and needs no card. Pro (${fmtPrice(PRICING.proMonthly)}/month) unlocks unlimited logging, your personalized AI plan, and wearable sync, with a ${PRICING.trialDays}-day free trial.` },
  { q: 'Do I need gym equipment?', a: 'No. Many workouts and programs use only your bodyweight. Tell us what you have — nothing, dumbbells, bands, or a full gym — and your plan uses just that.' },
  { q: 'Can I use the same account on my phone and the web?', a: 'Yes. Sign in with the same account on iPhone, Android, and reprummble.com. Your plan, workouts, and progress sync automatically.' },
  { q: 'I am a complete beginner. Where do I start?', a: 'Start with the “Start Here: 4 Weeks” program. It uses easier variations, short sessions, and plenty of rest while you learn the moves.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your account settings whenever you like. You keep paid features until the end of your billing period.' },
];

export default function Home() {
  usePageMeta({
    title: 'Reprummble — Fitness for every budget',
    description: `One app for training, nutrition, and recovery. Start free, go Pro for ${fmtPrice(PRICING.proMonthly)}/month. Members of partner gyms get Pro included.`,
    canonical: '/',
  });

  return (
    <div className="rr-page">
      {/* HERO */}
      <section className="rr-hero">
        <div className="rr-container rr-hero-grid">
          <div>
            <span className="rr-eyebrow"><span className="rr-eyebrow-dot" /> Now on web, iOS & Android</span>
            <h1>
              Fitness that fits <span className="rr-gradient-text">every budget.</span>
            </h1>
            <p className="rr-hero-lead">
              Training, nutrition, and recovery in one simple app. Start free, upgrade for less
              than the cost of a single gym class, and follow programs from coaches at our partner gyms.
            </p>
            <div className="rr-hero-ctas">
              <Link className="rr-btn rr-btn-primary rr-btn-lg" to="/?auth=signup">
                Start free <ArrowRight size={18} />
              </Link>
              <Link className="rr-btn rr-btn-outline rr-btn-lg" to="/workouts">
                Browse workouts
              </Link>
            </div>
            <ul className="rr-hero-checks">
              <li><Check size={16} /> Free plan, no card needed</li>
              <li><Check size={16} /> Pro from {fmtPrice(PRICING.proMonthly)}/mo</li>
              <li><Check size={16} /> Cancel anytime</li>
            </ul>
          </div>
          <div className="rr-visual">
            <PhoneMockup />
            <div className="rr-float-card rr-float-a" aria-hidden="true">
              <span className="rr-float-icon" style={{ background: 'var(--rr-brand-soft)', color: 'var(--rr-brand)' }}><HeartPulse size={18} /></span>
              <div><strong>Recovery tracked</strong><span>from your wearable</span></div>
            </div>
            <div className="rr-float-card rr-float-b" aria-hidden="true">
              <span className="rr-float-icon" style={{ background: 'var(--rr-accent-soft)', color: 'var(--rr-accent)' }}><Activity size={18} /></span>
              <div><strong>Plan adjusted</strong><span>based on today</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* DEVICES */}
      <div className="rr-strip">
        <div className="rr-container rr-strip-inner">
          <span className="rr-strip-label">Works with</span>
          {DEVICES.map((d) => <span className="rr-strip-item" key={d}>{d}</span>)}
        </div>
      </div>

      {/* LIBRARY */}
      <section className="rr-section">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <span className="rr-eyebrow">Inside the app</span>
            <h2>Workouts, programs, and challenges ready to go</h2>
            <p>Browse everything you get before you sign up. Every workout comes with step-by-step instructions and a guided timer.</p>
          </div>
          <div className="lib-hub" data-stagger>
            {LIBRARY.map(({ to, label, count, focus, blurb }) => (
              <Link className="lib-card" to={to} key={to}>
                <Poster focus={focus} label={label}>
                  <span className="lib-hub-count">{count}</span>
                  <span className="lib-poster-title" style={{ fontSize: 18 }}>{blurb}</span>
                </Poster>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link className="rr-link-arrow" to="/workouts">Browse all workouts <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="rr-section rr-section-tint">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <span className="rr-eyebrow">Simple to start</span>
            <h2>Up and running in minutes</h2>
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

      {/* FEATURES */}
      <section className="rr-section">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <span className="rr-eyebrow">Everything in one place</span>
            <h2>Stop juggling five different apps</h2>
            <p>Your workouts, meals, sleep, and wearable data finally work together.</p>
          </div>
          <div className="rr-grid-3" data-stagger>
            {PILLARS.map(({ icon: Icon, tone, title, desc }) => (
              <div className="rr-card rr-card-hover" key={title}>
                <span className={`rr-icon ${tone}`}><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link className="rr-link-arrow" to="/features">Explore all features <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* SYNC */}
      <section className="rr-section rr-section-tint">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <span className="rr-eyebrow">One account, every device</span>
            <h2>Start on your phone. Pick up on the web.</h2>
            <p>Sign in with the same account everywhere. Your plan, workouts, and progress stay in sync automatically.</p>
          </div>
          <div className="lib-sync" data-stagger>
            {SYNC.map(({ icon: Icon, tone, title, desc }) => (
              <div className="rr-card" key={title}>
                <span className={`rr-icon ${tone}`}><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="rr-section">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <span className="rr-eyebrow">Honest pricing</span>
            <h2>Three plans. No surprises.</h2>
            <p>Start free, unlock everything with Pro, or add real coaching with Premium.</p>
          </div>
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
                  className={`rr-btn ${plan.id === 'pro' ? 'rr-btn-primary' : plan.id === 'premium' ? 'rr-btn-dark' : 'rr-btn-outline'}`}
                  to="/?auth=signup"
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="rr-price-note" style={{ marginTop: 20, fontSize: 15 }}>
            <strong style={{ color: 'var(--rr-ink)' }}>Train at a partner gym?</strong> Pro is included with your membership — upgrade to Premium for just {fmtPrice(PREMIUM_UPGRADE)}/month.
          </p>
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <Link className="rr-link-arrow" to="/pricing">Compare plans in detail <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* AUDIENCES */}
      <section className="rr-section rr-section-tint">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <span className="rr-eyebrow">Built for two kinds of people</span>
            <h2>Whether you train or you coach</h2>
            <p>Reprummble is one platform that connects everyday people with the gyms and coaches who can help them.</p>
          </div>
          <div className="rr-audience" data-stagger>
            <div className="rr-aud-card">
              <span className="rr-aud-tag">For individuals & families</span>
              <h3>Get fit without the expensive price tag</h3>
              <ul>
                <li><Check size={18} /> Free plan to get started</li>
                <li><Check size={18} /> Full access with Pro for {fmtPrice(PRICING.proMonthly)}/month</li>
                <li><Check size={18} /> Premium adds 1-on-1 coaching for {fmtPrice(PREMIUM_UPGRADE)} more</li>
                <li><Check size={18} /> Works for complete beginners and experienced lifters</li>
                <li><Check size={18} /> Train at home, outside, or at any gym</li>
              </ul>
              <Link className="rr-btn rr-btn-primary" to="/?auth=signup">Start free <ArrowRight size={16} /></Link>
            </div>
            <div className="rr-aud-card is-dark">
              <span className="rr-aud-tag">For gyms & coaches</span>
              <h3>Reach more members. Earn from every program.</h3>
              <ul>
                <li><Check size={18} /> Free to join — no setup or monthly fees</li>
                <li><Check size={18} /> Your members get Pro included</li>
                <li><Check size={18} /> Sell your training programs through the app</li>
                <li><Check size={18} /> Keep {PRICING.gymPayoutPercent}% of every program sale</li>
                <li><Check size={18} /> Track your members' progress in one dashboard</li>
              </ul>
              <Link className="rr-btn rr-btn-white" to="/for-gyms">Become a partner <ArrowRight size={16} /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS + LIVE STATS */}
      <section className="rr-section">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <span className="rr-eyebrow"><Users size={14} /> Community</span>
            <h2>Real people. Real reviews.</h2>
            <p>Every number and review here comes straight from our platform — nothing made up.</p>
          </div>
          <div style={{ marginBottom: 40 }}><LiveStats /></div>
          <ReviewsSection />
        </div>
      </section>

      {/* FAQ + ASK RUMI */}
      <section className="rr-section rr-section-tint">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <span className="rr-eyebrow"><MessageCircle size={14} /> Questions</span>
            <h2>Good questions, quick answers</h2>
            <p>Can't find what you need? Rumi, our assistant, answers instantly — day or night.</p>
          </div>
          <Faq items={HOME_FAQ} />
          <div className="rr-hero-ctas" style={{ justifyContent: 'center' }}>
            <button type="button" className="rr-btn rr-btn-primary" onClick={() => openChat()}>
              <MessageCircle size={18} /> Ask Rumi a question
            </button>
            <Link className="rr-btn rr-btn-outline" to="/faq">All FAQs</Link>
            <Link className="rr-btn rr-btn-outline" to="/contact">Contact us</Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="rr-section" style={{ paddingTop: 0 }}>
        <div className="rr-container">
          <div className="rr-cta" data-reveal>
            <div>
              <h2>Your stronger self starts today.</h2>
              <p>Join free in two minutes and start training with a plan built around your goals.</p>
              <div style={{ marginTop: 22 }}><StoreButtons variant="light" /></div>
            </div>
            <div className="rr-cta-actions">
              <Link className="rr-btn rr-btn-white rr-btn-lg" to="/?auth=signup">Start free</Link>
              <Link className="rr-btn rr-btn-ghost-light rr-btn-lg" to="/pricing">See pricing</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
