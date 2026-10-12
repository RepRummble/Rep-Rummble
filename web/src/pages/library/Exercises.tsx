import { Link, useSearchParams } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  EQUIPMENT, EXERCISES, LEVELS, MUSCLES, focusForMuscle, parseFilter, type Equipment, type Muscle,
} from '../../content/library';
import {
  AppCta, EmptyState, FilterGroup, LibraryHeader, Meta, Poster,
} from '../../components/library/LibraryUI';

export default function Exercises() {
  usePageMeta({
    title: 'Exercise library',
    description: 'Learn how to do every exercise in Reprummble: step-by-step instructions, form tips, and easier or harder variations, organized by muscle group.',
    canonical: '/exercises',
  });

  const [params, setParams] = useSearchParams();
  const muscle = parseFilter<Muscle>(params.get('muscle'), MUSCLES);
  const equipment = parseFilter<Equipment>(params.get('equipment'), EQUIPMENT);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === 'all' || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const results = EXERCISES.filter((e) =>
    (muscle === 'all' || e.muscles.includes(muscle))
    && (equipment === 'all' || e.equipment === equipment));

  const countFor = (m: Muscle) => EXERCISES.filter((e) => e.muscles.includes(m)).length;

  return (
    <div className="rr-page">
      <LibraryHeader
        eyebrow="Exercise library"
        title="Learn every move"
        accent="the right way."
        lead="Clear steps, common mistakes to avoid, and easier or harder options for each exercise. Choose a muscle group to start."
      />

      <section className="rr-section" style={{ paddingTop: 8 }}>
        <div className="rr-container">
          <div className="lib-muscles" role="group" aria-label="Muscle group">
            {(Object.keys(MUSCLES) as Muscle[]).map((m) => (
              <button
                type="button"
                key={m}
                className={`lib-muscle${muscle === m ? ' active' : ''}`}
                aria-pressed={muscle === m}
                onClick={() => set('muscle', m)}
              >
                {MUSCLES[m]} <small>{countFor(m)}</small>
              </button>
            ))}
          </div>

          <div className="lib-toolbar">
            <FilterGroup label="Equipment" value={equipment} options={EQUIPMENT} onChange={(v) => set('equipment', v)} />
          </div>

          <p className="lib-count">
            {results.length} {results.length === 1 ? 'exercise' : 'exercises'}{muscle !== 'all' ? ` for ${MUSCLES[muscle].toLowerCase()}` : ''}
          </p>
          {results.length === 0 ? (
            <EmptyState onReset={() => setParams({}, { replace: true })} />
          ) : (
            <div className="lib-grid is-small">
              {results.map((e) => (
                <Link className="lib-card" to={`/exercises/${e.slug}`} key={e.slug}>
                  <Poster focus={focusForMuscle(e.primary)} label={MUSCLES[e.primary]} title={e.name} />
                  <Meta><span>{LEVELS[e.level]}</span><span>{EQUIPMENT[e.equipment]}</span></Meta>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <AppCta title="Put these moves to work" text="The app turns these exercises into a plan for your goals, with timers and logging built in. One account across web, iPhone, and Android." />
    </div>
  );
}
