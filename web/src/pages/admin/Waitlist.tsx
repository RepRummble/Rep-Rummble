import { useEffect, useState } from 'react';
import { admin } from './adminApi';
import AdminNav from './AdminNav';
import { useLoad } from '../business/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { SkeletonPage } from '../../components/states/States';
import '../../styles/dashboard.css';

const notAdmin = (e: string) => /admin/i.test(e) ? 'Your account is not listed as staff. Add your verified email to ADMIN_EMAILS on the server.' : e;

/** Everyone who left their email for the apps: totals, where they came from, and the list. Staff only. */
export default function Waitlist() {
  usePageMeta({ title: 'Waitlist' });
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState('');
  const stats = useLoad(() => admin.leads.stats(), []);
  const list = useLoad(() => admin.leads.list({ search: q, source, page }), [q, source, page]);

  // Search waits for a pause in typing.
  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);

  const remove = async (id: string, email: string) => {
    if (!window.confirm(`Remove ${email} from the waitlist? They will not be emailed at launch.`)) return;
    const r = await admin.leads.remove(id);
    setMsg(r.error || 'Removed.'); list.reload(); stats.reload();
  };
  const exportCsv = async () => {
    const { blob, error } = await admin.leads.exportCsv({ search: q, source });
    if (!blob) { setMsg(error || 'Could not export.'); return; }
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'reprummble-waitlist.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const s = stats.data;
  const max = Math.max(1, ...(s?.days.map((d) => d.count) ?? [1]));
  const err = stats.error || list.error;

  return (
    <div className="dash-page">
      <div className="rr-container dash-content" style={{ maxWidth: 1000 }}>
        <div className="dash-head"><h1>Waitlist</h1><p>People who asked to hear when the iPhone and Android apps are out.</p></div>
        <AdminNav />
        {err ? <p className="dash-error" role="alert">{notAdmin(err)}</p> : !s ? <SkeletonPage kind="cards" label="Loading the waitlist" /> : (
          <>
            <div className="dash-kpis">
              <div className="dash-kpi"><small>Total</small><strong>{s.total}</strong><span>on the waitlist</span></div>
              <div className="dash-kpi"><small>Last 7 days</small><strong>{s.last7}</strong><span>new</span></div>
              <div className="dash-kpi"><small>Last 30 days</small><strong>{s.last30}</strong><span>new</span></div>
              <div className="dash-kpi"><small>Top source</small><strong style={{ fontSize: 20 }}>{s.bySource[0]?.source ?? '—'}</strong><span>{s.bySource[0]?.count ?? 0} sign-ups</span></div>
            </div>

            <article className="dash-card">
              <h2>Sign-ups, last 30 days</h2>
              <div className="dash-bars" role="img" aria-label={`${s.last30} sign-ups in the last 30 days`}>
                {s.days.map((d) => <div key={d.date} className="dash-bar" title={`${d.date}: ${d.count}`}><i style={{ height: `${Math.max(d.count ? 8 : 2, (d.count / max) * 100)}%` }} /></div>)}
              </div>
              <div className="dash-chips">
                <button className={`dash-chip${source === '' ? ' active' : ''}`} onClick={() => { setSource(''); setPage(1); }}>All</button>
                {s.bySource.map((b) => <button key={b.source} className={`dash-chip${source === b.source ? ' active' : ''}`} onClick={() => { setSource(b.source); setPage(1); }}>{b.source} · {b.count}</button>)}
              </div>
            </article>

            <article className="dash-card">
              <div className="dash-card-top">
                <input className="rr-input" style={{ maxWidth: 320 }} type="search" placeholder="Search by email" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search by email" />
                <button className="rr-btn rr-btn-outline" onClick={exportCsv}>Export CSV</button>
              </div>
              {msg && <p className="dash-ok" role="status">{msg}</p>}
              {list.loading ? <SkeletonPage kind="list" label="Loading" /> : list.data && list.data.items.length === 0 ? <p className="dash-muted">No one matches.</p> : (
                <table className="dash-table">
                  <thead><tr><th>Email</th><th>Source</th><th>Joined</th><th /></tr></thead>
                  <tbody>
                    {list.data?.items.map((l) => (
                      <tr key={l._id}>
                        <td>{l.email}</td><td>{l.source}</td><td>{new Date(l.createdAt).toLocaleDateString()}</td>
                        <td><button className="rr-btn rr-btn-outline" onClick={() => remove(l._id, l.email)}>Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {list.data && list.data.pages > 1 && (
                <div className="dash-actions">
                  <button className="rr-btn rr-btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                  <span className="dash-muted">Page {list.data.page} of {list.data.pages} · {list.data.total} people</span>
                  <button className="rr-btn rr-btn-outline" disabled={page >= list.data.pages} onClick={() => setPage(page + 1)}>Next</button>
                </div>
              )}
            </article>
          </>
        )}
      </div>
    </div>
  );
}
