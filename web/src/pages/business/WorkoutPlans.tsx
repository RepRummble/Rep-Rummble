import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { biz, useLoad, type WorkoutPlan } from './api';
import { useBusiness } from './useBusiness';

const EMPTY = { name: '', goal: 'Get stronger', level: 'Beginner' as WorkoutPlan['level'], weeks: 6, daysPerWeek: 3, notes: '' };

export default function WorkoutPlans() {
  const { allowed } = useBusiness();
  const canEdit = allowed('plans');
  const plans = useLoad(() => biz.plans.list(), []);
  const members = useLoad(() => biz.members.list(), []);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) { setError('Give the plan a name.'); return; }
    if (form.weeks < 1 || form.weeks > 52 || form.daysPerWeek < 1 || form.daysPerWeek > 7) { setError('Use 1–52 weeks and 1–7 days per week.'); return; }
    setBusy(true); setError('');
    const res = await biz.plans.create({ ...form, name: form.name.trim(), notes: form.notes.trim() });
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    setForm(EMPTY);
    plans.reload();
  };

  const remove = async (p: WorkoutPlan) => {
    if (!window.confirm(`Delete "${p.name}"? Members using it will be left without a plan.`)) return;
    const res = await biz.plans.remove(p.id);
    if (res.error) setError(res.error);
    plans.reload(); members.reload();
  };

  const assigned = (id: string) => members.data?.filter((m) => m.planId === id).length ?? 0;

  return (
    <>
      <div className="dash-head"><h1>Workout plans</h1><p>Build a plan once, then assign it to members from the Members page.</p></div>

      {canEdit && (
        <form className="dash-card dash-inline-form" onSubmit={create} noValidate>
          <h2><Plus size={18} /> Create a workout plan</h2>
          <div className="dash-form-row">
            <label>Plan name<input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Summer Shred" /></label>
            <label>Goal
              <select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
                {['Lose fat', 'Build muscle', 'Get stronger', 'Improve fitness', 'Move better', 'Rehab & mobility'].map((g) => <option key={g}>{g}</option>)}
              </select>
            </label>
            <label>Level
              <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as WorkoutPlan['level'] })}>
                <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
              </select>
            </label>
            <label>Weeks<input type="number" min={1} max={52} value={form.weeks} onChange={(e) => setForm({ ...form, weeks: Number(e.target.value) })} /></label>
            <label>Days / week<input type="number" min={1} max={7} value={form.daysPerWeek} onChange={(e) => setForm({ ...form, daysPerWeek: Number(e.target.value) })} /></label>
          </div>
          <label className="dash-full">Notes for members (optional)
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} rows={2} />
          </label>
          <div><button className="rr-btn rr-btn-primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create plan'}</button></div>
        </form>
      )}
      {error && <p className="dash-error" role="alert">{error}</p>}

      {plans.loading ? <p className="dash-muted">Loading…</p> : (
        <div className="dash-cards">
          {plans.data?.map((p) => (
            <article className="dash-card dash-plan" key={p.id}>
              <div className="dash-plan-top">
                <span className="dash-pill is-active">{p.level}</span>
                {canEdit && <button className="dash-icon-btn" onClick={() => remove(p)} aria-label={`Delete ${p.name}`}><Trash2 size={16} /></button>}
              </div>
              <h3>{p.name}</h3>
              <p className="dash-muted">{p.goal} · {p.weeks} weeks · {p.daysPerWeek} days/week</p>
              {p.notes && <p>{p.notes}</p>}
              <small className="dash-muted">{assigned(p.id)} {assigned(p.id) === 1 ? 'member' : 'members'} assigned</small>
            </article>
          ))}
          {plans.data?.length === 0 && <p className="dash-muted">No plans yet.{canEdit ? ' Create your first one above.' : ''}</p>}
        </div>
      )}
    </>
  );
}
