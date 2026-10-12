import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Check, TriangleAlert } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  EQUIPMENT, LEVELS, MUSCLES, getExercise, workoutsUsing,
} from '../../content/library';
import { AppCta, ExerciseMedia, Meta, Minutes, Poster } from '../../components/library/LibraryUI';
import NotFound from '../NotFound';

export default function ExerciseDetail() {
  const { slug = '' } = useParams();
  const exercise = getExercise(slug);

  usePageMeta({
    title: exercise ? `How to do a ${exercise.name.toLowerCase()}` : 'Exercise not found',
    description: exercise ? `${exercise.steps[0]} Step-by-step instructions, form tips, and variations.` : undefined,
    canonical: `/exercises/${slug}`,
  });

  if (!exercise) return <NotFound />;

  const usedIn = workoutsUsing(exercise.slug).slice(0, 3);

  return (
    <div className="rr-page">
      <section className="lib-detail">
        <div className="rr-container">
          <nav className="lib-crumbs" aria-label="Breadcrumb">
            <Link to="/exercises">Exercises</Link> <span>/</span>
            <Link to={`/exercises?muscle=${exercise.primary}`}>{MUSCLES[exercise.primary]}</Link>
          </nav>
          <div className="lib-detail-grid">
            <ExerciseMedia exercise={exercise} />
            <div>
              <span className="rr-eyebrow">{LEVELS[exercise.level]} · {EQUIPMENT[exercise.equipment]}</span>
              <h1>{exercise.name}</h1>
              <div className="lib-tags" style={{ marginBottom: 24 }}>
                {exercise.muscles.map((m) => (
                  <Link className="lib-tag" to={`/exercises?muscle=${m}`} key={m}>{MUSCLES[m]}</Link>
                ))}
              </div>
              <h2 style={{ fontSize: 20, marginBottom: 14 }}>How to do it</h2>
              <ol className="lib-steps">
                {exercise.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
            </div>
          </div>

          <div className="lib-block rr-grid-2">
            <div className="rr-card">
              <span className="rr-icon is-orange"><TriangleAlert size={22} /></span>
              <h3>Form tips</h3>
              <ul className="lib-tips">
                {exercise.tips.map((t) => <li key={t}><Check size={16} /> {t}</li>)}
              </ul>
            </div>
            {(exercise.easier || exercise.harder) && (
              <div className="rr-card">
                <span className="rr-icon is-violet"><ArrowUp size={22} /></span>
                <h3>Make it fit you</h3>
                <ul className="lib-tips">
                  {exercise.easier && <li><ArrowDown size={16} /> <span><strong>Easier:</strong> {exercise.easier}</span></li>}
                  {exercise.harder && <li><ArrowUp size={16} /> <span><strong>Harder:</strong> {exercise.harder}</span></li>}
                </ul>
              </div>
            )}
          </div>

          {usedIn.length > 0 && (
            <div className="lib-block">
              <h2>Workouts with this exercise</h2>
              <div className="lib-grid">
                {usedIn.map((w) => (
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
