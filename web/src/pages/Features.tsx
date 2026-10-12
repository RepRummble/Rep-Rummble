import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Check, LineChart, Moon, Trophy, Users, Watch } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { PRICING, fmtPrice } from '../config/pricing';
import { NutritionScreen, PhoneMockup, TodayScreen, WorkoutScreen } from '../components/site/Mockups';

const MORE = [
  { icon: Watch, tone: '', title: 'Wearable sync', desc: 'Apple Health, Garmin, Oura, Whoop, Fitbit, and Polar data flow in automatically.' },
  { icon: LineChart, tone: 'is-orange', title: 'Weekly reports', desc: 'See what drove your progress — and what held it back — every week.' },
  { icon: Trophy, tone: 'is-violet', title: 'Challenges & streaks', desc: '30-day challenges and leaderboards to keep momentum going.' },
  { icon: Users, tone: '', title: 'Partner gym programs', desc: 'Follow structured programs designed by coaches at our partner gyms.' },
  { icon: Bell, tone: 'is-orange', title: 'Smart reminders', desc: 'Gentle nudges to train, eat, and sleep on schedule — never spam.' },
  { icon: Moon, tone: 'is-violet', title: 'Sleep insights', desc: 'Understand how your sleep affects your energy, appetite, and training.' },
];

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
            <Link className="rr-btn rr-btn-primary rr-btn-lg" to="/?auth=signup">Start free <ArrowRight size={18} /></Link>
            <Link className="rr-btn rr-btn-outline rr-btn-lg" to="/pricing">See pricing</Link>
          </div>
        </div>
      </header>

      <section className="rr-section" style={{ paddingTop: 24 }}>
        <div className="rr-container">
          <div className="rr-split" data-reveal>
            <div>
              <span className="rr-eyebrow">Training</span>
              <h2>A plan that fits your life — not the other way around</h2>
              <p>Tell us how many days you can train, what equipment you have, and what you want to achieve. Reprummble builds the plan and adjusts it every week.</p>
              <ul>
                <li><Check size={18} /> Home, outdoor, and gym workouts</li>
                <li><Check size={18} /> Step-by-step guidance for beginners</li>
                <li><Check size={18} /> Progressive overload for experienced lifters</li>
                <li><Check size={18} /> Sessions adjust to how recovered you are</li>
              </ul>
            </div>
            <div className="rr-split-visual"><PhoneMockup><WorkoutScreen /></PhoneMockup></div>
          </div>

          <div className="rr-split is-reversed" data-reveal>
            <div>
              <span className="rr-eyebrow">Nutrition</span>
              <h2>Log a meal in seconds with a photo</h2>
              <p>Take a picture of your plate and get calories and macros instantly. No weighing, no searching databases, no homework.</p>
              <ul>
                <li><Check size={18} /> AI photo meal analysis</li>
                <li><Check size={18} /> Daily protein, carb, and fat targets</li>
                <li><Check size={18} /> Works with home-cooked and restaurant food</li>
                <li><Check size={18} /> Smart swaps when you fall short</li>
              </ul>
            </div>
            <div className="rr-split-visual"><PhoneMockup><NutritionScreen /></PhoneMockup></div>
          </div>

          <div className="rr-split" data-reveal>
            <div>
              <span className="rr-eyebrow">Recovery</span>
              <h2>Know when to push and when to rest</h2>
              <p>Your sleep, resting heart rate, and HRV combine into a single daily readiness score — so you train hard on good days and avoid burnout on bad ones.</p>
              <ul>
                <li><Check size={18} /> Daily readiness score</li>
                <li><Check size={18} /> Sleep and heart-rate trends</li>
                <li><Check size={18} /> Automatic plan adjustments</li>
              </ul>
            </div>
            <div className="rr-split-visual"><PhoneMockup><TodayScreen /></PhoneMockup></div>
          </div>
        </div>
      </section>

      <section className="rr-section rr-section-tint">
        <div className="rr-container">
          <div className="rr-head" data-reveal>
            <span className="rr-eyebrow">And more</span>
            <h2>Small details that keep you consistent</h2>
          </div>
          <div className="rr-grid-3" data-stagger>
            {MORE.map(({ icon: Icon, tone, title, desc }) => (
              <div className="rr-card" key={title}>
                <span className={`rr-icon ${tone}`}><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rr-section">
        <div className="rr-container">
          <div className="rr-cta" data-reveal>
            <div>
              <h2>Try Pro free for {PRICING.trialDays} days.</h2>
              <p>Every feature on this page, unlocked — then {fmtPrice(PRICING.proMonthly)}/month. Included free for members of partner gyms.</p>
            </div>
            <div className="rr-cta-actions">
              <Link className="rr-btn rr-btn-white rr-btn-lg" to="/?auth=signup">Start free</Link>
              <Link className="rr-btn rr-btn-ghost-light rr-btn-lg" to="/pricing">Compare plans</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
