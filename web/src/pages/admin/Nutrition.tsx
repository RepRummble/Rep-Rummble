import { useState } from 'react';
import { admin, type NutritionReq } from './adminApi';
import AdminNav from './AdminNav';
import { useLoad } from '../business/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { SkeletonPage } from '../../components/states/States';
import '../../styles/dashboard.css';

const blank = { calories: '2200', protein: '150', carbs: '240', fat: '70', water: '8', notes: '', coach: '', meals: [{ name: 'Breakfast', items: '' }, { name: 'Lunch', items: '' }, { name: 'Dinner', items: '' }] };

/** Premium members' requests for a custom nutrition plan. A coach writes the targets and meals, and the member gets them in the app. */
export default function NutritionRequests() {
  usePageMeta({ title: 'Nutrition plans' });
  const [status, setStatus] = useState<'requested' | 'delivered' | 'declined'>('requested');
  const { data, error, loading, reload } = useLoad(() => admin.nutrition.list(status), [status]);
  const [open, setOpen] = useState<{ id: string; kind: 'write' | 'decline' } | null>(null);
  const [form, setForm] = useState(blank);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const kcal = (Number(form.protein) || 0) * 4 + (Number(form.carbs) || 0) * 4 + (Number(form.fat) || 0) * 9;

  const deliver = async (r: NutritionReq) => {
    const res = await admin.nutrition.deliver(r._id, {
      calories: Number(form.calories), protein: Number(form.protein), carbs: Number(form.carbs), fat: Number(form.fat), water: Number(form.water),
      meals: form.meals.filter((m) => m.name.trim() && m.items.trim()), notes: form.notes,
    }, form.coach || undefined);
    setMsg(res.error || 'Delivered. The member was emailed.');
    if (!res.error) { setOpen(null); setForm(blank); reload(); }
  };
  const decline = async (r: NutritionReq) => {
    const res = await admin.nutrition.decline(r._id, reason);
    setMsg(res.error || 'Declined. They can ask again.');
    if (!res.error) { setOpen(null); setReason(''); reload(); }
  };
  const setMeal = (i: number, k: 'name' | 'items', v: string) => setForm((f) => ({ ...f, meals: f.meals.map((m, j) => (j === i ? { ...m, [k]: v } : m)) }));

  return (
    <div className="dash-page">
      <div className="rr-container dash-content" style={{ maxWidth: 960 }}>
        <div className="dash-head"><h1>Custom nutrition plans</h1><p>One a month for each Premium member. Check allergies before you write.</p></div>
        <AdminNav />
        <div className="dash-tabs" role="tablist">
          {(['requested', 'delivered', 'declined'] as const).map((s) => <button key={s} role="tab" aria-selected={status === s} className={status === s ? 'active' : ''} onClick={() => { setStatus(s); setOpen(null); setMsg(''); }}>{s[0].toUpperCase() + s.slice(1)}</button>)}
        </div>
        {msg && <p className="dash-ok" role="status">{msg}</p>}
        {loading ? <SkeletonPage kind="list" label="Loading requests" /> : error ? <p className="dash-error" role="alert">{error}</p> : data && data.length === 0 ? <p className="dash-muted">Nothing here.</p> : data?.map((r) => (
          <article className="dash-card" key={r._id}>
            <div className="dash-card-top"><div><h2>{r.name || r.email || 'Member'}</h2><p className="dash-muted">{r.email}</p></div><small className="dash-muted">{new Date(r.createdAt).toLocaleDateString()}</small></div>
            <p><strong>Goal:</strong> {r.goal}</p>
            <p className="dash-muted">{r.mealsPerDay} meals a day{r.dietPrefs ? ` · ${r.dietPrefs}` : ''}</p>
            {r.allergies && <p><strong>Allergies:</strong> {r.allergies}</p>}
            {r.notes && <p style={{ whiteSpace: 'pre-wrap' }}>{r.notes}</p>}
            {r.plan && <p className="dash-muted">Delivered: {r.plan.calories} kcal · {r.plan.protein} g protein · {r.plan.carbs} g carbs · {r.plan.fat} g fat · {r.plan.meals.length} meals{r.coachName ? ` · ${r.coachName}` : ''}</p>}
            {r.declineReason && <p className="dash-muted">Declined: {r.declineReason}</p>}

            {open?.id === r._id && open.kind === 'write' && (
              <div className="dash-form">
                <div className="dash-form-row">
                  {(['calories', 'protein', 'carbs', 'fat', 'water'] as const).map((k) => <label key={k}>{k === 'water' ? 'Water (glasses)' : k === 'calories' ? 'Calories' : `${k[0].toUpperCase() + k.slice(1)} (g)`}<input className="rr-input" inputMode="numeric" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>)}
                </div>
                <p className="dash-muted">Protein, carbs and fat add up to about {kcal} kcal. It should be close to {form.calories}.</p>
                {form.meals.map((m, i) => (
                  <div className="dash-form-row" key={i}>
                    <label>Meal<input className="rr-input" value={m.name} onChange={(e) => setMeal(i, 'name', e.target.value)} /></label>
                    <label style={{ flex: 3 }}>What to eat<input className="rr-input" value={m.items} onChange={(e) => setMeal(i, 'items', e.target.value)} /></label>
                  </div>
                ))}
                {form.meals.length < 8 && <button className="rr-btn rr-btn-outline" onClick={() => setForm({ ...form, meals: [...form.meals, { name: '', items: '' }] })}>Add a meal</button>}
                <label>Notes for the member<textarea className="rr-input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
                <label>Your name (optional)<input className="rr-input" value={form.coach} onChange={(e) => setForm({ ...form, coach: e.target.value })} /></label>
                <div className="dash-actions"><button className="rr-btn rr-btn-primary" onClick={() => deliver(r)}>Send the plan</button><button className="rr-btn rr-btn-outline" onClick={() => setOpen(null)}>Cancel</button></div>
              </div>
            )}
            {open?.id === r._id && open.kind === 'decline' && (
              <div className="dash-form">
                <label>Why (shown to the member)<textarea className="rr-input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
                <div className="dash-actions"><button className="rr-btn rr-btn-primary" onClick={() => decline(r)}>Decline</button><button className="rr-btn rr-btn-outline" onClick={() => setOpen(null)}>Cancel</button></div>
              </div>
            )}
            {r.status === 'requested' && open?.id !== r._id && (
              <div className="dash-actions">
                <button className="rr-btn rr-btn-primary" onClick={() => setOpen({ id: r._id, kind: 'write' })}>Write the plan</button>
                <button className="rr-btn rr-btn-outline" onClick={() => setOpen({ id: r._id, kind: 'decline' })}>Decline</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
