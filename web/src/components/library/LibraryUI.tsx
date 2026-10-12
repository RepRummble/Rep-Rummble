import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  ArrowRight, Clock, Dumbbell, Flame, Footprints, Lock, PersonStanding, PlayCircle, Target, Wind,
} from 'lucide-react';
import { focusForMuscle, type Exercise, type Focus } from '../../content/library';
import StoreButtons from '../site/StoreButtons';
import '../../styles/library.css';

const FOCUS_ICON: Record<Focus, typeof Dumbbell> = {
  'full-body': PersonStanding,
  upper: Dumbbell,
  lower: Footprints,
  core: Target,
  cardio: Flame,
  mobility: Wind,
};

/** Branded cover art for content that has no photo or video yet. */
export function Poster({ focus, title, label, size = 'card', pro, children }: {
  focus: Focus; title?: string; label?: string; size?: 'card' | 'hero'; pro?: boolean; children?: ReactNode;
}) {
  const Icon = FOCUS_ICON[focus];
  return (
    <div className={`lib-poster lib-tone-${focus} is-${size}`}>
      <Icon className="lib-poster-icon" aria-hidden="true" strokeWidth={1.4} />
      {label && <span className="lib-poster-label">{label}</span>}
      {pro && <span className="lib-pro"><Lock size={11} /> Pro</span>}
      {title && <span className="lib-poster-title">{title}</span>}
      {children}
    </div>
  );
}

/** Exercise demo: plays the video when one exists, otherwise shows the cover. */
export function ExerciseMedia({ exercise }: { exercise: Exercise }) {
  if (exercise.videoUrl) {
    return (
      <video
        className="lib-video"
        src={exercise.videoUrl}
        poster={exercise.posterUrl}
        autoPlay
        muted
        loop
        playsInline
        controls
        aria-label={`${exercise.name} demonstration`}
      />
    );
  }
  return (
    <Poster focus={focusForMuscle(exercise.primary)} size="hero" title={exercise.name}>
      <span className="lib-poster-soon"><PlayCircle size={16} /> Demo video coming soon</span>
    </Poster>
  );
}

const TABS = [
  { to: '/workouts', label: 'Workouts' },
  { to: '/programs', label: 'Programs' },
  { to: '/challenges', label: 'Challenges' },
  { to: '/exercises', label: 'Exercises' },
];

export function LibraryHeader({ eyebrow, title, accent, lead }: {
  eyebrow: string; title: string; accent: string; lead: string;
}) {
  return (
    <header className="rr-pagehead lib-head">
      <div className="rr-container">
        <span className="rr-eyebrow">{eyebrow}</span>
        <h1>{title} <span className="rr-gradient-text">{accent}</span></h1>
        <p>{lead}</p>
        <nav className="lib-tabs" aria-label="Library sections">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => `lib-tab${isActive ? ' active' : ''}`}>{t.label}</NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function FilterGroup<T extends string>({ label, value, options, onChange }: {
  label: string; value: T | 'all'; options: Record<T, string>; onChange: (v: T | 'all') => void;
}) {
  return (
    <div className="lib-filter" role="group" aria-label={label}>
      <span className="lib-filter-label">{label}</span>
      <div className="lib-chips">
        <button type="button" className={`lib-chip${value === 'all' ? ' active' : ''}`} onClick={() => onChange('all')}>All</button>
        {(Object.keys(options) as T[]).map((k) => (
          <button type="button" key={k} className={`lib-chip${value === k ? ' active' : ''}`} onClick={() => onChange(k)}>
            {options[k]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Meta({ children }: { children: ReactNode }) {
  return <div className="lib-meta">{children}</div>;
}

export function Minutes({ value }: { value: number }) {
  return <span><Clock size={14} /> {value} min</span>;
}

export function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="lib-empty">
      <p>Nothing matches those filters yet.</p>
      <button type="button" className="rr-btn rr-btn-outline" onClick={onReset}>Clear filters</button>
    </div>
  );
}

/** Closing band shown on every library page: start in the app, same account everywhere. */
export function AppCta({ title = 'Train with this in the app', text }: { title?: string; text?: string }) {
  return (
    <section className="rr-section" style={{ paddingTop: 0 }}>
      <div className="rr-container">
        <div className="rr-cta" data-reveal>
          <div>
            <h2>{title}</h2>
            <p>{text ?? 'Guided timers and progress tracking, with one account synced across web, iPhone, and Android.'}</p>
            <div style={{ marginTop: 22 }}><StoreButtons variant="light" /></div>
          </div>
          <div className="rr-cta-actions">
            <Link className="rr-btn rr-btn-white rr-btn-lg" to="/?auth=signup">Start free <ArrowRight size={18} /></Link>
            <Link className="rr-btn rr-btn-ghost-light rr-btn-lg" to="/pricing">See plans</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
