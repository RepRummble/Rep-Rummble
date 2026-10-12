import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/api';

interface WorkoutStats {
  total: number;
  thisWeek: number;
  totalCalories: number;
  avgDuration: number;
  weeklyLoad: number[];
  consistency: number;
}

interface MealStats {
  todayCalories: number;
  todayProtein: number;
  todayCarbs: number;
  todayFat: number;
  todayMealCount: number;
  avgDailyCalories: number;
  totalMeals: number;
  macroSplit: { protein: number; carbs: number; fat: number };
}

const DEMO_WORKOUT: WorkoutStats = { total: 0, thisWeek: 0, totalCalories: 0, avgDuration: 0, weeklyLoad: [62, 74, 54, 72, 90, 66, 80], consistency: 0 };
const DEMO_MEAL: MealStats = { todayCalories: 0, todayProtein: 0, todayCarbs: 0, todayFat: 0, todayMealCount: 0, avgDailyCalories: 0, totalMeals: 0, macroSplit: { protein: 35, carbs: 40, fat: 25 } };

export default function Analytics() {
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats | null>(null);
  const [mealStats, setMealStats] = useState<MealStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [wRes, mRes] = await Promise.all([
        api.workouts.getStats(),
        api.meals.getStats(),
      ]);
      if (wRes.data) {
        setWorkoutStats(wRes.data as WorkoutStats);
      } else {
        setWorkoutStats(DEMO_WORKOUT);
        setIsDemo(true);
      }
      if (mRes.data) {
        setMealStats(mRes.data as MealStats);
      } else {
        setMealStats(DEMO_MEAL);
        setIsDemo(true);
      }
      setLoading(false);
    };
    load();
  }, []);

  const ws = workoutStats || DEMO_WORKOUT;
  const ms = mealStats || DEMO_MEAL;
  const hasData = ws.total > 0 || ms.totalMeals > 0;

  const kpis = [
    { label: 'Consistency score', value: ws.consistency ? `${ws.consistency}%` : '—', change: `${ws.thisWeek} sessions this week` },
    { label: 'Workouts total', value: ws.total > 0 ? String(ws.total) : '—', change: `${ws.avgDuration > 0 ? `Avg ${ws.avgDuration} min` : 'No data yet'}` },
    { label: "Today's calories", value: ms.todayCalories > 0 ? `${ms.todayCalories} kcal` : '—', change: `${ms.todayMealCount} meals logged today` },
    { label: 'Macro split', value: `${ms.macroSplit.protein} / ${ms.macroSplit.carbs} / ${ms.macroSplit.fat}`, change: 'Protein / Carbs / Fat %' },
  ];

  const readiness = [
    { label: 'Sleep', value: '7h 22m', delta: 'Wearable needed' },
    { label: 'HRV', value: '—', delta: 'Connect device' },
    { label: 'Resting HR', value: '—', delta: 'Connect device' },
    { label: 'Stress', value: '—', delta: 'Connect device' },
  ];

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxLoad = Math.max(...ws.weeklyLoad, 1);

  return (
    <section className="section page-section analytics-page" data-reveal>
      {(!hasData || isDemo) && (
        <div style={{ background: 'var(--accent-subtle, #f0f4ff)', border: '1px solid var(--accent, #4f6ef7)', borderRadius: 8, padding: '10px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>📊</span>
          <span><strong>No data yet</strong> — log your first workout or meal to see your real stats here.</span>
          <Link to="/wearables" className="ghost-btn" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>Connect devices</Link>
        </div>
      )}

      <div className="section-head">
        <h2>Your dashboard</h2>
        <p>Real-time view of your workouts, nutrition, and recovery.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>Loading your stats…</div>
      ) : (
        <>
          <div className="dashboard-grid" data-stagger>
            {kpis.map((item) => (
              <div className="kpi-card" key={item.label}>
                <span className="muted">{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.change}</small>
              </div>
            ))}
          </div>

          <div className="chart-grid" data-stagger>
            <div className="chart-card animated-card">
              <div className="chart-header">
                <h4>Weekly training load</h4>
                <span>{ws.thisWeek} sessions this week</span>
              </div>
              <div className="chart-bars">
                {ws.weeklyLoad.map((h, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                    <span className="chart-bar" data-height={Math.round((h / maxLoad) * 100)} style={{ height: `${Math.round((h / maxLoad) * 80) + 4}px` }} />
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>{weekDays[idx]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="chart-card glass animated-card">
              <div className="chart-header">
                <h4>Macros today</h4>
                <span>{ms.todayCalories > 0 ? `${ms.todayCalories} kcal` : 'No meals logged'}</span>
              </div>
              <div className="chart-ring">
                <div className="ring">
                  <span>Protein {ms.macroSplit.protein}%</span>
                </div>
                <div className="ring-labels">
                  {[
                    { label: 'Protein', value: ms.macroSplit.protein, g: ms.todayProtein },
                    { label: 'Carbs', value: ms.macroSplit.carbs, g: ms.todayCarbs },
                    { label: 'Fat', value: ms.macroSplit.fat, g: ms.todayFat },
                  ].map((m) => (
                    <span key={m.label}>{m.label} {m.value}%{m.g > 0 ? ` · ${m.g}g` : ''}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-grid" data-stagger>
            {readiness.map((item) => (
              <div className="kpi-card light" key={item.label}>
                <div className="kpi-row">
                  <span className="muted">{item.label}</span>
                  <span className="pill">Today</span>
                </div>
                <strong>{item.value}</strong>
                <small>{item.delta}</small>
              </div>
            ))}
          </div>

          <div className="insight-grid" data-stagger>
            <div className="insight-card">
              <h4>Training volume</h4>
              <p>{ws.total > 0 ? `${ws.total} total workouts logged. ${ws.thisWeek} this week.` : 'No workouts yet — log your first session to see trends.'}</p>
              <Link to="/reports" className="pill" style={{ textDecoration: 'none' }}>View reports</Link>
            </div>
            <div className="insight-card">
              <h4>Nutrition today</h4>
              <p>{ms.todayCalories > 0 ? `${ms.todayCalories} kcal logged across ${ms.todayMealCount} meals. Avg daily: ${ms.avgDailyCalories} kcal.` : 'No meals logged today. Start tracking to see your macro balance.'}</p>
              <span className="pill">{ms.todayMealCount > 0 ? 'On track' : 'Start logging'}</span>
            </div>
            <div className="insight-card">
              <h4>Recovery readiness</h4>
              <p>Connect a wearable device to unlock sleep, HRV, and recovery scores.</p>
              <Link to="/wearables" className="pill" style={{ textDecoration: 'none' }}>Connect device</Link>
            </div>
          </div>

          <div className="page-actions" style={{ marginTop: 24 }}>
            <Link className="solid-btn" to="/reports">Export Reports</Link>
            <Link className="ghost-btn" to="/pricing">Compare Plans</Link>
          </div>
        </>
      )}
    </section>
  );
}
