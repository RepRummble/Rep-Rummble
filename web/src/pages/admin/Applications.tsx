import { useLayoutEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { biz, useLoad } from '../business/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import '../../styles/dashboard.css';

/** Review screen for business applications. Only emails listed in ADMIN_EMAILS on the server can use it. */
export default function Applications() {
  usePageMeta({ title: 'Business applications' });
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const { data, error, loading, reload } = useLoad(() => biz.admin.list(status), [status]);
  const [message, setMessage] = useState('');

  useLayoutEffect(() => {
    document.documentElement.classList.add('theme-light');
    return () => document.documentElement.classList.remove('theme-light');
  }, []);

  const approve = async (id: string) => {
    const res = await biz.admin.approve(id);
    setMessage(res.error || 'Approved.');
    reload();
  };
  const revoke = async (id: string, name: string) => {
    const reason = window.prompt(`Turn off ${name}'s access? Reason (shown to the owner):`, '');
    if (reason === null) return;
    const res = await biz.admin.revoke(id, reason);
    setMessage(res.error || 'Access revoked.');
    reload();
  };
  const reject = async (id: string) => {
    const reason = window.prompt('Reason for rejecting (shown to the applicant):', '');
    if (reason === null) return;
    const res = await biz.admin.reject(id, reason);
    setMessage(res.error || 'Rejected.');
    reload();
  };

  return (
    <div className="dash-gate" style={{ alignItems: 'start' }}>
      <div style={{ width: 'min(960px, 100%)', display: 'grid', gap: 16 }}>
        <div className="dash-head"><h1>Business applications</h1><p><Link to="/" className="rr-link-arrow">← Back to website</Link></p></div>
        <div className="dash-tabs" role="tablist">
          {(['pending', 'approved', 'rejected'] as const).map((s) => (
            <button key={s} role="tab" aria-selected={status === s} className={status === s ? 'active' : ''} onClick={() => { setStatus(s); setMessage(''); }}>{s[0].toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
        {message && <p className="dash-ok" role="status">{message}</p>}
        {loading ? <p className="dash-muted">Loading…</p> : error ? (
          <p className="dash-error" role="alert">{/admin/i.test(error) ? 'Your account is not listed as a reviewer. Add your email to ADMIN_EMAILS on the server.' : error}</p>
        ) : data && data.length === 0 ? <p className="dash-muted">No {status} applications.</p> : (
          data?.map((a) => (
            <article className="dash-card" key={a.id}>
              <div className="dash-card-top">
                <div><h2>{a.name}</h2><p className="dash-muted">{a.type}{a.city ? ` · ${a.city}` : ''}{a.size ? ` · ${a.size} members` : ''}</p></div>
                <small className="dash-muted">{new Date(a.createdAt).toLocaleDateString()}</small>
              </div>
              <p className="dash-muted">Account: {a.ownerEmail}{a.contactEmail && a.contactEmail !== a.ownerEmail ? ` · Contact: ${a.contactEmail}` : ''}</p>
              {a.message && <p style={{ whiteSpace: 'pre-wrap' }}>{a.message}</p>}
              {status === 'approved' && (
                <div className="dash-actions"><button className="rr-btn rr-btn-outline" onClick={() => revoke(a.id, a.name)}>Revoke access</button></div>
              )}
              {status === 'pending' && (
                <div className="dash-actions">
                  <button className="rr-btn rr-btn-primary" onClick={() => approve(a.id)}>Approve</button>
                  <button className="rr-btn rr-btn-outline" onClick={() => reject(a.id)}>Reject</button>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
