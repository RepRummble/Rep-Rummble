import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Check, Dumbbell, LineChart, Moon, ScanLine, Trophy, Users, Watch } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { PRICING, fmtPrice } from '../config/pricing';
import { NutritionScreen, PhoneMockup, TodayScreen, WorkoutScreen } from '../components/site/Mockups';
import DeviceMarquee from '../components/site/DeviceMarquee';
import { Aurora, Magnetic, SpotlightCard, TiltCard } from '../components/fx/Effects';
import RepFigure, { EXERCISES, type ExerciseId } from '../components/fx/RepFigure';
import { MealScan, PulseLine, ReadinessRing, SleepStages } from '../components/fx/Visuals';
import ScreenGallery from '../components/site/ScreenGallery';
import { findScreen } from '../lib/screens';

const MORE = [
  { icon: Watch, tint: 'sky', title: 'Wearables, connected for real', desc: 'Apple Watch, Galaxy Watch, Fitbit, WHOOP and Oura connect directly. Disconnect any time and what it gave us is deleted.' },
  { icon: Dumbbell, tint: 'mint', title: 'AI coach and offline coach', desc: 'Pick your goal and the body you want. Get a plan from the AI, or an instant one that works with no internet, then change anything.' },
  { icon: Trophy, tint: 'lilac', title: 'Challenges with friends', desc: 'Take on 30, 60 or 90 days together. Everyone sees each other’s progress bar, and your days fill in when you log a workout.' },
  { icon: Users, tint: 'peach', title: 'Friends, statuses and messages', desc: 'Share a workout or a meal, post a 24-hour status, message your friends. Report and block tools are built in.' },
  { icon: LineChart, tint: 'peach', title: 'Weekly reports', desc: 'See what drove your progress — and what held it back — every week.' },
  { icon: Users, tint: 'mint', title: 'Partner gym programs', desc: 'Follow structured programs designed by coaches at our partner gyms.' },
  { icon: Bell, tint: 'peach', title: 'Reminders on your phone', desc: 'Workout reminders, a morning check-in and a streak nudge. They are set on your phone, so they work offline, and you choose which ones.' },
  { icon: Moon, tint: 'lilac', title: 'A sleep score you can read', desc: 'Duration, deep and REM sleep, and how unbroken your night was, each shown in plain numbers.' },
];

const CHAPTERS = [
  {
    id: 'training', n: '01', tag: 'Training', tint: 'mint', icon: Dumbbell,
    title: 'A plan that fits your life — not the other way around',
    body: 'Tell us how many days you can train, what equipment you have, and what you want to achieve. Reprummble builds a week of workouts. Edit anything, and ask for a lighter version when you are run down.',
    points: ['Home, outdoor, and gym workouts, from about 1,000 exercises', 'An AI coach, and an offline coach that works with no internet', 'Swap, add, reorder or change any exercise', 'A lighter version suggested on low-recovery days'],
  },
  {
    id: 'nutrition', n: '02', tag: 'Nutrition', tint: 'peach', icon: ScanLine,
    title: 'Log a meal in seconds with a photo',
    body: 'Take a picture of your plate and get calories and macros instantly. No weighing, no searching databases, no homework.',
    points: ['AI photo meal analysis, food by food', 'Daily protein, carb, and fat targets', 'Works with home-cooked and restaurant food', 'Lighter swaps suggested for every meal'],
  },
  {
    id: 'recovery', n: '03', tag: 'Recovery', tint: 'lilac', icon: Moon,
    title: 'Know when to push and when to rest',
    body: 'Your sleep, resting heart rate, and HRV become a daily Recovery score, measured against your own normal, so you train hard on good days and ease off on bad ones.',
    points: ['Recovery, sleep and strain scores', 'See exactly which readings moved each score', 'Advice for today’s workout from your recovery'],
  },
] as const;

function ChapterVisual({ id }: { id: (typeof CHAPTERS)[number]['id'] }) {
  const [exercise, setExercise] = useState<ExerciseId>('squat');
  // A real screenshot (web/src/assets/screens/feature-<id>.png) replaces the drawn phone and its sample numbers.
  const real = findScreen(`feature-${id}`);
  if (real) return <div className="fx-chapter-visual"><TiltCard><div className="rr-realphone"><img src={real} alt={`The ${id} screen of the Reprummble app`} loading="lazy" /></div></TiltCard></div>;
  if (id === 'training') {
    return (
      <div className="fx-chapter-visual">
        <TiltCard><PhoneMockup><WorkoutScreen /></PhoneMockup></TiltCard>
        <div className="fx-mini-stage fx-glass">
          <RepFigure exercise={exercise} />
          <div className="fx-tabs is-light" role="tablist" aria-label="Exercise">
            {(Object.keys(EXERCISES) as ExerciseId[]).map((e) => (
              <button key={e} role="tab" aria-selected={exercise === e} onClick={() => setExercise(e)}>{EXERCISES[e].label}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (id === 'nutrition') {
    return (
      <div className="fx-chapter-visual">
        <TiltCard><PhoneMockup><NutritionScreen /></PhoneMockup></TiltCard>
        <div className="fx-mini-stage fx-glass" style={{ padding: 22 }}><MealScan /></div>
      </div>
    );
  }
  return (
    <div className="fx-chapter-visual">
      <TiltCard><PhoneMockup><TodayScreen /></PhoneMockup></TiltCard>
      <div className="fx-mini-stage fx-glass" style={{ padding: 22, display: 'grid', gap: 18 }}>
        <ReadinessRing />
        <PulseLine />
        <SleepStages />
      </div>
    </div>
  );
}

export default function Features() {
  usePageMeta({
    title: 'Features',
    description: 'AI and offline workout coach, AI meal logging, recovery, sleep and strain scores, five wearables, and challenges with friends — all in one app.',
    canonical: '/features',
  });

  return (
    <div className="rr-page">
      <header className="rr-pagehead">
        <div className="rr-container">
          <span className="rr-eyebrow">Features</span>
          <h1>Everything your fitness needs, <span className="rr-gradient-text">in one app.</span></h1>
          <p>Built for beginners, busy parents, and serious athletes alike. Simple on day one, powerful when you're ready.</p>
          <div className="rr-hero-ctas">
            <Magnetic><Link className="rr-btn rr-btn-primary rr-btn-lg fx-btn-glow" to="/?auth=signup">Start free <ArrowRight size={18} /></Link></Magnetic>
            <Link className="rr-btn rr-btn-outline rr-btn-lg" to="/pricing">See pricing</Link>
          </div>
          <nav className="fx-jump" aria-label="Jump to a feature">
            {CHAPTERS.map((c) => <a key={c.id} href={`#${c.id}`}><span>{c.n}</span>{c.tag}</a>)}
            <a href="#more"><span>04</span>And more</a>
          </nav>
        </div>
      </header>

      <section className="fx-section" style={{ paddingTop: 24 }}>
        <div className="rr-container fx-chapters">
          {CHAPTERS.map((c, i) => (
            <article key={c.id} id={c.id} className={`fx-chapter fx-glass is-tint-${c.tint}${i % 2 ? ' is-reversed' : ''}`} data-reveal>
              <div className="fx-chapter-copy">
                <span className="fx-chapter-num" aria-hidden="true">{c.n}</span>
                <span className="fx-eyebrow"><c.icon size={14} /> {c.tag}</span>
                <h2>{c.title}</h2>
                <p>{c.body}</p>
                <ul className="fx-checks">
                  {c.points.map((p) => <li key={p}><Check size={16} /> {p}</li>)}
                </ul>
              </div>
              <ChapterVisual id={c.id} />
            </article>
          ))}
        </div>
      </section>

      <DeviceMarquee />

      <ScreenGallery />

      <section className="fx-section is-soft" id="more">
        <Aurora />
        <div className="rr-container">
          <div className="fx-head" data-reveal>
            <span className="fx-eyebrow">And more</span>
            <h2>Small details that keep you consistent</h2>
          </div>
          <div className="fx-more" data-stagger>
            {MORE.map(({ icon: Icon, tint, title, desc }) => (
              <SpotlightCard className={`fx-tile fx-glass is-tint-${tint}`} key={title}>
                <span className="fx-tile-icon"><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      <section className="fx-section" style={{ paddingTop: 0 }}>
        <div className="rr-container">
          <div className="fx-cta" data-reveal>
            <Aurora tone="dark" />
            <h2>Try Pro free for {PRICING.trialDays} days.</h2>
            <p>Higher daily AI limits, reports and CSV export — then {fmtPrice(PRICING.proMonthly)}/month. Included free for members of partner gyms.</p>
            <div className="fx-ctas" style={{ justifyContent: 'center' }}>
              <Magnetic><Link className="rr-btn rr-btn-white rr-btn-lg" to="/?auth=signup">Start free</Link></Magnetic>
              <Link className="rr-btn rr-btn-ghost-light rr-btn-lg" to="/pricing">Compare plans</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
