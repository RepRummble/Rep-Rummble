import { useState } from 'react';
import { Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../config/api';

const REPORTS = [
  { period: 'monthly', title: 'Last 30 days', desc: 'One row per day: workouts, minutes, calories, and macros.' },
  { period: 'yearly', title: 'Last 12 months', desc: 'One row per month, so you can see the trend.' },
  { period: 'historical', title: 'All time', desc: 'One row per year, for everything you have logged.' },
] as const;

type Period = (typeof REPORTS)[number]['period'];

export default function Reports() {
  const [busy, setBusy] = useState<Period | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const download = async (period: Period) => {
    setBusy(period);
    setMessage(null);
    const { blob, error } = await api.reports.download(period);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reprummble-${period}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ ok: true, text: 'Report downloaded.' });
    } else {
      setMessage({ ok: false, text: error || 'Download failed. Please try again.' });
    }
    setBusy(null);
  };

  return (
    <>
      <div className="dash-head"><h1>Reports</h1><p>Download your own workouts and meals to share with a doctor or coach, or keep for yourself. Dates are in UTC.</p></div>

      <div className="dash-cards">
        {REPORTS.map((r) => (
          <article className="dash-card" key={r.period}>
            <h2>{r.title}</h2>
            <p className="dash-muted">{r.desc}</p>
            <div><button className="rr-btn rr-btn-outline" onClick={() => download(r.period)} disabled={busy !== null}>
              <Download size={16} /> {busy === r.period ? 'Preparing…' : 'Download CSV'}
            </button></div>
          </article>
        ))}
      </div>

      {message && <div className={message.ok ? 'rr-msg-ok' : 'rr-msg-err'} role="status">{message.text}</div>}
      <p className="dash-muted">PDF progress reports are included with <Link className="rr-link-arrow" to="/pricing">Premium</Link>.</p>
    </>
  );
}
