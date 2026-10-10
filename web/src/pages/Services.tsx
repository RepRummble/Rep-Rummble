import React from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';
import Breadcrumb from '../components/Breadcrumb';

export default function Services() {
  usePageMeta({
    title: 'Services',
    description: 'Explore Reprummble\'s AI training plans, smart nutrition tracking, recovery scoring, wearable sync, and more.',
    canonical: '/services',
  });
  return (
    <>
      <Breadcrumb items={[{ label: 'Services', to: '/services' }]} />

      {/* ── Hero Statement ── */}
      <section className="sv-hero" data-reveal>
        <span className="sv-label">Our Platform</span>
        <h1 className="sv-title">
          Services built for
          <br />
          <span className="sv-title-accent">real results</span>
        </h1>
        <p className="sv-subtitle">
          Reprummble combines nutrition, training, recovery, and accountability
          into one platform.
        </p>
        <div className="sv-hero-line" aria-hidden="true" />
      </section>

      {/* ── Integrated Coaching Showcase ── */}
      <section className="sv-showcase" data-reveal>
        <div className="sv-showcase-text">
          <span className="pill">Integrated coaching</span>
          <h3>One plan, always in sync.</h3>
          <p>
            Nutrition, training, recovery, and accountability move together so
            you always know your next best step.
          </p>
          <div className="sv-checklist">
            <div className="sv-check-item">
              <span className="sv-check-dot" />
              <span>Daily targets that respond to your week</span>
            </div>
            <div className="sv-check-item">
              <span className="sv-check-dot" />
              <span>Smarter training blocks for strength and endurance</span>
            </div>
            <div className="sv-check-item">
              <span className="sv-check-dot" />
              <span>Recovery signals to prevent burnout</span>
            </div>
            <div className="sv-check-item">
              <span className="sv-check-dot" />
              <span>Accountability that keeps you consistent</span>
            </div>
          </div>
        </div>

        <div className="sv-momentum">
          <div className="sv-momentum-glow" aria-hidden="true" />
          <div className="sv-momentum-header">
            <span className="sv-momentum-title">Weekly momentum</span>
            <span className="sv-momentum-live">Live</span>
          </div>
          <p className="sv-momentum-sub">
            Your dashboard blends meals, workouts, and readiness into one story.
          </p>
          <div className="sv-stats">
            <div className="sv-stat">
              <span className="sv-stat-dot sv-dot-teal" />
              <h4>Meals</h4>
              <p>3 logged · 1,620 kcal</p>
            </div>
            <div className="sv-stat">
              <span className="sv-stat-dot sv-dot-blue" />
              <h4>Training</h4>
              <p>4 sessions · Strength focus</p>
            </div>
            <div className="sv-stat">
              <span className="sv-stat-dot sv-dot-coral" />
              <h4>Recovery</h4>
              <p>7h 28m sleep avg</p>
            </div>
            <div className="sv-stat">
              <span className="sv-stat-dot sv-dot-gold" />
              <h4>Streak</h4>
              <p>12 days · On track</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Service Pillars ── */}
      <section className="section" data-reveal>
        <div className="sv-pillars" data-stagger>
          <article className="sv-pillar sv-pillar-teal">
            <div className="sv-pillar-stripe" aria-hidden="true" />
            <span className="sv-pillar-num">01</span>
            <div className="sv-pillar-badge">Nutrition</div>
            <h3>Nutrition coaching</h3>
            <p>
              Macro and micronutrient tracking, meal suggestions, and smart
              swaps.
            </p>
          </article>
          <article className="sv-pillar sv-pillar-blue">
            <div className="sv-pillar-stripe" aria-hidden="true" />
            <span className="sv-pillar-num">02</span>
            <div className="sv-pillar-badge">Training</div>
            <h3>Workout programming</h3>
            <p>
              Adaptive routines for strength, endurance, and body recomposition.
            </p>
          </article>
          <article className="sv-pillar sv-pillar-coral">
            <div className="sv-pillar-stripe" aria-hidden="true" />
            <span className="sv-pillar-num">03</span>
            <div className="sv-pillar-badge">Recovery</div>
            <h3>Recovery + readiness</h3>
            <p>Sleep, stress, and activity signals to prevent burnout.</p>
          </article>
          <article className="sv-pillar sv-pillar-gold">
            <div className="sv-pillar-stripe" aria-hidden="true" />
            <span className="sv-pillar-num">04</span>
            <div className="sv-pillar-badge">Accountability</div>
            <h3>Community motivation</h3>
            <p>
              Challenges, streaks, and leaderboards to keep you consistent.
            </p>
          </article>
        </div>
      </section>

      {/* ── Extended Features ── */}
      <section className="sv-features" data-stagger>
        <article className="sv-feature-wide">
          <div className="sv-feature-glow" aria-hidden="true" />
          <span className="sv-feature-tag">Clinician-ready</span>
          <h3>Doctor-ready reports</h3>
          <p>
            Export monthly, yearly, and historical reports for professionals.
          </p>
        </article>
        <article className="sv-feature-compact">
          <h3>Personalized goals</h3>
          <p>
            Weight loss, weight gain, maintenance, and athletic targets.
          </p>
          <span className="pill">Goal-driven</span>
        </article>
      </section>

      {/* ── AAA Process ── */}
      <section className="sv-process" data-reveal>
        <div className="section-head">
          <h2>How it works</h2>
        </div>
        <div className="sv-process-track">
          <div className="sv-process-line" aria-hidden="true" />
          <div className="sv-process-steps" data-stagger>
            <div className="sv-step">
              <span className="sv-step-num">1</span>
              <h3>Assess</h3>
              <p>
                Baseline goals, schedule, and preferences guide every
                recommendation.
              </p>
            </div>
            <div className="sv-step">
              <span className="sv-step-num">2</span>
              <h3>Act</h3>
              <p>
                Daily coaching for meals, workouts, and recovery keeps momentum
                high.
              </p>
            </div>
            <div className="sv-step">
              <span className="sv-step-num">3</span>
              <h3>Adapt</h3>
              <p>
                Weekly adjustments respond to progress, readiness, and real
                life.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="page-actions" data-stagger>
        <Link className="solid-btn" to="/plans">
          View Plans
        </Link>
      </div>
    </>
  );
}
