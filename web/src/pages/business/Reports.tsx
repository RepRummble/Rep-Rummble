import { useState } from 'react';
import { Download } from 'lucide-react';
import { biz, downloadCsv, useLoad } from './api';

const RANGES = { 4: 'Last 4 weeks', 8: 'Last 8 weeks', 12: 'Last 12 weeks' } as const;
type Range = keyof typeof RANGES;

export default function Reports() {
  const [range, setRange] = useState<Range>(12);
  const { data, error, loading, reload } = useLoad(() => biz.stats(range), [range]);

  const header = (
    <div className="dash-head"><h1>Reports</h1><p>Attendance and progress, based on the workouts your members log in the app. Export any report as CSV.</p></div>
  );
  if (loading && !data) return <>{header}<p className="dash-muted">Loading…</p></>;
  if (error || !data) return <>{header}<div className="dash-empty"><p className="dash-error">{error || 'Could not load reports.'}</p><button className="rr-btn rr-btn-outline" onClick={reload}>Try again</button></div></>;

  const series = data.weeklySessions;
  const max = Math.max(...series, 1);
  const total = series.reduce((a, b) => a + b, 0);
  const bands = [
    { label: '80–100%', n: data.adherenceBands.high },
    { label: '50–79%', n: data.adherenceBands.mid },
    { label: 'Under 50%', n: data.adherenceBands.low },
  ];
  const tracked = bands.reduce((a, b) => a + b.n, 0);

  return (
    <>
      {header}
      <div className="dash-toolbar" style={{ marginBottom: 4 }}>
        <select value={range} onChange={(e) => setRange(Number(e.target.value) as Range)} aria-label="Date range">
          {(Object.keys(RANGES) as unknown as Range[]).map((r) => <option key={r} value={r}>{RANGES[r]}</option>)}
        </select>
      </div>

      <div className="dash-grid">
        <section className="dash-card">
          <div className="dash-card-top">
            <div><h2>Sessions completed</h2><p className="dash-muted">{total.toLocaleString()} in the {RANGES[range].toLowerCase()}</p></div>
            <button className="rr-btn rr-btn-outline" onClick={() => downloadCsv('sessions-by-week.csv', [['Week', 'Sessions'], ...series.map((v, i) => [`Week ${i + 1}`, v])])}><Download size={16} /> CSV</button>
          </div>
          <div className="dash-bars" role="img" aria-label={`Sessions per week, ${RANGES[range].toLowerCase()}`}>
            {series.map((v, i) => <div key={i} className="dash-bar" title={`${v} sessions`}><i style={{ height: `${(v / max) * 100}%` }} /><span>{v}</span></div>)}
          </div>
        </section>

        <section className="dash-card">
          <div className="dash-card-top">
            <div><h2>Member adherence</h2><p className="dash-muted">Share of planned sessions completed (last 4 weeks)</p></div>
            <button className="rr-btn rr-btn-outline" disabled={tracked === 0} onClick={() => downloadCsv('adherence.csv', [['Member', 'Adherence %'], ...data.members.filter((m) => m.adherence !== null).map((m) => [m.name, m.adherence as number])])}><Download size={16} /> CSV</button>
          </div>
          {tracked === 0 ? <p className="dash-muted">Adherence appears once members with a workout plan have signed up and logged workouts.</p> : (
            <ul className="dash-dist">
              {bands.map((b) => (
                <li key={b.label}><span>{b.label}</span><div className="dash-meter"><i style={{ width: `${(b.n / tracked) * 100}%` }} /></div><b>{b.n}</b></li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="dash-card">
        <h2>Plans in use</h2>
        <ul className="dash-list">
          {data.planUsage.map((p) => <li key={p.name}><strong>{p.name}</strong><span className="dash-pill is-active">{p.members} {p.members === 1 ? 'member' : 'members'}</span></li>)}
          {data.planUsage.length === 0 && <li className="dash-muted">No workout plans yet.</li>}
        </ul>
      </section>
    </>
  );
}
