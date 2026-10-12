import { Link } from 'react-router-dom';
import {
  Activity, Apple, ArrowRight, Check, Dumbbell, HeartPulse, LineChart, Moon,
  Trophy, Users, Watch,
} from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { PLANS, PREMIUM_UPGRADE, PRICING, fmtPrice } from '../config/pricing';
import { PhoneMockup } from '../components/site/Mockups';
import { LiveStats, ReviewsSection } from '../components/site/Reviews';
import DeviceMarquee from '../components/site/DeviceMarquee';
import DeviceSync from '../components/site/DeviceSync';



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
      <DeviceMarquee />

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
          <DeviceSync />
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
              <Link className="rr-btn rr-btn-white" to="/collaborate">Collaborate with us <ArrowRight size={16} /></Link>
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
    </div>
  );
}
