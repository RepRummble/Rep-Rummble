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

const MORE = [
  { icon: Watch, tint: 'sky', title: 'Wearable sync', desc: 'Apple Health, Garmin, Oura, Whoop, Fitbit, and Polar data flow in automatically.' },
  { icon: LineChart, tint: 'peach', title: 'Weekly reports', desc: 'See what drove your progress — and what held it back — every week.' },
  { icon: Trophy, tint: 'lilac', title: 'Challenges & streaks', desc: '30-day challenges and leaderboards to keep momentum going.' },
  { icon: Users, tint: 'mint', title: 'Partner gym programs', desc: 'Follow structured programs designed by coaches at our partner gyms.' },
  { icon: Bell, tint: 'peach', title: 'Smart reminders', desc: 'Gentle nudges to train, eat, and sleep on schedule — never spam.' },
  { icon: Moon, tint: 'lilac', title: 'Sleep insights', desc: 'Understand how your sleep affects your energy, appetite, and training.' },
];

const CHAPTERS = [
  {
    id: 'training', n: '01', tag: 'Training', tint: 'mint', icon: Dumbbell,
    title: 'A plan that fits your life — not the other way around',
    body: 'Tell us how many days you can train, what equipment you have, and what you want to achieve. Reprummble builds the plan and adjusts it every week.',
    points: ['Home, outdoor, and gym workouts', 'Step-by-step guidance for beginners', 'Progressive overload for experienced lifters', 'Sessions adjust to how recovered you are'],
  },
  {
    id: 'nutrition', n: '02', tag: 'Nutrition', tint: 'peach', icon: ScanLine,
    title: 'Log a meal in seconds with a photo',
    body: 'Take a picture of your plate and get calories and macros instantly. No weighing, no searching databases, no homework.',
    points: ['AI photo meal analysis', 'Daily protein, carb, and fat targets', 'Works with home-cooked and restaurant food', 'Smart swaps when you fall short'],
  },
  {
    id: 'recovery', n: '03', tag: 'Recovery', tint: 'lilac', icon: Moon,
    title: 'Know when to push and when to rest',
    body: 'Your sleep, resting heart rate, and HRV combine into a single daily readiness score — so you train hard on good days and avoid burnout on bad ones.',
    points: ['Daily readiness score', 'Sleep and heart-rate trends', 'Automatic plan adjustments'],
  },
] as const;

function ChapterVisual({ id }: { id: (typeof CHAPTERS)[number]['id'] }) {
  const [exercise, setExercise] = useState<ExerciseId>('squat');
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
    description: 'Adaptive training plans, AI meal logging, daily recovery scores, wearable sync, and programs from partner gyms — all in one app.',
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
            <p>Every feature on this page, unlocked — then {fmtPrice(PRICING.proMonthly)}/month. Included free for members of partner gyms.</p>
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
