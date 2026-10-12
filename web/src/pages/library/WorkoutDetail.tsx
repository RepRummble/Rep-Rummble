import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  EQUIPMENT, FOCUS, LEVELS, MUSCLES, WORKOUTS, getExercise, getWorkout,
} from '../../content/library';
import { AppCta, Meta, Minutes, Poster } from '../../components/library/LibraryUI';
import NotFound from '../NotFound';

const FORMAT_TEXT = {
  circuit: (rounds: number, rest: number) => `Do each move back-to-back, then rest ${rest} seconds. Repeat for ${rounds} rounds.`,
  sets: (rounds: number, rest: number) => `Complete ${rounds} sets of each move before moving on, resting ${rest} seconds between sets.`,
  intervals: (rounds: number, rest: number) => `Work for the time shown, with 20 seconds' rest between moves. Rest ${rest} seconds after each round. ${rounds} rounds.`,
};

export default function WorkoutDetail() {
  const { slug = '' } = useParams();
  const workout = getWorkout(slug);

  usePageMeta({
    title: workout ? workout.name : 'Workout not found',
    description: workout?.summary,
    canonical: `/workouts/${slug}`,
  });

  if (!workout) return <NotFound />;

  const related = WORKOUTS.filter((w) => w.slug !== workout.slug && w.focus === workout.focus).slice(0, 3);

  return (
    <div className="rr-page">
      <section className="lib-detail">
        <div className="rr-container">
          <nav className="lib-crumbs" aria-label="Breadcrumb">
            <Link to="/workouts">Workouts</Link> <span>/</span>
            <Link to={`/workouts?focus=${workout.focus}`}>{FOCUS[workout.focus]}</Link>
          </nav>
          <div className="lib-detail-grid">
            <Poster focus={workout.focus} size="hero" label={FOCUS[workout.focus]} title={workout.name} pro={workout.pro} />
            <div>
              <span className="rr-eyebrow">{LEVELS[workout.level]} workout</span>
              <h1>{workout.name}</h1>
              <p className="lead">{workout.summary}</p>
              <div className="lib-stats">
                <div className="lib-stat"><small>Time</small><strong>{workout.minutes} min</strong></div>
                <div className="lib-stat"><small>Rounds</small><strong>{workout.rounds}</strong></div>
                <div className="lib-stat"><small>Moves</small><strong>{workout.moves.length}</strong></div>
                <div className="lib-stat"><small>Gear</small><strong>{EQUIPMENT[workout.equipment]}</strong></div>
              </div>
              <div className="lib-actions">
                <Link className="rr-btn rr-btn-primary rr-btn-lg" to="/?auth=signup">
                  {workout.pro ? 'Try with Pro free' : 'Start this workout'} <ArrowRight size={18} />
                </Link>
                <Link className="rr-btn rr-btn-outline rr-btn-lg" to="/workouts">All workouts</Link>
              </div>
            </div>
          </div>

          <div className="lib-block">
            <h2>How it works</h2>
            <p>{FORMAT_TEXT[workout.format](workout.rounds, workout.restSeconds)}</p>
          </div>

          <div className="lib-block">
            <h2>The workout</h2>
            <ol className="lib-moves">
              {workout.moves.map((m, i) => {
                const ex = getExercise(m.exercise);
                if (!ex) return null;
                return (
                  <li className="lib-move" key={`${m.exercise}-${i}`}>
                    <Link to={`/exercises/${ex.slug}`}>
                      <span className="lib-move-num" aria-hidden="true" />
                      <span>
                        <strong>{ex.name}</strong>
                        <small>{ex.muscles.slice(0, 3).map((mu) => MUSCLES[mu]).join(' · ')}</small>
                      </span>
                      <span className="lib-move-dose">{m.seconds ? `${m.seconds}s` : `× ${m.reps}`}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>

          {related.length > 0 && (
            <div className="lib-block">
              <h2>More {FOCUS[workout.focus]} workouts</h2>
              <div className="lib-grid">
                {related.map((w) => (
                  <Link className="lib-card" to={`/workouts/${w.slug}`} key={w.slug}>
                    <Poster focus={w.focus} label={LEVELS[w.level]} title={w.name} pro={w.pro} />
                    <Meta><Minutes value={w.minutes} /><span>{EQUIPMENT[w.equipment]}</span></Meta>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <AppCta />
    </div>
  );
}
