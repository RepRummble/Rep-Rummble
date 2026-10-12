import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  LEVELS, challengeSchedule, formatTarget, getChallenge, getExercise,
} from '../../content/library';
import { AppCta, Poster } from '../../components/library/LibraryUI';
import NotFound from '../NotFound';

export default function ChallengeDetail() {
  const { slug = '' } = useParams();
  const challenge = getChallenge(slug);

  usePageMeta({
    title: challenge ? challenge.name : 'Challenge not found',
    description: challenge?.summary,
    canonical: `/challenges/${slug}`,
  });

  if (!challenge) return <NotFound />;

  const exercise = getExercise(challenge.exercise);
  const schedule = challengeSchedule(challenge);
  const restDays = schedule.filter((d) => d.target === null).length;

  return (
    <div className="rr-page">
      <section className="lib-detail">
        <div className="rr-container">
          <nav className="lib-crumbs" aria-label="Breadcrumb">
            <Link to="/challenges">Challenges</Link> <span>/</span> <span>{challenge.name}</span>
          </nav>
          <div className="lib-detail-grid">
            <Poster focus={challenge.focus} size="hero" label={`${challenge.days}-day challenge`} title={challenge.name} />
            <div>
              <span className="rr-eyebrow">{LEVELS[challenge.level]}</span>
              <h1>{challenge.name}</h1>
              <p className="lead">{challenge.summary}</p>
              <div className="lib-stats">
                <div className="lib-stat"><small>Day 1</small><strong>{formatTarget(challenge.start, challenge.unit)}</strong></div>
                <div className="lib-stat"><small>Day {challenge.days}</small><strong>{formatTarget(challenge.end, challenge.unit)}</strong></div>
                <div className="lib-stat"><small>Rest days</small><strong>{restDays}</strong></div>
              </div>
              <div className="lib-actions">
                <Link className="rr-btn rr-btn-primary rr-btn-lg" to="/?auth=signup">Join the challenge <ArrowRight size={18} /></Link>
                {exercise && <Link className="rr-btn rr-btn-outline rr-btn-lg" to={`/exercises/${exercise.slug}`}>How to do a {exercise.name.toLowerCase()}</Link>}
              </div>
            </div>
          </div>

          <div className="lib-block">
            <h2>Daily targets</h2>
            <p style={{ marginBottom: 18 }}>
              {challenge.unit === 'reps'
                ? 'Total reps for the day — split them into as many sets as you need.'
                : 'Total hold time for the day — break it into shorter holds if you need to.'}
            </p>
            <div className="lib-calendar">
              {schedule.map(({ day, target }) => (
                <div
                  key={day}
                  className={`lib-cal-day${target === null ? ' is-rest' : ''}${day === challenge.days ? ' is-final' : ''}`}
                >
                  <small>DAY {day}</small>
                  <strong>{target === null ? 'Rest' : formatTarget(target, challenge.unit)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <AppCta title="Never miss a day" text="The app reminds you, tracks your streak, and lets you compete with friends on the leaderboard." />
    </div>
  );
}
