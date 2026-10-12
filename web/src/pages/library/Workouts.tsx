import { Link, useSearchParams } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  EQUIPMENT, FOCUS, LEVELS, WORKOUTS, parseFilter, type Equipment, type Focus, type Level,
} from '../../content/library';
import {
  AppCta, EmptyState, FilterGroup, LibraryHeader, Meta, Minutes, Poster,
} from '../../components/library/LibraryUI';

const DURATIONS = { short: 'Under 15 min', medium: '15–30 min', long: '30+ min' } as const;
type Duration = keyof typeof DURATIONS;

const inDuration = (minutes: number, d: Duration) =>
  d === 'short' ? minutes < 15 : d === 'medium' ? minutes >= 15 && minutes <= 30 : minutes > 30;

export default function Workouts() {
  usePageMeta({
    title: 'Workouts',
    description: 'Browse Reprummble workouts by focus, level, equipment, and time — from 10-minute core sessions to full gym strength days.',
    canonical: '/workouts',
  });

  const [params, setParams] = useSearchParams();
  const focus = parseFilter<Focus>(params.get('focus'), FOCUS);
  const level = parseFilter<Level>(params.get('level'), LEVELS);
  const equipment = parseFilter<Equipment>(params.get('equipment'), EQUIPMENT);
  const duration = parseFilter<Duration>(params.get('time'), DURATIONS);
  const q = params.get('q') ?? '';

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const results = WORKOUTS.filter((w) =>
    (focus === 'all' || w.focus === focus)
    && (level === 'all' || w.level === level)
    && (equipment === 'all' || w.equipment === equipment)
    && (duration === 'all' || inDuration(w.minutes, duration))
    && (!q || `${w.name} ${w.summary}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="rr-page">
      <LibraryHeader
        eyebrow="Workout library"
        title="Find a workout for"
        accent="today."
        lead="Every session comes with step-by-step instructions, a guided timer, and form tips in the app. Filter by what you have and how long you've got."
      />

      <section className="rr-section" style={{ paddingTop: 8 }}>
        <div className="rr-container">
          <div className="lib-toolbar">
            <input
              className="lib-search"
              type="search"
              placeholder="Search workouts…"
              value={q}
              onChange={(e) => set('q', e.target.value)}
              aria-label="Search workouts"
            />
            <FilterGroup label="Focus" value={focus} options={FOCUS} onChange={(v) => set('focus', v)} />
            <FilterGroup label="Level" value={level} options={LEVELS} onChange={(v) => set('level', v)} />
            <FilterGroup label="Equipment" value={equipment} options={EQUIPMENT} onChange={(v) => set('equipment', v)} />
            <FilterGroup label="Time" value={duration} options={DURATIONS} onChange={(v) => set('time', v)} />
          </div>

          <p className="lib-count">{results.length} {results.length === 1 ? 'workout' : 'workouts'}</p>
          {results.length === 0 ? (
            <EmptyState onReset={() => setParams({}, { replace: true })} />
          ) : (
            <div className="lib-grid">
              {results.map((w) => (
                <Link className="lib-card" to={`/workouts/${w.slug}`} key={w.slug}>
                  <Poster focus={w.focus} label={FOCUS[w.focus]} title={w.name} pro={w.pro} />
                  <Meta>
                    <Minutes value={w.minutes} />
                    <span>{LEVELS[w.level]}</span>
                    <span><Dumbbell size={14} /> {EQUIPMENT[w.equipment]}</span>
                  </Meta>
                  <p>{w.summary}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <AppCta />
    </div>
  );
}
