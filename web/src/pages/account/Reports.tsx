import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import api, { type History, type ReportPeriod } from '../../config/api';

const PERIODS: { id: ReportPeriod; label: string; rows: string }[] = [
  { id: 'monthly', label: 'Last 30 days', rows: 'Day by day' },
  { id: 'yearly', label: 'Last 12 months', rows: 'Month by month' },
  { id: 'historical', label: 'All time', rows: 'Year by year' },
];

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export default function Reports() {
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [history, setHistory] = useState<History | null | undefined>(undefined); // undefined = loading
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.reports.history(period).then((res) => {
      if (cancelled) return;
      setHistory(res.data ?? null);
      setError(res.error ?? '');
    });
    return () => { cancelled = true; };
  }, [period]);

  const choose = (p: ReportPeriod) => { setHistory(undefined); setMessage(null); setPeriod(p); };

  const download = async (format: 'pdf' | 'csv') => {
    setBusy(format);
    setMessage(null);
    const { blob, error: err } = await api.reports.download(period, format);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reprummble-${period}-report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ ok: true, text: `Your ${format.toUpperCase()} report was downloaded.` });
    } else {
      setMessage({ ok: false, text: err || 'Download failed. Please try again.' });
    }
    setBusy(null);
  };

  const info = PERIODS.find((p) => p.id === period)!;
  const hasData = !!history && (history.totals.workouts > 0 || history.totals.calories > 0);
  // Newest first reads like a history; the PDF and CSV keep the oldest-first order.
  const rows = history ? [...history.rows].reverse() : [];

  return (
    <>
      <div className="dash-head"><h1>Reports</h1><p>Your workout and nutrition history. Download it as a PDF to share with a doctor or coach, or as a CSV spreadsheet. Dates are in UTC.</p></div>

      <div className="dash-toolbar">
        <div className="dash-sections" role="tablist" aria-label="Report period">
          {PERIODS.map((p) => (
            <button key={p.id} role="tab" aria-selected={period === p.id} className={`dash-chip${period === p.id ? ' active' : ''}`} onClick={() => choose(p.id)}>{p.label}</button>
          ))}
        </div>
        <div className="dash-actions" style={{ marginLeft: 'auto' }}>
          <button className="rr-btn rr-btn-primary" onClick={() => download('pdf')} disabled={busy !== null || !history}>
            <FileText size={16} /> {busy === 'pdf' ? 'Preparing PDF…' : 'Download PDF'}
          </button>
          <button className="rr-btn rr-btn-outline" onClick={() => download('csv')} disabled={busy !== null || !history}>
            <Download size={16} /> {busy === 'csv' ? 'Preparing…' : 'Download CSV'}
          </button>
        </div>
      </div>
      {message && <div className={message.ok ? 'rr-msg-ok' : 'rr-msg-err'} role="status">{message.text}</div>}

      {history === undefined ? <p className="dash-muted">Loading your history…</p> : history === null ? (
        <div className="dash-empty"><p className="dash-error">{error || 'We could not load your history.'}</p><button className="rr-btn rr-btn-outline" onClick={() => choose(period)}>Try again</button></div>
      ) : (
        <>
          <div className="dash-kpis">
            <div className="dash-kpi"><small>Workouts</small><strong>{fmt(history.totals.workouts)}</strong><span>{fmt(history.totals.minutes)} minutes</span></div>
            <div className="dash-kpi"><small>Calories burned</small><strong>{fmt(history.totals.burned)}</strong><span>from logged workouts</span></div>
            <div className="dash-kpi"><small>Calories eaten</small><strong>{fmt(history.totals.calories)}</strong><span>from logged meals</span></div>
            <div className="dash-kpi"><small>Protein · Carbs · Fat</small><strong style={{ fontSize: 22 }}>{fmt(history.totals.protein)} · {fmt(history.totals.carbs)} · {fmt(history.totals.fat)}</strong><span>grams</span></div>
          </div>

          {!hasData && <div className="dash-empty"><h2>Nothing logged in this period</h2><p className="dash-muted">Log workouts and meals in the iPhone or Android app and they will appear in your history and your downloads.</p></div>}

          {hasData && (
            <section className="dash-card">
              <h2>{info.rows}</h2>
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead><tr><th>Period</th><th>Workouts</th><th>Minutes</th><th>Burned</th><th>Eaten (kcal)</th><th>Protein</th><th>Carbs</th><th>Fat</th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.period}><td><strong>{r.period}</strong></td><td>{fmt(r.workouts)}</td><td>{fmt(r.minutes)}</td><td>{fmt(r.burned)}</td><td>{fmt(r.calories)}</td><td>{fmt(r.protein)} g</td><td>{fmt(r.carbs)} g</td><td>{fmt(r.fat)} g</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {hasData && (
            <div className="dash-grid">
              <section className="dash-card">
                <h2>Workout history</h2>
                {history.recentWorkouts.length === 0 ? <p className="dash-muted">No workouts in this period.</p> : (
                  <ul className="dash-list">
                    {history.recentWorkouts.map((w, i) => (
                      <li key={i}><div><strong>{w.exercise}</strong><small>{shortDate(w.at)}</small></div><span className="dash-muted">{fmt(w.minutes)} min · {fmt(w.burned)} kcal</span></li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="dash-card">
                <h2>Meal history</h2>
                {history.recentMeals.length === 0 ? <p className="dash-muted">No meals in this period.</p> : (
                  <ul className="dash-list">
                    {history.recentMeals.map((m, i) => (
                      <li key={i}><div><strong>{m.name}</strong><small>{shortDate(m.at)}{m.mealType ? ` · ${m.mealType}` : ''}</small></div><span className="dash-muted">{fmt(m.calories)} kcal · P {fmt(m.protein)}g</span></li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
          <p className="dash-muted">Showing up to your 25 most recent workouts and meals in this period. The downloads include the full table above.</p>
        </>
      )}
    </>
  );
}
