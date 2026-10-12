import { useState } from 'react';
import { Download, Trash2, UserPlus } from 'lucide-react';
import { biz, downloadCsv, useLoad, type MemberStatus } from './api';
import { useBusiness } from './useBusiness';

const STATUS_LABEL: Record<MemberStatus, string> = { active: 'Active', inactive: 'Inactive', invited: 'Invited' };

export default function Members() {
  const { allowed } = useBusiness();
  const canEdit = allowed('members');
  const members = useLoad(() => biz.members.list(), []);
  const plans = useLoad(() => biz.plans.list(), []);
  const meals = useLoad(() => biz.mealPlans.list(), []);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<MemberStatus | 'all'>('all');
  const [form, setForm] = useState({ name: '', email: '', planId: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const list = members.data ?? [];
  const planName = (id: string | null) => plans.data?.find((p) => p.id === id)?.name ?? '—';
  const rows = list.filter((m) => (status === 'all' || m.status === status) && (!q || `${m.name} ${m.email}`.toLowerCase().includes(q.toLowerCase())));

  const run = async (action: () => Promise<{ error?: string }>) => {
    setError('');
    const res = await action();
    if (res.error) setError(res.error);
    members.reload();
    return !res.error;
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) { setError('Enter a name and a valid email address.'); return; }
    setBusy(true);
    const ok = await run(() => biz.members.create({ name: form.name.trim(), email: form.email.trim(), planId: form.planId || null }));
    setBusy(false);
    if (ok) setForm({ name: '', email: '', planId: '' });
  };

  const exportCsv = () =>
    downloadCsv('members.csv', [
      ['Name', 'Email', 'Status', 'Workout plan', 'Adherence %', 'Sessions this week', 'Days since last session'],
      ...rows.map((m) => [m.name, m.email, STATUS_LABEL[m.status], planName(m.planId), m.adherence ?? '', m.sessionsWeek, m.lastActiveDays ?? '']),
    ]);

  return (
    <>
      <div className="dash-head"><h1>Members</h1><p>Invite people, assign plans, and see who needs a nudge.</p></div>

      {canEdit && (
        <form className="dash-card dash-inline-form" onSubmit={invite} noValidate>
          <h2><UserPlus size={18} /> Invite a member</h2>
          <div className="dash-form-row">
            <label>Name<input value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label>Workout plan
              <select value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
                <option value="">No plan yet</option>
                {plans.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <button className="rr-btn rr-btn-primary" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add member'}</button>
          </div>
          <p className="dash-muted">We don't send an email yet. Ask them to sign up to Reprummble with this address and they will appear as active.</p>
        </form>
      )}
      {error && <p className="dash-error" role="alert">{error}</p>}

      <section className="dash-card">
        <div className="dash-toolbar">
          <input className="dash-search" type="search" placeholder="Search members…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search members" />
          <select value={status} onChange={(e) => setStatus(e.target.value as MemberStatus | 'all')} aria-label="Filter by status">
            <option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="invited">Invited</option>
          </select>
          <button className="rr-btn rr-btn-outline" onClick={exportCsv} disabled={rows.length === 0}><Download size={16} /> Export CSV</button>
        </div>

        {members.loading ? <p className="dash-muted">Loading…</p> : members.error ? <p className="dash-error">{members.error}</p> : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead><tr><th>Member</th><th>Status</th><th>Workout plan</th><th>Meal plan</th><th>Adherence</th><th>Last session</th>{canEdit && <th />}</tr></thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.name}</strong><small>{m.email}</small></td>
                    <td><span className={`dash-pill is-${m.status}`}>{STATUS_LABEL[m.status]}</span></td>
                    <td>{canEdit ? (
                      <select value={m.planId ?? ''} onChange={(e) => run(() => biz.members.update(m.id, { planId: e.target.value || null }))} aria-label={`Workout plan for ${m.name}`}>
                        <option value="">No plan</option>{plans.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>) : planName(m.planId)}</td>
                    <td>{canEdit ? (
                      <select value={m.mealPlanId ?? ''} onChange={(e) => run(() => biz.members.update(m.id, { mealPlanId: e.target.value || null }))} aria-label={`Meal plan for ${m.name}`}>
                        <option value="">No plan</option>{meals.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>) : (meals.data?.find((p) => p.id === m.mealPlanId)?.name ?? '—')}</td>
                    <td>{m.adherence === null ? '—' : (<><div className="dash-meter" aria-label={`${m.adherence}% adherence`}><i style={{ width: `${m.adherence}%` }} /></div><small>{m.adherence}%</small></>)}</td>
                    <td>{m.lastActiveDays === null ? 'Never' : m.lastActiveDays === 0 ? 'Today' : `${m.lastActiveDays}d ago`}</td>
                    {canEdit && <td><button className="dash-icon-btn" onClick={() => window.confirm(`Remove ${m.name}?`) && run(() => biz.members.remove(m.id))} aria-label={`Remove ${m.name}`}><Trash2 size={16} /></button></td>}
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={7} className="dash-muted" style={{ textAlign: 'center', padding: 28 }}>{list.length === 0 ? 'No members yet. Invite your first one above.' : 'No members match.'}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
