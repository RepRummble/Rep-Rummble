import type { ReactNode } from 'react';

// Illustrative product UI (sample values), not live user data.

export function PhoneMockup({ children }: { children?: ReactNode }) {
  return (
    <div className="rr-phone" aria-hidden="true">
      <div className="rr-phone-screen">
        <span className="rr-phone-notch" />
        {children ?? <TodayScreen />}
      </div>
    </div>
  );
}

export function TodayScreen() {
  return (
    <>
      <div>
        <div className="rr-app-greet">Tuesday</div>
        <div className="rr-app-title">Your day</div>
      </div>
      <div className="rr-app-card rr-ring-row">
        <div className="rr-ring" style={{ ['--p' as string]: 84 }}><span>84</span></div>
        <div>
          <div className="rr-app-label">Readiness</div>
          <div className="rr-app-value">Good to train hard</div>
        </div>
      </div>
      <div className="rr-app-mini">
        <div><div className="rr-app-value">7h 20m</div><div className="rr-app-label">Sleep</div></div>
        <div><div className="rr-app-value">56</div><div className="rr-app-label">RHR</div></div>
        <div><div className="rr-app-value">8.4k</div><div className="rr-app-label">Steps</div></div>
      </div>
      <div className="rr-app-card">
        <div className="rr-app-session">
          <div>
            <div className="rr-app-label">Today's session</div>
            <div className="rr-app-value">Full body · 40 min</div>
          </div>
          <span className="rr-app-chip">Start</span>
        </div>
      </div>
      <div className="rr-app-card">
        <div className="rr-app-session">
          <div className="rr-app-label">Calories</div>
          <div className="rr-app-value">1,620 / 2,200</div>
        </div>
        <div className="rr-app-bar"><i style={{ width: '74%' }} /></div>
      </div>
    </>
  );
}

export function NutritionScreen() {
  return (
    <>
      <div>
        <div className="rr-app-greet">Lunch</div>
        <div className="rr-app-title">Snap & log</div>
      </div>
      <div className="rr-app-card" style={{ height: 120, background: 'linear-gradient(135deg,#fde68a,#fdba74 60%,#86efac)', border: 'none' }} />
      <div className="rr-app-card">
        <div className="rr-app-value">Chicken rice bowl</div>
        <div className="rr-app-label" style={{ marginTop: 4 }}>Detected · 540 kcal</div>
        <div className="rr-app-mini" style={{ marginTop: 10 }}>
          <div><div className="rr-app-value">42g</div><div className="rr-app-label">Protein</div></div>
          <div><div className="rr-app-value">58g</div><div className="rr-app-label">Carbs</div></div>
          <div><div className="rr-app-value">14g</div><div className="rr-app-label">Fat</div></div>
        </div>
      </div>
      <div className="rr-app-card">
        <div className="rr-app-session">
          <div className="rr-app-label">Protein today</div>
          <div className="rr-app-value">96 / 130g</div>
        </div>
        <div className="rr-app-bar"><i style={{ width: '74%' }} /></div>
      </div>
    </>
  );
}

export function WorkoutScreen() {
  const sets = [
    ['Goblet squat', '3 × 10', true],
    ['Push-up', '3 × 12', true],
    ['Dumbbell row', '3 × 10', false],
    ['Plank', '3 × 40s', false],
  ] as const;
  return (
    <>
      <div>
        <div className="rr-app-greet">Week 3 · Day 2</div>
        <div className="rr-app-title">Full body</div>
      </div>
      {sets.map(([name, reps, done]) => (
        <div className="rr-app-card rr-app-session" key={name}>
          <div>
            <div className="rr-app-value">{name}</div>
            <div className="rr-app-label">{reps}</div>
          </div>
          <span style={{ width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', background: done ? 'var(--rr-brand)' : 'var(--rr-surface-2)', color: '#fff', fontSize: 14 }}>{done ? '✓' : ''}</span>
        </div>
      ))}
      <div className="rr-app-card">
        <div className="rr-app-label">Coach note</div>
        <div className="rr-app-value" style={{ fontWeight: 500, fontSize: 13, marginTop: 4 }}>Readiness is high — add 2.5kg on rows.</div>
      </div>
    </>
  );
}

export function GymDashboard() {
  const bars = [38, 52, 46, 64, 58, 72, 80, 76, 88, 84, 92, 98];
  return (
    <div className="rr-dash" aria-hidden="true">
      <div className="rr-dash-top"><i /><i /><i /><span>Partner dashboard · sample view</span></div>
      <div className="rr-dash-body">
        <div className="rr-dash-kpis">
          <div className="rr-dash-kpi"><div className="rr-app-label">Active members</div><div className="rr-app-value">148</div></div>
          <div className="rr-dash-kpi"><div className="rr-app-label">Program sales</div><div className="rr-app-value">$3,240</div></div>
          <div className="rr-dash-kpi"><div className="rr-app-label">Check-ins</div><div className="rr-app-value">1,092</div></div>
        </div>
        <div className="rr-dash-chart">
          {bars.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}
        </div>
        <div className="rr-dash-row"><span>8-Week Strength Base</span><b>62 members</b></div>
        <div className="rr-dash-row"><span>Beginner Fat Loss</span><b>41 members</b></div>
      </div>
    </div>
  );
}
