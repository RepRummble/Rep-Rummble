import { Link } from 'react-router-dom';
import { CalendarDays, TrendingUp } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { CHALLENGES, LEVELS, formatTarget } from '../../content/library';
import { AppCta, LibraryHeader, Meta, Poster } from '../../components/library/LibraryUI';

export default function Challenges() {
  usePageMeta({
    title: 'Challenges',
    description: 'Join 14, 21, and 30-day Reprummble fitness challenges. Daily targets, streaks, and leaderboards with friends.',
    canonical: '/challenges',
  });

  return (
    <div className="rr-page">
      <LibraryHeader
        eyebrow="Challenges"
        title="Small daily wins,"
        accent="big results."
        lead="Pick a challenge, hit the daily target, and keep the streak alive. In the app you can join with friends and climb the leaderboard together."
      />

      <section className="rr-section" style={{ paddingTop: 8 }}>
        <div className="rr-container">
          <div className="lib-grid">
            {CHALLENGES.map((c) => (
              <Link className="lib-card" to={`/challenges/${c.slug}`} key={c.slug}>
                <Poster focus={c.focus} label={`${c.days} days`} title={c.name} />
                <Meta>
                  <span><CalendarDays size={14} /> {c.days} days</span>
                  <span><TrendingUp size={14} /> {formatTarget(c.start, c.unit)} → {formatTarget(c.end, c.unit)}{c.unit === 'reps' ? ' reps' : ''}</span>
                  <span>{LEVELS[c.level]}</span>
                </Meta>
                <p>{c.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <AppCta title="Challenge your friends" text="Track every day, get reminders so you never break the streak, and see where you rank. Free members can join one challenge a month; Pro unlocks them all." />
    </div>
  );
}
