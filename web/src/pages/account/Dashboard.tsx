import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Watch } from 'lucide-react';
import api, { apiRequest, type DailyPoint, type Overview } from '../../config/api';
import { useAccountUser } from './useAccountUser';

interface Membership {
  business: { name: string };
  workoutPlan: { name: string; goal: string; level: string; weeks: number; daysPerWeek: number; notes: string } | null;
  mealPlan: { name: string; calories: number; protein: number; carbs: number; fat: number; mealsPerDay: number; notes: string } | null;
}

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Bars for the last `days` days. Hover (or screen readers) get the exact value for each day. */
function Trend({ title, points, pick, unit }: { title: string; points: DailyPoint[]; pick: (p: DailyPoint) => number; unit: string }) {
  const values = points.map(pick);
  const max = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <section className="dash-card">
      <div className="dash-card-top">
        <h2>{title}</h2>
        <small className="dash-muted">{fmt(total)} {unit} in total</small>
      </div>
      <div className="dash-bars" role="img" aria-label={`${title}: ${points.map((p, i) => `${shortDate(p.period)} ${fmt(values[i])}`).join(', ')}`}>
        {points.map((p, i) => (
          <div key={p.period} className="dash-bar" title={`${shortDate(p.period)}: ${fmt(values[i])} ${unit}`}>
            <i style={{ height: `${(values[i] / max) * 100}%`, opacity: values[i] === 0 ? 0.25 : 1 }} />
            <span>{p.period.slice(8)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAccountUser();
  const [data, setData] = useState<Overview | null | undefined>(undefined); // undefined = loading, null = failed
  const [error, setError] = useState('');
  const [memberships, setMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.analytics.overview().then((res) => {
      if (cancelled) return;
      setData(res.data ?? null);
      if (res.error) setError(res.error);
    });
    // Also connects any invite sent to this email by a gym or coach.
    apiRequest<Membership[]>('/api/business/memberships').then((res) => { if (!cancelled && Array.isArray(res.data)) setMemberships(res.data); });
    return () => { cancelled = true; };
  }, []);

  const firstName = user?.name.split(' ')[0];
  const hasActivity = !!data && (data.totals.workouts > 0 || data.totals.meals > 0 || !!data.wearables.latest);
  const last14 = data?.daily.slice(-14) ?? [];

  return (
    <>
      <div className="dash-head">
        <h1>{firstName ? `Welcome back, ${firstName}` : 'Your dashboard'}</h1>
        <p>Your training, nutrition and recovery in one place. Log sessions and meals in the app and they appear here.</p>
      </div>

      {memberships.map((m, i) => (
        <section className="dash-card" key={i}>
          <h2>From {m.business.name}</h2>
          <div className="dash-grid">
            {m.workoutPlan && (
              <div>
                <span className="dash-pill is-active">Workout plan</span>
                <h3 style={{ margin: '8px 0 4px' }}>{m.workoutPlan.name}</h3>
                <p className="dash-muted">{m.workoutPlan.level} · {m.workoutPlan.weeks} weeks · {m.workoutPlan.daysPerWeek} days/week{m.workoutPlan.goal ? ` · ${m.workoutPlan.goal}` : ''}</p>
                {m.workoutPlan.notes && <p>{m.workoutPlan.notes}</p>}
              </div>
            )}
            {m.mealPlan && (
              <div>
                <span className="dash-pill is-invited">Meal plan</span>
                <h3 style={{ margin: '8px 0 4px' }}>{m.mealPlan.name}</h3>
                <p className="dash-muted">{m.mealPlan.calories.toLocaleString()} kcal · P {m.mealPlan.protein}g · C {m.mealPlan.carbs}g · F {m.mealPlan.fat}g · {m.mealPlan.mealsPerDay} meals/day</p>
                {m.mealPlan.notes && <p>{m.mealPlan.notes}</p>}
              </div>
            )}
            {!m.workoutPlan && !m.mealPlan && <p className="dash-muted">Your coach has not assigned a plan yet.</p>}
          </div>
        </section>
      ))}

      {data === undefined ? (
        <p className="dash-muted">Loading your analytics…</p>
      ) : data === null ? (
        <div className="dash-empty"><p className="dash-error">{error || 'We could not load your analytics.'}</p><button className="rr-btn rr-btn-outline" onClick={() => window.location.reload()}>Try again</button></div>
      ) : !hasActivity ? (
        <div className="dash-empty">
          <h2>No activity yet</h2>
          <p className="dash-muted">Log your first workout or meal in the iPhone or Android app and your stats will show up here automatically.</p>
          <Link className="rr-btn rr-btn-outline" to="/dashboard/wearables"><Watch size={16} /> Connect a wearable</Link>
        </div>
      ) : (
        <>
          <div className="dash-kpis">
            <div className="dash-kpi"><small>Workouts this week</small><strong>{fmt(data.week.workouts)}</strong><span>{fmt(data.week.minutes)} min · {fmt(data.week.burned)} kcal burned</span></div>
            <div className="dash-kpi"><small>Current streak</small><strong>{data.streak.current} {data.streak.current === 1 ? 'day' : 'days'}</strong><span>Longest: {data.streak.longest} {data.streak.longest === 1 ? 'day' : 'days'}</span></div>
            <div className="dash-kpi"><small>Consistency</small><strong>{data.week.consistency}%</strong><span>{data.week.activeDays} active {data.week.activeDays === 1 ? 'day' : 'days'} of 5 target</span></div>
            <div className="dash-kpi"><small>Calories today</small><strong>{fmt(data.today.calories)}</strong><span>{data.week.avgCalories ? `${fmt(data.week.avgCalories)} daily average this week` : 'No meals logged this week'}</span></div>
          </div>

          <div className="dash-grid">
            <Trend title="Training minutes, last 14 days" points={last14} pick={(p) => p.minutes} unit="min" />
            <Trend title="Calories eaten, last 14 days" points={last14} pick={(p) => p.calories} unit="kcal" />
          </div>

          <div className="dash-grid">
            <section className="dash-card">
              <h2>Nutrition</h2>
              {data.macroSplit ? (
                <ul className="dash-dist">
                  {([['Protein', data.macroSplit.protein, data.today.protein], ['Carbs', data.macroSplit.carbs, data.today.carbs], ['Fat', data.macroSplit.fat, data.today.fat]] as const).map(([label, pct, today]) => (
                    <li key={label}><span>{label}</span><div className="dash-meter"><i style={{ width: `${pct}%` }} /></div><b>{pct}%</b><small className="dash-muted">{fmt(today)} g today</small></li>
                  ))}
                </ul>
              ) : <p className="dash-muted">Log a few meals and your protein, carbs and fat split shows up here.</p>}
              <p className="dash-muted">{fmt(data.totals.meals)} meals logged in total · {fmt(data.totals.calories)} kcal</p>
            </section>

            <section className="dash-card">
              <div className="dash-card-top">
                <h2>Recovery</h2>
                <Link className="rr-link-arrow" to="/dashboard/wearables">Wearables <ArrowRight size={16} /></Link>
              </div>
              {data.wearables.latest ? (
                <div className="dash-mini">
                  <div><small>Sleep</small><strong>{data.wearables.latest.sleepHours ? `${fmt(data.wearables.latest.sleepHours)} h` : '—'}</strong></div>
                  <div><small>Resting HR</small><strong>{data.wearables.latest.restingHR ? `${data.wearables.latest.restingHR} bpm` : '—'}</strong></div>
                  <div><small>HRV</small><strong>{data.wearables.latest.hrv ? `${data.wearables.latest.hrv} ms` : '—'}</strong></div>
                  <div><small>Steps</small><strong>{fmt(data.wearables.latest.steps)}</strong></div>
                </div>
              ) : <p className="dash-muted">Connect your Apple Watch or another wearable to see sleep, heart rate and recovery here.</p>}
              <p className="dash-muted">{fmt(data.totals.workouts)} workouts in total · {fmt(data.totals.minutes)} minutes · {fmt(data.totals.burned)} kcal burned</p>
            </section>
          </div>

          <div className="dash-grid">
            <section className="dash-card">
              <div className="dash-card-top"><h2>Recent workouts</h2><Link className="rr-link-arrow" to="/dashboard/reports">Full history <ArrowRight size={16} /></Link></div>
              {data.recentWorkouts.length === 0 ? <p className="dash-muted">No workouts yet.</p> : (
                <ul className="dash-list">
                  {data.recentWorkouts.map((w, i) => (
                    <li key={i}><div><strong>{w.exercise}</strong><small>{shortDate(w.at)}</small></div><span className="dash-muted">{fmt(w.minutes)} min · {fmt(w.burned)} kcal</span></li>
                  ))}
                </ul>
              )}
            </section>
            <section className="dash-card">
              <div className="dash-card-top"><h2>Recent meals</h2><Link className="rr-link-arrow" to="/dashboard/reports">Full history <ArrowRight size={16} /></Link></div>
              {data.recentMeals.length === 0 ? <p className="dash-muted">No meals yet.</p> : (
                <ul className="dash-list">
                  {data.recentMeals.map((m, i) => (
                    <li key={i}><div><strong>{m.name}</strong><small>{shortDate(m.at)}{m.mealType ? ` · ${m.mealType}` : ''}</small></div><span className="dash-muted">{fmt(m.calories)} kcal · P {fmt(m.protein)}g</span></li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
