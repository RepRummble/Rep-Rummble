import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Watch } from 'lucide-react';
import api, { apiRequest } from '../../config/api';
import { useAccountUser } from './useAccountUser';

interface WorkoutStats {
  total: number; thisWeek: number; totalCalories: number; avgDuration: number; weeklyLoad: number[]; consistency: number;
}
interface MealStats {
  todayCalories: number; todayProtein: number; todayCarbs: number; todayFat: number; todayMealCount: number;
  avgDailyCalories: number; totalMeals: number; macroSplit: { protein: number; carbs: number; fat: number };
}

interface Membership {
  business: { name: string };
  workoutPlan: { name: string; goal: string; level: string; weeks: number; daysPerWeek: number; notes: string } | null;
  mealPlan: { name: string; calories: number; protein: number; carbs: number; fat: number; mealsPerDay: number; notes: string } | null;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Dashboard() {
  const { user } = useAccountUser();
  const [stats, setStats] = useState<{ w: WorkoutStats | null; m: MealStats | null } | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.workouts.getStats(), api.meals.getStats()]).then(([w, m]) => {
      if (!cancelled) setStats({ w: (w.data as WorkoutStats) ?? null, m: (m.data as MealStats) ?? null });
    });
    // Also connects any invite sent to this email by a gym or coach.
    apiRequest<Membership[]>('/api/business/memberships').then((res) => { if (!cancelled && Array.isArray(res.data)) setMemberships(res.data); });
    return () => { cancelled = true; };
  }, []);

  const w = stats?.w;
  const m = stats?.m;
  const hasData = !!w && (w.total > 0 || (m?.totalMeals ?? 0) > 0);
  const firstName = user?.name.split(' ')[0];
  const maxLoad = Math.max(...(w?.weeklyLoad ?? [0]), 1);

  return (
    <>
      <div className="dash-head">
        <h1>{firstName ? `Welcome back, ${firstName}` : 'Your dashboard'}</h1>
        <p>Your workouts and nutrition at a glance. Log sessions and meals in the app and they appear here.</p>
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

      {!stats ? (
        <p className="dash-muted">Loading your stats…</p>
      ) : !hasData ? (
        <div className="dash-empty">
          <h2>No activity yet</h2>
          <p className="dash-muted">Log your first workout or meal in the iPhone or Android app and your stats will show up here automatically.</p>
          <Link className="rr-btn rr-btn-outline" to="/dashboard/wearables"><Watch size={16} /> Connect a wearable</Link>
        </div>
      ) : (
        <>
          <div className="dash-kpis">
            <div className="dash-kpi"><small>Consistency</small><strong>{w?.consistency ? `${w.consistency}%` : '—'}</strong><span>{w?.thisWeek ?? 0} sessions this week</span></div>
            <div className="dash-kpi"><small>Workouts total</small><strong>{w?.total || '—'}</strong><span>{w?.avgDuration ? `Avg ${w.avgDuration} min` : 'No sessions yet'}</span></div>
            <div className="dash-kpi"><small>Calories today</small><strong>{m?.todayCalories ? `${m.todayCalories}` : '—'}</strong><span>{m?.todayMealCount ?? 0} meals logged</span></div>
            <div className="dash-kpi"><small>Daily average</small><strong>{m?.avgDailyCalories ? `${m.avgDailyCalories}` : '—'}</strong><span>kcal over your logged days</span></div>
          </div>

          <div className="dash-grid">
            <section className="dash-card">
              <h2>Training load this week</h2>
              <div className="dash-bars" role="img" aria-label="Training load per day this week">
                {DAYS.map((d, i) => {
                  const v = w?.weeklyLoad?.[i] ?? 0;
                  return <div key={d} className="dash-bar" title={`${d}: ${v}`}><i style={{ height: `${(v / maxLoad) * 100}%` }} /><span>{d}</span></div>;
                })}
              </div>
            </section>
            <section className="dash-card">
              <h2>Macros</h2>
              <ul className="dash-dist">
                {([['Protein', m?.macroSplit.protein], ['Carbs', m?.macroSplit.carbs], ['Fat', m?.macroSplit.fat]] as const).map(([label, v]) => (
                  <li key={label}><span>{label}</span><div className="dash-meter"><i style={{ width: `${v ?? 0}%` }} /></div><b>{v ?? 0}%</b></li>
                ))}
              </ul>
              <Link className="rr-link-arrow" to="/dashboard/reports">View reports <ArrowRight size={16} /></Link>
            </section>
          </div>
        </>
      )}
    </>
  );
}
