import { Link } from 'react-router-dom';
import { ArrowRight, TriangleAlert } from 'lucide-react';
import { biz, useLoad } from './api';
import { useBusiness } from './useBusiness';

export default function Overview() {
  const { allowed } = useBusiness();
  const { data, error, loading, reload } = useLoad(() => biz.stats(12), []);

  if (loading) return <p className="dash-muted">Loading…</p>;
  if (error || !data) return <div className="dash-empty"><p className="dash-error">{error || 'Could not load your overview.'}</p><button className="rr-btn rr-btn-outline" onClick={reload}>Try again</button></div>;

  const { counts, weeklySessions: weeks } = data;
  const max = Math.max(...weeks, 1);

  return (
    <>
      <div className="dash-head"><h1>Overview</h1><p>How your members are doing, based on the workouts they log in the app.</p></div>

      <div className="dash-kpis">
        <div className="dash-kpi"><small>Members</small><strong>{counts.members}</strong><span>{counts.invited} waiting to join</span></div>
        <div className="dash-kpi"><small>Active (last 14 days)</small><strong>{counts.active}</strong><span>logged a workout</span></div>
        <div className="dash-kpi"><small>Avg. plan adherence</small><strong>{data.avgAdherence === null ? '—' : `${data.avgAdherence}%`}</strong><span>last 4 weeks</span></div>
        <div className="dash-kpi"><small>Plans</small><strong>{counts.workoutPlans + counts.mealPlans}</strong><span>{counts.workoutPlans} workout · {counts.mealPlans} meal</span></div>
      </div>

      {counts.members === 0 ? (
        <div className="dash-empty">
          <h2>Start by inviting your first member</h2>
          <p className="dash-muted">Add their name and email. When they sign up to Reprummble with that email, they appear here as active.</p>
          {allowed('members') && <Link className="rr-btn rr-btn-primary" to="/business/members">Invite a member</Link>}
        </div>
      ) : (
        <div className="dash-grid">
          <section className="dash-card">
            <h2>Sessions completed per week</h2>
            <div className="dash-bars" role="img" aria-label={`Sessions per week over the last ${weeks.length} weeks`}>
              {weeks.map((v, i) => (
                <div key={i} className="dash-bar" title={`${v} sessions`}><i style={{ height: `${(v / max) * 100}%` }} /><span>W{i + 1}</span></div>
              ))}
            </div>
          </section>

          <section className="dash-card">
            <h2><TriangleAlert size={18} /> Needs a check-in</h2>
            {data.needsCheckIn.length === 0 ? (
              <p className="dash-muted">Everyone has been active this week.</p>
            ) : (
              <ul className="dash-list">
                {data.needsCheckIn.map((m) => (
                  <li key={m.id}>
                    <div><strong>{m.name}</strong><small>{m.lastActiveDays === null ? 'No recent sessions' : `${m.lastActiveDays} days since last session`}</small></div>
                    {m.adherence !== null && <span className="dash-pill is-warn">{m.adherence}%</span>}
                  </li>
                ))}
              </ul>
            )}
            <Link className="rr-link-arrow" to="/business/members">View all members <ArrowRight size={16} /></Link>
          </section>
        </div>
      )}

      <section className="dash-card">
        <h2>Quick actions</h2>
        <div className="dash-actions">
          {allowed('members') && <Link className="rr-btn rr-btn-outline" to="/business/members">Invite a member</Link>}
          {allowed('plans') && <Link className="rr-btn rr-btn-outline" to="/business/workouts">Create a workout plan</Link>}
          {allowed('nutrition') && <Link className="rr-btn rr-btn-outline" to="/business/nutrition">Create a meal plan</Link>}
          <Link className="rr-btn rr-btn-outline" to="/business/reports">View reports</Link>
        </div>
      </section>
    </>
  );
}
