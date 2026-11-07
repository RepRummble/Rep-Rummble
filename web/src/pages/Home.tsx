import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, Check, Dumbbell, Flame, HeartPulse, Moon,
  ScanLine, Sparkles, Trophy, Users, Watch,
} from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { PLANS, PREMIUM_UPGRADE, PRICING, fmtPrice } from '../config/pricing';
import { PhoneMockup } from '../components/site/Mockups';
import { LiveStats, ReviewsSection } from '../components/site/Reviews';
import DeviceMarquee from '../components/site/DeviceMarquee';
import DeviceSync from '../components/site/DeviceSync';
import { Aurora, CountUp, FlipWords, Magnetic, MovingBorder, SpotlightCard, TiltCard } from '../components/fx/Effects';
import RepFigure, { EXERCISES, type ExerciseId } from '../components/fx/RepFigure';
import { DeviceOrbit, Leaderboard, MealScan, PulseLine, ReadinessRing, SleepStages, StreakGrid } from '../components/fx/Visuals';



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
  const [exercise, setExercise] = useState<ExerciseId>('squat');
  const engine = EXERCISES[exercise];

  return (
    <div className="rr-page">
      {/* HERO */}
      <section
        className="fx-hero h19"
        onPointerMove={(e) => {
          // The red spotlight follows the pointer; the numbers are read by the CSS.
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
          e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
        }}
      >
        <Aurora />
        <span className="h19-glow" aria-hidden="true" />
        <i className="h19-blob b1" aria-hidden="true" /><i className="h19-blob b2" aria-hidden="true" /><i className="h19-blob b3" aria-hidden="true" />
        <span className="h19-beam" aria-hidden="true" />
        <span className="h19-spot" aria-hidden="true" />
        <div className="rr-container fx-hero-grid">
          <div>
            <span className="fx-eyebrow h19-tag"><span className="fx-dot" /> Now on web, iOS &amp; Android</span>
            <h1>
              Fitness that fits <br />
              <FlipWords words={['every budget.', 'every body.', 'every goal.', 'every day.']} />
            </h1>
            <p className="fx-hero-lead">
              Training, nutrition, and recovery in one calm, clever app. Start free, upgrade for less
              than the cost of a single gym class, and follow programs from coaches at our partner gyms.
            </p>
            <div className="fx-ctas">
              <Magnetic>
                <Link className="rr-btn rr-btn-primary rr-btn-lg fx-btn-glow" to="/?auth=signup">
                  Start free <ArrowRight size={18} />
                </Link>
              </Magnetic>
              <Link className="rr-btn rr-btn-outline rr-btn-lg" to="/features">See how it works</Link>
            </div>
            <ul className="fx-trust">
              <li><Check size={16} /> Free plan, no card needed</li>
              <li><Check size={16} /> Pro from {fmtPrice(PRICING.proMonthly)}/mo</li>
              <li><Check size={16} /> Cancel anytime</li>
            </ul>
          </div>
          <div className="fx-stage">
            <TiltCard><PhoneMockup /></TiltCard>
            <div className="fx-float fx-glass f1" aria-hidden="true">
              <span className="ic" style={{ background: 'var(--rr-brand-soft)', color: 'var(--rr-brand)' }}><HeartPulse size={18} /></span>
              <div><strong>Recovery tracked</strong><span className="sub">from your wearable</span></div>
            </div>
            <div className="fx-float fx-glass f2" aria-hidden="true">
              <span className="ic" style={{ background: 'var(--rr-accent-soft)', color: 'var(--rr-accent)' }}><Flame size={18} /></span>
              <div><strong>21-day streak</strong><span className="sub">keep it going</span></div>
            </div>
            <div className="fx-float fx-glass f3" aria-hidden="true">
              <span className="ic" style={{ background: 'var(--rr-violet-soft)', color: 'var(--rr-violet)' }}><Activity size={18} /></span>
              <div><strong>Plan adjusted</strong><span className="sub">based on today</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* DEVICES */}
      <DeviceMarquee />

      {/* REP ENGINE */}
      <section className="fx-section is-dark">
        <Aurora tone="dark" />
        <div className="rr-container">
          <div className="fx-head" data-reveal>
            <span className="fx-eyebrow"><Sparkles size={14} /> Form you can see</span>
            <h2>Every rep, coached.</h2>
            <p>Each exercise comes with a clear demonstration and a few cues that matter. Pick a lift and watch the movement.</p>
          </div>
          <div className="fx-engine" data-reveal>
            <div className="fx-engine-stage">
              <RepFigure exercise={exercise} />
            </div>
            <div className="fx-engine-side">
              <div className="fx-tabs" role="tablist" aria-label="Exercise">
                {(Object.keys(EXERCISES) as ExerciseId[]).map((id) => (
                  <button key={id} role="tab" aria-selected={exercise === id} onClick={() => setExercise(id)}>{EXERCISES[id].label}</button>
                ))}
              </div>
              <h3>{engine.label}</h3>
              <ul className="fx-cues">
                {engine.cues.map((cue, i) => <li key={cue}><i>{i + 1}</i>{cue}</li>)}
              </ul>
              <p className="fx-note">Illustration of the movement. Your plan picks the right weight and reps for you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BENTO FEATURES */}
      <section className="fx-section is-soft">
        <Aurora />
        <div className="rr-container">
          <div className="fx-head" data-reveal>
            <span className="fx-eyebrow">Everything in one place</span>
            <h2>Stop juggling five different apps</h2>
            <p>Your workouts, meals, sleep, and wearable data finally work together.</p>
          </div>
          <div className="fx-bento" data-stagger>
            <SpotlightCard className="fx-tile fx-glass span-3 is-tint-mint">
              <span className="tag"><Dumbbell size={15} /> Training that adapts</span>
              <h3>A plan built around your week</h3>
              <p>Tell us your schedule, equipment, and level. The plan adjusts as you get fitter, at home, outdoors, or in the gym.</p>
              <div className="viz"><StreakGrid /></div>
            </SpotlightCard>
            <SpotlightCard className="fx-tile fx-glass span-3 is-tint-lilac">
              <span className="tag" style={{ color: 'var(--rr-violet)' }}><Moon size={15} /> Recovery you can see</span>
              <h3>One readiness score, every morning</h3>
              <p>Sleep and heart-rate data become a single number that tells you when to push and when to rest.</p>
              <div className="viz" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 18, alignItems: 'center' }}>
                <ReadinessRing />
                <div style={{ display: 'grid', gap: 18 }}><PulseLine /><SleepStages /></div>
              </div>
            </SpotlightCard>
            <SpotlightCard className="fx-tile fx-glass span-2 is-tint-peach">
              <span className="tag" style={{ color: 'var(--rr-accent)' }}><ScanLine size={15} /> Nutrition made simple</span>
              <h3>Snap a photo, log the meal</h3>
              <p>Hit your protein and calorie targets without counting by hand.</p>
              <div className="viz"><MealScan /></div>
            </SpotlightCard>
            <SpotlightCard className="fx-tile fx-glass span-2 is-tint-sky">
              <span className="tag" style={{ color: '#2e7fd1' }}><Watch size={15} /> Your devices, connected</span>
              <h3>Sync the wearable you own</h3>
              <p>No new hardware needed to get started.</p>
              <div className="viz"><DeviceOrbit /></div>
            </SpotlightCard>
            <SpotlightCard className="fx-tile fx-glass span-2">
              <span className="tag"><Trophy size={15} /> Motivation built in</span>
              <h3>Challenges that keep you going</h3>
              <p>Streaks and friendly rivalries on the days motivation runs out.</p>
              <div className="viz"><Leaderboard /></div>
            </SpotlightCard>
          </div>
          <p className="fx-note" style={{ textAlign: 'center', marginTop: 18, color: 'var(--rr-muted)' }}>Sample visuals for illustration.</p>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Link className="rr-link-arrow" to="/features">Explore all features <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="fx-section">
        <div className="rr-container">
          <div className="fx-head" data-reveal>
            <span className="fx-eyebrow">Simple to start</span>
            <h2>Up and running in minutes</h2>
          </div>
          <div className="fx-steps" data-stagger>
            {STEPS.map((s, i) => (
              <SpotlightCard className="fx-step fx-glass" key={s.title}>
                <div className="n">{i + 1}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* SYNC */}
      <section className="fx-section is-soft">
        <Aurora />
        <div className="rr-container">
          <div className="fx-head" data-reveal>
            <span className="fx-eyebrow">One account, every device</span>
            <h2>Start on your phone. Pick up on the web.</h2>
            <p>Sign in with the same account everywhere. Your plan, workouts, and progress stay in sync automatically.</p>
          </div>
          <DeviceSync />
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="fx-section">
        <div className="rr-container">
          <div className="fx-head" data-reveal>
            <span className="fx-eyebrow">Honest pricing</span>
            <h2>Three plans. No surprises.</h2>
            <p>Start free, unlock everything with Pro, or add real coaching with Premium.</p>
          </div>
          <div className="rr-price-grid" data-stagger>
            {PLANS.map((plan) => {
              const card = (
                <div className={`rr-price${plan.id === 'pro' ? ' is-featured' : ''}`}>
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
              );
              return plan.id === 'pro' ? <MovingBorder key={plan.id}>{card}</MovingBorder> : <div key={plan.id}>{card}</div>;
            })}
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
      <section className="fx-section is-soft">
        <Aurora />
        <div className="rr-container">
          <div className="fx-head" data-reveal>
            <span className="fx-eyebrow">Built for two kinds of people</span>
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
      <section className="fx-section">
        <div className="rr-container">
          <div className="fx-head" data-reveal>
            <span className="fx-eyebrow"><Users size={14} /> Community</span>
            <h2>Real people. Real reviews.</h2>
            <p>Every number and review here comes straight from our platform — nothing made up.</p>
          </div>
          <div style={{ marginBottom: 40 }}><LiveStats /></div>
          <ReviewsSection />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="fx-section" style={{ paddingTop: 0 }}>
        <div className="rr-container">
          <div className="fx-cta" data-reveal>
            <Aurora tone="dark" />
            <h2>Your best shape starts <CountUp to={14} suffix=" days" prefix="with " /> free.</h2>
            <p>Try Pro free for {PRICING.trialDays} days. No card needed. Cancel anytime.</p>
            <Magnetic>
              <Link className="rr-btn rr-btn-white rr-btn-lg" to="/?auth=signup">Start free <ArrowRight size={18} /></Link>
            </Magnetic>
          </div>
        </div>
      </section>
    </div>
  );
}
