import { useState } from 'react';
import { admin, type CheckIn } from './adminApi';
import AdminNav from './AdminNav';
import { useLoad } from '../business/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { SkeletonPage } from '../../components/states/States';
import '../../styles/dashboard.css';

type Mode = { id: string; kind: 'schedule' | 'complete' | 'decline' } | null;

/** Premium members' check-in requests. Staff book them, write the summary afterwards, or decline with a reason. */
export default function CheckIns() {
  usePageMeta({ title: 'Check-ins' });
  const [status, setStatus] = useState<'requested' | 'scheduled' | 'done' | 'declined'>('requested');
  const { data, error, loading, reload } = useLoad(() => admin.checkins.list(status), [status]);
  const [mode, setMode] = useState<Mode>(null);
  const [msg, setMsg] = useState('');
  const [f, setF] = useState({ when: '', link: '', coach: '', summary: '', items: '', reason: '' });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  const done = (r: { error?: string }, ok: string) => { setMsg(r.error || ok); if (!r.error) { setMode(null); setF({ when: '', link: '', coach: '', summary: '', items: '', reason: '' }); reload(); } };
  const submit = async (c: CheckIn) => {
    if (!mode) return;
    if (mode.kind === 'schedule') done(await admin.checkins.schedule(c._id, { scheduledFor: new Date(f.when).toISOString(), meetingLink: f.link, coachName: f.coach || undefined }), 'Booked. The member was emailed.');
    else if (mode.kind === 'complete') done(await admin.checkins.complete(c._id, { summary: f.summary, actionItems: f.items.split('\n').map((x) => x.trim()).filter(Boolean), coachName: f.coach || undefined }), 'Saved. The member was emailed.');
    else done(await admin.checkins.decline(c._id, f.reason), 'Declined. It does not count against their two a month.');
  };

  return (
    <div className="dash-page">
      <div className="rr-container dash-content" style={{ maxWidth: 960 }}>
        <div className="dash-head"><h1>Coach check-ins</h1><p>Premium members get two a month. Book a time, then write them a short summary afterwards.</p></div>
        <AdminNav />
        <div className="dash-tabs" role="tablist">
          {(['requested', 'scheduled', 'done', 'declined'] as const).map((s) => <button key={s} role="tab" aria-selected={status === s} className={status === s ? 'active' : ''} onClick={() => { setStatus(s); setMode(null); setMsg(''); }}>{s[0].toUpperCase() + s.slice(1)}</button>)}
        </div>
        {msg && <p className="dash-ok" role="status">{msg}</p>}
        {loading ? <SkeletonPage kind="list" label="Loading check-ins" /> : error ? <p className="dash-error" role="alert">{error}</p> : data && data.length === 0 ? <p className="dash-muted">Nothing here.</p> : data?.map((c) => (
          <article className="dash-card" key={c._id}>
            <div className="dash-card-top"><div><h2>{c.name || c.email || 'Member'}</h2><p className="dash-muted">{c.email}</p></div><small className="dash-muted">{new Date(c.createdAt).toLocaleDateString()}</small></div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{c.topic}</p>
            {c.preferredTimes && <p className="dash-muted">Prefers: {c.preferredTimes}</p>}
            {c.scheduledFor && <p><strong>{new Date(c.scheduledFor).toLocaleString()}</strong>{c.coachName ? ` with ${c.coachName}` : ''} · <a href={c.meetingLink} target="_blank" rel="noopener noreferrer">meeting link</a></p>}
            {c.summary && <p style={{ whiteSpace: 'pre-wrap' }}>{c.summary}</p>}
            {c.declineReason && <p className="dash-muted">Declined: {c.declineReason}</p>}

            {mode?.id === c._id && (
              <div className="dash-form">
                {mode.kind === 'schedule' && (<>
                  <label>When<input className="rr-input" type="datetime-local" value={f.when} onChange={(e) => set('when', e.target.value)} /></label>
                  <label>Meeting link (https)<input className="rr-input" type="url" placeholder="https://meet.google.com/…" value={f.link} onChange={(e) => set('link', e.target.value)} /></label>
                  <label>Coach name (optional)<input className="rr-input" value={f.coach} onChange={(e) => set('coach', e.target.value)} /></label>
                </>)}
                {mode.kind === 'complete' && (<>
                  <label>Summary for the member<textarea className="rr-input" rows={4} value={f.summary} onChange={(e) => set('summary', e.target.value)} /></label>
                  <label>Action items, one per line<textarea className="rr-input" rows={3} value={f.items} onChange={(e) => set('items', e.target.value)} /></label>
                </>)}
                {mode.kind === 'decline' && <label>Why (shown to the member)<textarea className="rr-input" rows={3} value={f.reason} onChange={(e) => set('reason', e.target.value)} /></label>}
                <div className="dash-actions"><button className="rr-btn rr-btn-primary" onClick={() => submit(c)}>Save</button><button className="rr-btn rr-btn-outline" onClick={() => setMode(null)}>Cancel</button></div>
              </div>
            )}
            {mode?.id !== c._id && (c.status === 'requested' || c.status === 'scheduled') && (
              <div className="dash-actions">
                <button className="rr-btn rr-btn-primary" onClick={() => setMode({ id: c._id, kind: 'schedule' })}>{c.status === 'scheduled' ? 'Reschedule' : 'Book a time'}</button>
                <button className="rr-btn rr-btn-outline" onClick={() => setMode({ id: c._id, kind: 'complete' })}>Write the summary</button>
                {c.status === 'requested' && <button className="rr-btn rr-btn-outline" onClick={() => setMode({ id: c._id, kind: 'decline' })}>Decline</button>}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
