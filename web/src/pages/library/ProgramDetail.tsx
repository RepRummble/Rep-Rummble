import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { EQUIPMENT, LEVELS, getProgram, getWorkout, sessionsPerWeek } from '../../content/library';
import { AppCta, Poster } from '../../components/library/LibraryUI';
import NotFound from '../NotFound';

export default function ProgramDetail() {
  const { slug = '' } = useParams();
  const program = getProgram(slug);

  usePageMeta({
    title: program ? program.name : 'Program not found',
    description: program?.summary,
    canonical: `/programs/${slug}`,
  });

  if (!program) return <NotFound />;

  const firstWorkout = program.week.map((d) => d.workout && getWorkout(d.workout)).find(Boolean);

  return (
    <div className="rr-page">
      <section className="lib-detail">
        <div className="rr-container">
          <nav className="lib-crumbs" aria-label="Breadcrumb">
            <Link to="/programs">Programs</Link> <span>/</span> <span>{program.goal}</span>
          </nav>
          <div className="lib-detail-grid">
            <Poster focus={firstWorkout ? firstWorkout.focus : 'full-body'} size="hero" label={program.goal} title={program.name} pro={program.pro} />
            <div>
              <span className="rr-eyebrow">{LEVELS[program.level]} program</span>
              <h1>{program.name}</h1>
              <p className="lead">{program.summary}</p>
              <div className="lib-stats">
                <div className="lib-stat"><small>Length</small><strong>{program.weeks} weeks</strong></div>
                <div className="lib-stat"><small>Per week</small><strong>{sessionsPerWeek(program)} sessions</strong></div>
                <div className="lib-stat"><small>Gear</small><strong>{EQUIPMENT[program.equipment]}</strong></div>
              </div>
              <div className="lib-actions">
                <Link className="rr-btn rr-btn-primary rr-btn-lg" to="/?auth=signup">
                  {program.pro ? 'Try with Pro free' : 'Start this program'} <ArrowRight size={18} />
                </Link>
                <Link className="rr-btn rr-btn-outline rr-btn-lg" to="/programs">All programs</Link>
              </div>
            </div>
          </div>

          <div className="lib-block">
            <h2>A typical week</h2>
            <div className="lib-week">
              {program.week.map(({ day, workout: wSlug }) => {
                const w = wSlug ? getWorkout(wSlug) : undefined;
                return w ? (
                  <Link className="lib-day" to={`/workouts/${w.slug}`} key={day}>
                    <small>{day}</small>
                    <strong>{w.name}</strong>
                    <span>{w.minutes} min</span>
                  </Link>
                ) : (
                  <div className="lib-day is-rest" key={day}>
                    <small>{day}</small>
                    <strong>Rest or a walk</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lib-block">
            <h2>How it progresses</h2>
            <div className="lib-phases">
              {program.phases.map((ph) => (
                <div className="lib-phase" key={ph.weeks}>
                  <small>Weeks {ph.weeks}</small>
                  <h3>{ph.title}</h3>
                  <p>{ph.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <AppCta title="Your week, scheduled for you" />
    </div>
  );
}
