import { Link } from 'react-router-dom';
import {
  Activity, Apple, ArrowRight, Check, Dumbbell, HeartPulse, LineChart, Moon, Trophy, Users, Watch,
} from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { PLANS, PREMIUM_UPGRADE, PRICING, fmtPrice } from '../config/pricing';
import { PhoneMockup } from '../components/site/Mockups';
import { LiveStats, ReviewsSection } from '../components/site/Reviews';
import StoreButtons from '../components/site/StoreButtons';

const DEVICES = ['Apple Health', 'Garmin', 'Oura', 'Whoop', 'Fitbit', 'Polar'];

const PILLARS = [
  { icon: Dumbbell, tone: '', title: 'Training that adapts', desc: 'A plan built around your schedule, equipment, and level — at home, outdoors, or in the gym.' },
  { icon: Apple, tone: 'is-orange', title: 'Nutrition made simple', desc: 'Snap a photo to log a meal. Hit your protein and calorie targets without counting by hand.' },
  { icon: Moon, tone: 'is-violet', title: 'Recovery you can see', desc: 'Sleep and heart-rate data become one daily readiness score, so you know when to push.' },
  { icon: Watch, tone: '', title: 'Your devices, connected', desc: 'Sync the wearable you already own. No new hardware needed to get started.' },
  { icon: LineChart, tone: 'is-orange', title: 'Progress, explained', desc: 'Weekly insights connect your habits to your results in plain language.' },
  { icon: Trophy, tone: 'is-violet', title: 'Motivation built in', desc: 'Challenges and streaks keep you going on the days motivation runs out.' },
];

const STEPS = [
  { title: 'Create a free account', desc: 'Tell us your goals, schedule, and equipment. Takes about two minutes.' },
  { title: 'Get your plan', desc: 'Receive training and nutrition targets the same day — or join a program from a local partner gym.' },
  { title: 'Train, log, improve', desc: 'Your plan adjusts as you progress. Upgrade only when you want more.' },
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
              <Link className="rr-btn rr-btn-outline rr-btn-lg" to="/for-gyms">
                I own a gym
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

      {/* AUDIENCES */}
      <section className="rr-section">
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

      {/* FEATURES */}
      <section className="rr-section rr-section-tint">
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

      {/* HOW IT WORKS */}
      <section className="rr-section">
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

      {/* PRICING TEASER */}
      <section className="rr-section rr-section-tint">
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
