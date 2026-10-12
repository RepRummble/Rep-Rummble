import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Dumbbell } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  EQUIPMENT, LEVELS, PROGRAMS, getWorkout, parseFilter, sessionsPerWeek, type Level,
} from '../../content/library';
import {
  AppCta, EmptyState, FilterGroup, LibraryHeader, Meta, Poster,
} from '../../components/library/LibraryUI';

export default function Programs() {
  usePageMeta({
    title: 'Programs',
    description: 'Multi-week Reprummble training programs for fat loss, muscle, strength, posture, and conditioning — at home or in the gym.',
    canonical: '/programs',
  });

  const [params, setParams] = useSearchParams();
  const level = parseFilter<Level>(params.get('level'), LEVELS);
  const results = PROGRAMS.filter((p) => level === 'all' || p.level === level);

  return (
    <div className="rr-page">
      <LibraryHeader
        eyebrow="Training programs"
        title="A plan for every"
        accent="goal."
        lead="Programs schedule your week for you and get harder as you get fitter. Pick one in the app, or let Reprummble choose based on your goals."
      />

      <section className="rr-section" style={{ paddingTop: 8 }}>
        <div className="rr-container">
          <div className="lib-toolbar">
            <FilterGroup
              label="Level"
              value={level}
              options={LEVELS}
              onChange={(v) => setParams(v === 'all' ? {} : { level: v }, { replace: true })}
            />
          </div>

          {results.length === 0 ? (
            <EmptyState onReset={() => setParams({}, { replace: true })} />
          ) : (
            <div className="lib-grid">
              {results.map((p) => {
                const firstWorkout = p.week.map((d) => d.workout && getWorkout(d.workout)).find(Boolean);
                return (
                  <Link className="lib-card" to={`/programs/${p.slug}`} key={p.slug}>
                    <Poster focus={firstWorkout ? firstWorkout.focus : 'full-body'} label={p.goal} title={p.name} pro={p.pro} />
                    <Meta>
                      <span><CalendarDays size={14} /> {p.weeks} weeks · {sessionsPerWeek(p)}×/week</span>
                      <span>{LEVELS[p.level]}</span>
                      <span><Dumbbell size={14} /> {EQUIPMENT[p.equipment]}</span>
                    </Meta>
                    <p>{p.summary}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <AppCta title="Get a program built for you" text="Answer a few questions when you sign up — goal, schedule, and equipment — and Reprummble picks and adjusts your program automatically." />
    </div>
  );
}
