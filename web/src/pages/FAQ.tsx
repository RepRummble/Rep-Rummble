import React from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import Breadcrumb from '../components/Breadcrumb';

export default function FAQ() {
  usePageMeta({
    title: 'FAQ',
    description: 'Answers to common questions about Reprummble — plans, wearable sync, data privacy, cancellation, and more.',
    canonical: '/faq',
  });
  return (
    <>
      <Breadcrumb items={[{ label: 'FAQ', to: '/faq' }]} />

      {/* ── Hero Statement ── */}
      <section className="fq-hero" data-reveal>
        <span className="sv-label">Support</span>
        <h1 className="sv-title">
          Frequently asked
          <br />
          <span className="sv-title-accent">questions</span>
        </h1>
        <p className="sv-subtitle">
          Real problems, real solutions. Here's how Reprummble helps you
          succeed.
        </p>
        <div className="sv-hero-line" aria-hidden="true" />
      </section>

      {/* ── Featured FAQ ── */}
      <section className="fq-featured" data-reveal>
        <div className="fq-featured-glow" aria-hidden="true" />
        <div className="fq-featured-header">
          <span className="fq-tag fq-tag-teal">Nutrition</span>
          <h3>I forget to track my meals. How can I stay consistent?</h3>
        </div>
        <div className="fq-answer-grid">
          <div className="fq-answer-block fq-block-problem">
            <span className="fq-block-label">The Problem</span>
            <p>
              Life gets busy and meal logging feels like a chore.
            </p>
          </div>
          <div className="fq-answer-block fq-block-solution">
            <span className="fq-block-label">Our Solution</span>
            <p>
              Reprummble sends smart reminders based on your eating patterns.
              If you usually eat lunch at 1 PM, you'll get a gentle nudge at
              1:15 PM.
            </p>
          </div>
          <div className="fq-answer-block fq-block-example">
            <span className="fq-block-label">Example</span>
            <p>
              Sarah used to forget 4 out of 7 days. After enabling meal
              reminders, she now logs consistently and lost 8 lbs in her first
              month.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ Accordion ── */}
      <section className="fq-list" data-stagger>
        <details className="fq-item">
          <summary className="fq-summary">
            <span className="fq-tag fq-tag-blue">Progress</span>
            <span className="fq-question">
              I hit a weight loss plateau. What should I do?
            </span>
            <span className="fq-chevron" aria-hidden="true" />
          </summary>
          <div className="fq-body">
            <div className="fq-answer-grid">
              <div className="fq-answer-block fq-block-problem">
                <span className="fq-block-label">The Problem</span>
                <p>
                  You've been doing everything right but the scale won't budge.
                </p>
              </div>
              <div className="fq-answer-block fq-block-solution">
                <span className="fq-block-label">Our Solution</span>
                <p>
                  Our AI analyzes your data and suggests adjustments — maybe you
                  need a refeed day, or your protein intake is too low for muscle
                  retention.
                </p>
              </div>
              <div className="fq-answer-block fq-block-example">
                <span className="fq-block-label">Example</span>
                <p>
                  Mike was stuck at 185 lbs for 3 weeks. Reprummble noticed his
                  calories dropped too low, suggested increasing by 200 kcal,
                  and he broke through within 10 days.
                </p>
              </div>
            </div>
          </div>
        </details>

        <details className="fq-item">
          <summary className="fq-summary">
            <span className="fq-tag fq-tag-coral">Wellness</span>
            <span className="fq-question">
              I stress-eat at night. Can the app help with emotional eating?
            </span>
            <span className="fq-chevron" aria-hidden="true" />
          </summary>
          <div className="fq-body">
            <div className="fq-answer-grid">
              <div className="fq-answer-block fq-block-problem">
                <span className="fq-block-label">The Problem</span>
                <p>
                  Late-night cravings and emotional eating derail your progress.
                </p>
              </div>
              <div className="fq-answer-block fq-block-solution">
                <span className="fq-block-label">Our Solution</span>
                <p>
                  Log your mood alongside meals. Reprummble identifies
                  patterns — like stress on Mondays leading to overeating — and
                  suggests healthier coping strategies.
                </p>
              </div>
              <div className="fq-answer-block fq-block-example">
                <span className="fq-block-label">Example</span>
                <p>
                  Emma discovered she binged every Sunday night due to work
                  anxiety. She now takes a 10-minute walk instead, reducing her
                  weekly calorie surplus by 1,500 kcal.
                </p>
              </div>
            </div>
          </div>
        </details>

        <details className="fq-item">
          <summary className="fq-summary">
            <span className="fq-tag fq-tag-coral">Recovery</span>
            <span className="fq-question">
              My sleep is terrible. Does that affect my fitness goals?
            </span>
            <span className="fq-chevron" aria-hidden="true" />
          </summary>
          <div className="fq-body">
            <div className="fq-answer-grid">
              <div className="fq-answer-block fq-block-problem">
                <span className="fq-block-label">The Problem</span>
                <p>
                  Poor sleep increases hunger hormones and kills workout
                  performance.
                </p>
              </div>
              <div className="fq-answer-block fq-block-solution">
                <span className="fq-block-label">Our Solution</span>
                <p>
                  Sync your wearable to track sleep. Reprummble adjusts your
                  daily targets based on sleep quality — lighter workouts on bad
                  sleep days, higher protein to prevent muscle loss.
                </p>
              </div>
              <div className="fq-answer-block fq-block-example">
                <span className="fq-block-label">Example</span>
                <p>
                  After syncing his Apple Watch, Tom realized his 5-hour sleep
                  nights correlated with 40% more snacking. He now prioritizes
                  7 hours and feels stronger in the gym.
                </p>
              </div>
            </div>
          </div>
        </details>

        <details className="fq-item">
          <summary className="fq-summary">
            <span className="fq-tag fq-tag-teal">Nutrition</span>
            <span className="fq-question">
              I don't know what to eat for my goals. Can I get meal suggestions?
            </span>
            <span className="fq-chevron" aria-hidden="true" />
          </summary>
          <div className="fq-body">
            <div className="fq-answer-grid">
              <div className="fq-answer-block fq-block-problem">
                <span className="fq-block-label">The Problem</span>
                <p>
                  Counting macros is confusing and meal planning takes hours.
                </p>
              </div>
              <div className="fq-answer-block fq-block-solution">
                <span className="fq-block-label">Our Solution</span>
                <p>
                  Tell us your goal (lose fat, build muscle, maintain). Rep
                  Rummble generates personalized meal ideas that fit your macros,
                  preferences, and what's in your fridge.
                </p>
              </div>
              <div className="fq-answer-block fq-block-example">
                <span className="fq-block-label">Example</span>
                <p>
                  Lisa wanted high-protein vegetarian meals. The app suggested a
                  Greek yogurt parfait for breakfast (32g protein) and chickpea
                  curry for dinner — hitting her 120g goal easily.
                </p>
              </div>
            </div>
          </div>
        </details>

        <details className="fq-item">
          <summary className="fq-summary">
            <span className="fq-tag fq-tag-gold">Lifestyle</span>
            <span className="fq-question">
              I travel often for work. How do I stay on track?
            </span>
            <span className="fq-chevron" aria-hidden="true" />
          </summary>
          <div className="fq-body">
            <div className="fq-answer-grid">
              <div className="fq-answer-block fq-block-problem">
                <span className="fq-block-label">The Problem</span>
                <p>
                  Hotel gyms are limited, restaurant menus are unpredictable.
                </p>
              </div>
              <div className="fq-answer-block fq-block-solution">
                <span className="fq-block-label">Our Solution</span>
                <p>
                  Enable "Travel Mode" to get bodyweight workout alternatives
                  and restaurant macro estimates. Scan any menu and get smart
                  ordering suggestions.
                </p>
              </div>
              <div className="fq-answer-block fq-block-example">
                <span className="fq-block-label">Example</span>
                <p>
                  James travels 3 weeks a month. Using Travel Mode, he
                  maintained his physique by doing hotel room HIIT and choosing
                  grilled options at restaurants.
                </p>
              </div>
            </div>
          </div>
        </details>

        <details className="fq-item">
          <summary className="fq-summary">
            <span className="fq-tag fq-tag-blue">Reports</span>
            <span className="fq-question">
              Can my doctor see my health data?
            </span>
            <span className="fq-chevron" aria-hidden="true" />
          </summary>
          <div className="fq-body">
            <div className="fq-answer-grid">
              <div className="fq-answer-block fq-block-problem">
                <span className="fq-block-label">The Problem</span>
                <p>
                  Doctors need accurate data but handwritten food diaries are
                  incomplete.
                </p>
              </div>
              <div className="fq-answer-block fq-block-solution">
                <span className="fq-block-label">Our Solution</span>
                <p>
                  Export detailed PDF reports showing weight trends, nutrition
                  averages, workout frequency, and sleep patterns — everything
                  your healthcare provider needs.
                </p>
              </div>
              <div className="fq-answer-block fq-block-example">
                <span className="fq-block-label">Example</span>
                <p>
                  When David's nutritionist saw his 90-day report, she
                  identified a Vitamin D deficiency pattern and adjusted his
                  supplement stack immediately.
                </p>
              </div>
            </div>
          </div>
        </details>

        <details className="fq-item">
          <summary className="fq-summary">
            <span className="fq-tag fq-tag-blue">Training</span>
            <span className="fq-question">
              I want to build muscle but keep gaining fat. What's wrong?
            </span>
            <span className="fq-chevron" aria-hidden="true" />
          </summary>
          <div className="fq-body">
            <div className="fq-answer-grid">
              <div className="fq-answer-block fq-block-problem">
                <span className="fq-block-label">The Problem</span>
                <p>
                  Bulking often leads to excessive fat gain if not done
                  correctly.
                </p>
              </div>
              <div className="fq-answer-block fq-block-solution">
                <span className="fq-block-label">Our Solution</span>
                <p>
                  Reprummble calculates your lean bulk surplus (usually
                  200-300 kcal above maintenance) and tracks your weight gain
                  rate. If you're gaining too fast, it alerts you to dial back.
                </p>
              </div>
              <div className="fq-answer-block fq-block-example">
                <span className="fq-block-label">Example</span>
                <p>
                  Alex was eating 500 kcal surplus and gaining 2 lbs/week (too
                  fast). The app suggested reducing to 250 kcal surplus — he now
                  gains 0.5 lb/week with minimal fat.
                </p>
              </div>
            </div>
          </div>
        </details>

        <details className="fq-item">
          <summary className="fq-summary">
            <span className="fq-tag fq-tag-gold">Wearables</span>
            <span className="fq-question">
              Does it work with my Apple Watch / Fitbit / Garmin?
            </span>
            <span className="fq-chevron" aria-hidden="true" />
          </summary>
          <div className="fq-body">
            <div className="fq-answer-grid">
              <div className="fq-answer-block fq-block-problem">
                <span className="fq-block-label">The Problem</span>
                <p>
                  You already own a wearable but your data is scattered across
                  apps.
                </p>
              </div>
              <div className="fq-answer-block fq-block-solution">
                <span className="fq-block-label">Our Solution</span>
                <p>
                  Reprummble syncs with Apple Health, Google Fit, Fitbit,
                  Garmin, and WHOOP. All your steps, heart rate, sleep, and
                  workouts flow into one dashboard.
                </p>
              </div>
              <div className="fq-answer-block fq-block-example">
                <span className="fq-block-label">Example</span>
                <p>
                  Maria connected her Garmin and Fitbit scale. Now her morning
                  weight, daily steps, and evening run all appear in one
                  place — no more app switching.
                </p>
              </div>
            </div>
          </div>
        </details>

        <details className="fq-item">
          <summary className="fq-summary">
            <span className="fq-tag fq-tag-teal">Pricing</span>
            <span className="fq-question">
              Is there a free trial? What if it doesn't work for me?
            </span>
            <span className="fq-chevron" aria-hidden="true" />
          </summary>
          <div className="fq-body">
            <div className="fq-answer-grid">
              <div className="fq-answer-block fq-block-problem">
                <span className="fq-block-label">The Problem</span>
                <p>
                  You don't want to pay for something that might not fit your
                  lifestyle.
                </p>
              </div>
              <div className="fq-answer-block fq-block-solution">
                <span className="fq-block-label">Our Solution</span>
                <p>
                  Start with our free tier — unlimited food logging, basic
                  reports, and community access. Upgrade only when you want AI
                  coaching, advanced analytics, or wearable sync.
                </p>
              </div>
              <div className="fq-answer-block fq-block-example">
                <span className="fq-block-label">Example</span>
                <p>
                  Try it for 2 weeks free. If Reprummble isn't right for you,
                  cancel anytime with one click — no questions asked, no hidden
                  fees.
                </p>
              </div>
            </div>
          </div>
        </details>
      </section>
    </>
  );
}
