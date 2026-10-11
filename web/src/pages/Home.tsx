import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';
import { usePublicStats } from '../hooks/usePublicStats';

const API_BASE = import.meta.env.VITE_API_URL || '';

const FEATURES = [
  {
    icon: '🏋️',
    title: 'Personalized Training Plans',
    desc: 'AI-built programs that adapt to your schedule, gear, and goals. Whether you train 3 days or 6 — your plan fits.',
    accent: 'teal',
    wide: true,
    stat: '3× faster progress',
    link: '/services',
  },
  {
    icon: '🥗',
    title: 'Smart Nutrition',
    desc: 'Log meals in seconds, hit macro targets, and get smart swaps when you fall short.',
    accent: 'orange',
    wide: false,
    link: '/analytics',
  },
  {
    icon: '💤',
    title: 'Recovery & Readiness',
    desc: 'Sleep quality, HRV, and resting HR feed into a daily readiness score.',
    accent: 'purple',
    wide: false,
    link: '/analytics',
  },
  {
    icon: '⌚',
    title: 'Wearable Sync',
    desc: 'Apple Watch, Oura, Garmin, Whoop — data flows automatically into your dashboard without manual entry.',
    accent: 'indigo',
    wide: true,
    stat: '6 devices supported',
    link: '/wearables',
  },
  {
    icon: '📊',
    title: 'Actionable Analytics',
    desc: 'Weekly insights connect your habits to results. See exactly what drove progress.',
    accent: 'violet',
    wide: false,
    link: '/analytics',
  },
  {
    icon: '🏆',
    title: 'Challenges',
    desc: '30-day challenges, leaderboards, and coach nudges to keep momentum when motivation fades.',
    accent: 'amber',
    wide: false,
    link: '/services',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Tell us your goals',
    desc: 'Quick onboarding covers your schedule, gear, fitness level, and what you actually want to achieve.',
  },
  {
    num: '02',
    title: 'Get your plan',
    desc: 'Reprummble builds a personalised training + nutrition plan the same day. Connect wearables to enrich your data instantly.',
  },
  {
    num: '03',
    title: 'Track, adapt, progress',
    desc: 'Log workouts, meals, and sleep. Your plan updates as you improve — no restarting from scratch.',
  },
];

const WEARABLES = [
  { name: 'Apple Watch', icon: '⌚' },
  { name: 'Oura Ring', icon: '💍' },
  { name: 'Garmin', icon: '🗺️' },
  { name: 'Whoop', icon: '📟' },
  { name: 'Fitbit', icon: '⌚' },
  { name: 'Polar', icon: '❤️' },
];

function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k+`;
  if (n > 0) return `${n}+`;
  return '0';
}

export default function Home() {
  usePageMeta({
    title: 'Reprummble',
    description: 'Reprummble connects your workouts, nutrition, sleep, and wearables into one adaptive fitness plan. AI-powered training, smart meal logging, and daily recovery scores.',
    canonical: '/',
  });

  const stats = usePublicStats();

  const showWaitlist = stats && stats.waitlistCount > 0;
  const showRating = stats && stats.averageRating !== null && stats.reviewCount > 0;

  return (
    <>
      {/* ── HERO ── */}
      <section className="hero hero-stage" data-reveal>
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span className="pill pill-green">All-in-one fitness platform</span>
          </div>
          <h1>
            Train <span className="gradient-word">smarter.</span>
            <br />
            Recover faster.
            <br />
            Live stronger.
          </h1>
          <p>
            Reprummble connects your workouts, nutrition, sleep, and wearables
            into one adaptive plan that gets better as you do. No guesswork —
            just progress.
          </p>
          <div className="hero-links">
            <Link className="brutalist-btn" to="/?auth=signup">
              Start Free — No Card Needed
            </Link>
            <Link className="ghost-btn" to="/plans">
              See Plans
            </Link>
          </div>
          <div className="hero-trust-row">
            {showWaitlist && (
              <>
                <div className="hero-trust-item">
                  <strong>{fmtCount(stats!.waitlistCount)}</strong>
                  <span>on the waitlist</span>
                </div>
                <div className="hero-trust-divider" />
              </>
            )}
            {showRating && (
              <>
                <div className="hero-trust-item">
                  <strong>{stats!.averageRating}★</strong>
                  <span>member rating</span>
                </div>
                <div className="hero-trust-divider" />
              </>
            )}
            <div className="hero-trust-item">
              <strong>Free trial</strong>
              <span>cancel anytime</span>
            </div>
          </div>
        </div>

        <div className="hero-visual tilt-card">
          <div className="hero-dashboard-card">
            <div className="hdc-header">
              <div>
                <span className="pill pill-green">Today</span>
                <p className="hdc-name">Good morning 👋</p>
              </div>
              <div className="hdc-score">
                <span className="hdc-score-val">92</span>
                <span className="hdc-score-label">Readiness</span>
              </div>
            </div>
            <div className="hdc-metrics">
              <div className="hdc-metric">
                <span className="hdc-metric-icon">💤</span>
                <div>
                  <strong>7h 34m</strong>
                  <small>Sleep</small>
                </div>
              </div>
              <div className="hdc-metric">
                <span className="hdc-metric-icon">❤️</span>
                <div>
                  <strong>54 bpm</strong>
                  <small>Resting HR</small>
                </div>
              </div>
              <div className="hdc-metric">
                <span className="hdc-metric-icon">⚡</span>
                <div>
                  <strong>78 ms</strong>
                  <small>HRV</small>
                </div>
              </div>
            </div>
            <div className="hdc-workout">
              <div className="hdc-workout-info">
                <strong>Today's session</strong>
                <span className="muted">Upper body · 45 min</span>
              </div>
              <span className="solid-chip">Start</span>
            </div>
            <div className="hdc-macro-bar">
              <div className="hdc-macro-label">
                <span>Macros today</span>
                <span className="muted">1,840 / 2,400 kcal</span>
              </div>
              <div className="hdc-bar-track">
                <div className="hdc-bar-fill" style={{ width: "76%" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="hero-wave" />
      </section>

      {/* ── WEARABLES TRUST BAR ── */}
      <section className="section wearable-bar" data-reveal>
        <p className="wearable-bar-label">Works with your devices</p>
        <div className="wearable-list">
          {WEARABLES.map((w) => (
            <div className="wearable-chip" key={w.name}>
              <span>{w.icon}</span>
              <span>{w.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section" data-reveal>
        <div className="section-head">
          <span className="pill">Everything you need</span>
          <h2 className="gradient-heading">
            One app. Every pillar of your health.
          </h2>
          <p>
            Most apps do one thing. Reprummble connects training, nutrition,
            recovery, and analytics so they work together — not in silos.
          </p>
        </div>
        <div className="home-bento-grid" data-stagger>
          {FEATURES.map((f) => (
            <Link
              to={f.link}
              className={`feature-card hb-card${f.wide ? " hb-wide" : ""} hb-${f.accent}`}
              key={f.title}
              style={{ textDecoration: "none" }}
            >
              <div className={`hb-icon-badge hb-badge-${f.accent}`}>
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              {f.stat && <div className="hb-stat-tag">{f.stat}</div>}
              <span className="hb-cta-arrow">→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section how-it-works" data-reveal>
        <div className="section-head section-head-inline">
          <div className="inline-row">
            <span className="pill">Simple by design</span>
            <h2 className="gradient-heading inline-title">Up and running in under 5 minutes</h2>
            <p className="inline-sub">No complicated setup. Tell us your goals, get your plan, and start moving today.</p>
          </div>
        </div>
        <div className="steps-grid" data-stagger>
          {STEPS.map((s) => (
            <div className="step-card" key={s.num}>
              <div className="step-head">
                <div className="step-num-badge">
                  <span className="step-num">{s.num}</span>
                </div>
                <div className="step-head-text">
                  <h3>{s.title}</h3>
                </div>
              </div>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── LIVE STATS ── */}
      {stats && (stats.waitlistCount > 0 || stats.workoutCount > 0 || stats.userCount > 0) && (
        <section className="section" data-reveal>
          <div className="home-stats-band">
            {stats.waitlistCount > 0 && (
              <div className="home-stat-item">
                <span className="home-stat-value">{fmtCount(stats.waitlistCount)}</span>
                <span className="home-stat-label">On the waitlist</span>
              </div>
            )}
            {stats.waitlistCount > 0 && stats.userCount > 0 && <div className="home-stats-divider" />}
            {stats.userCount > 0 && (
              <div className="home-stat-item">
                <span className="home-stat-value">{fmtCount(stats.userCount)}</span>
                <span className="home-stat-label">Members</span>
              </div>
            )}
            {stats.workoutCount > 0 && <div className="home-stats-divider" />}
            {stats.workoutCount > 0 && (
              <div className="home-stat-item">
                <span className="home-stat-value">{fmtCount(stats.workoutCount)}</span>
                <span className="home-stat-label">Workouts logged</span>
              </div>
            )}
            {stats.reviewCount > 0 && <div className="home-stats-divider" />}
            {stats.reviewCount > 0 && stats.averageRating && (
              <div className="home-stat-item">
                <span className="home-stat-value">{stats.averageRating}★</span>
                <span className="home-stat-label">Average rating</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── REVIEWS ── */}
      <ReviewsSection />

      {/* ── PLANS PREVIEW ── */}
      <section className="section plans-preview" data-reveal>
        <div className="plans-preview-inner">
          <div className="plans-preview-copy">
            <span className="pill">Pricing</span>
            <h2>Start free. Upgrade when you're ready.</h2>
            <p>
              Every plan includes a free trial. No credit card required to
              start. Cancel or change anytime.
            </p>
            <div className="plans-bullets">
              <div className="plans-bullet">✓ Full training plan access</div>
              <div className="plans-bullet">✓ Nutrition tracking + smart swaps</div>
              <div className="plans-bullet">✓ Recovery readiness score daily</div>
              <div className="plans-bullet">✓ Wearable sync (all devices)</div>
              <div className="plans-bullet">✓ 30-day challenges + community</div>
            </div>
            <div className="plans-preview-actions">
              <Link className="solid-btn" to="/?auth=signup">
                Start Free Trial
              </Link>
              <Link className="ghost-btn" to="/plans">
                Compare Plans
              </Link>
            </div>
          </div>
          <div className="plans-preview-card">
            <div className="ppc-row">
              <div className="ppc-plan">
                <span className="ppc-name">Starter</span>
                <span className="ppc-price">Free</span>
                <span className="muted">Forever free</span>
              </div>
              <div className="ppc-plan featured">
                <span className="pill pill-green">Most popular</span>
                <span className="ppc-name">Pro</span>
                <span className="ppc-price">$9<small>/mo</small></span>
                <span className="muted">Billed monthly</span>
              </div>
              <div className="ppc-plan">
                <span className="ppc-name">Elite</span>
                <span className="ppc-price">$19<small>/mo</small></span>
                <span className="muted">+ Coach access</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── APP DOWNLOAD ── */}
      <section className="section app-download">
        <div className="app-launch-band">
          <div className="app-launch-badge">iOS & Android — Coming Soon</div>
          <h2 className="app-launch-heading">
            Your fitness,
            <br />
            in your pocket.
          </h2>
          <p className="app-launch-sub">
            Log meals on the go. Check your recovery score before training.
            <br />
            Get challenge alerts the moment they drop. All from your pocket.
          </p>
          <div className="app-launch-features">
            <div className="alf-item">
              <span className="alf-icon">🍽️</span>
              <span className="alf-label">Meal logging</span>
            </div>
            <div className="alf-divider" />
            <div className="alf-item">
              <span className="alf-icon">💚</span>
              <span className="alf-label">Readiness score</span>
            </div>
            <div className="alf-divider" />
            <div className="alf-item">
              <span className="alf-icon">🏆</span>
              <span className="alf-label">Challenge alerts</span>
            </div>
            <div className="alf-divider" />
            <div className="alf-item">
              <span className="alf-icon">⌚</span>
              <span className="alf-label">Wearable sync</span>
            </div>
          </div>
          <AppLaunchForm />
        </div>
      </section>
    </>
  );
}

// ── Real Reviews Section ────────────────────────────────────────────────────

interface Review {
  _id: string;
  name: string;
  rating: number;
  text: string;
  createdAt: string;
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4, cursor: 'pointer', fontSize: '1.5rem' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          style={{ color: n <= (hovered || value) ? '#f59e0b' : '#d1d5db' }}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          role="button"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  useEffect(() => {
    fetch(`${API_BASE}/api/reviews`)
      .then(r => r.json())
      .then(d => setReviews(d.reviews || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || rating === 0 || text.trim().length < 10) return;
    setSubmitStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), rating, text: text.trim() }),
      });
      if (res.ok) {
        setSubmitStatus('done');
        setName(''); setRating(0); setText(''); setShowForm(false);
      } else {
        setSubmitStatus('error');
      }
    } catch {
      setSubmitStatus('error');
    }
  };

  return (
    <section className="section" data-reveal>
      <div className="section-head">
        <span className="pill">Reviews</span>
        <h2 className="gradient-heading">What members say</h2>
        <p>Real experiences from real people.</p>
      </div>

      {reviews.length > 0 ? (
        <div className="testimonial-grid" data-stagger>
          {reviews.map(r => (
            <div className="testimonial-card" key={r._id}>
              <div className="testi-quote-mark">"</div>
              <div className="testimonial-stars">
                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
              </div>
              <p className="testimonial-quote">{r.text}</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">
                  {r.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="testimonial-name">{r.name}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No reviews yet — be the first.</p>
          <p style={{ fontSize: '0.9rem' }}>Your honest experience helps others find us.</p>
        </div>
      )}

      {submitStatus === 'done' ? (
        <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--green)' }}>
          Thank you! Your review is pending approval and will appear here soon.
        </p>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          {!showForm ? (
            <button
              className="ghost-btn"
              onClick={() => setShowForm(true)}
              style={{ margin: '0 auto' }}
            >
              Leave a review
            </button>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{ maxWidth: 480, margin: '0 auto', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <input
                className="app-launch-input"
                style={{ width: '100%' }}
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
              <StarPicker value={rating} onChange={setRating} />
              <textarea
                className="app-launch-input"
                style={{ width: '100%', minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Share your experience (min. 10 characters)"
                value={text}
                onChange={e => setText(e.target.value)}
                required
              />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="solid-btn"
                  type="submit"
                  disabled={submitStatus === 'loading' || rating === 0}
                >
                  {submitStatus === 'loading' ? 'Submitting…' : 'Submit review'}
                </button>
                <button
                  className="ghost-btn"
                  type="button"
                  onClick={() => { setShowForm(false); setSubmitStatus('idle'); }}
                >
                  Cancel
                </button>
              </div>
              {submitStatus === 'error' && (
                <p style={{ color: 'var(--red, #ef4444)', fontSize: '0.875rem' }}>
                  Something went wrong. Please try again.
                </p>
              )}
            </form>
          )}
        </div>
      )}
    </section>
  );
}

// ── Waitlist Form ────────────────────────────────────────────────────────────

function AppLaunchForm() {
  const stats = usePublicStats();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'waitlist' }),
      });
      if (res.ok) { setStatus('done'); setEmail(''); }
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  const waitlistLabel = stats && stats.waitlistCount > 0
    ? `Join ${fmtCount(stats.waitlistCount)} on the waitlist`
    : 'Join the waitlist';

  return (
    <form className="app-launch-form" onSubmit={handleSubmit} noValidate>
      {status === 'done' ? (
        <p className="app-launch-success">You're on the list. We'll notify you at launch.</p>
      ) : (
        <div style={{ display: 'flex', width: '100%' }}>
          <input
            className="app-launch-input"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={status === 'loading'}
          />
          <button className="app-launch-btn" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Saving…' : 'Notify me at launch'}
          </button>
        </div>
      )}
      {status === 'error' && <p className="app-launch-error">Something went wrong. Try again.</p>}
      <span className="app-launch-count">{waitlistLabel}</span>
    </form>
  );
}
