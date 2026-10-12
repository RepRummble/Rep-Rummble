import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { biz, macroKcal, useLoad } from './api';
import { useBusiness } from './useBusiness';

const EMPTY_PLAN = { name: '', calories: 2000, protein: 150, carbs: 200, fat: 65, mealsPerDay: 4, notes: '' };
const EMPTY_FOOD = { name: '', serving: '100 g', calories: 0, protein: 0, carbs: 0, fat: 0 };

export default function Nutrition() {
  const { allowed } = useBusiness();
  const canEdit = allowed('nutrition');
  const mealPlans = useLoad(() => biz.mealPlans.list(), []);
  const foods = useLoad(() => biz.foods.list(), []);
  const [tab, setTab] = useState<'plans' | 'foods'>('plans');
  const [plan, setPlan] = useState(EMPTY_PLAN);
  const [food, setFood] = useState(EMPTY_FOOD);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const planKcal = macroKcal(plan.protein, plan.carbs, plan.fat);
  const drift = Math.abs(planKcal - plan.calories);

  // Number input bound to one field of a form object; never lets the value go negative.
  const num = <T extends object>(obj: T, set: (v: T) => void, key: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set({ ...obj, [key]: Math.max(0, Number(e.target.value)) });

  const submit = async (action: () => Promise<{ error?: string }>, reset: () => void, reload: () => void) => {
    setBusy(true); setError('');
    const res = await action();
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    reset(); reload();
  };

  const createPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (plan.name.trim().length < 2) { setError('Give the meal plan a name.'); return; }
    if (plan.calories < 800 || plan.calories > 6000) { setError('Calories should be between 800 and 6,000.'); return; }
    submit(() => biz.mealPlans.create({ ...plan, name: plan.name.trim(), notes: plan.notes.trim() }), () => setPlan(EMPTY_PLAN), mealPlans.reload);
  };
  const createFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (food.name.trim().length < 2) { setError('Give the food a name.'); return; }
    submit(() => biz.foods.create({ ...food, name: food.name.trim(), serving: food.serving.trim() || '100 g' }), () => setFood(EMPTY_FOOD), foods.reload);
  };
  const remove = async (action: () => Promise<{ error?: string }>, reload: () => void) => {
    const res = await action();
    if (res.error) setError(res.error);
    reload();
  };

  return (
    <>
      <div className="dash-head"><h1>Nutrition & food</h1><p>Create meal plans with calorie and macro targets, and keep a food library for your clients.</p></div>

      <div className="dash-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'plans'} className={tab === 'plans' ? 'active' : ''} onClick={() => { setTab('plans'); setError(''); }}>Meal plans</button>
        <button role="tab" aria-selected={tab === 'foods'} className={tab === 'foods' ? 'active' : ''} onClick={() => { setTab('foods'); setError(''); }}>Food library</button>
      </div>
      {error && <p className="dash-error" role="alert">{error}</p>}

      {tab === 'plans' ? (
        <>
          {canEdit && (
            <form className="dash-card dash-inline-form" onSubmit={createPlan} noValidate>
              <h2><Plus size={18} /> Create a meal plan</h2>
              <div className="dash-form-row">
                <label>Plan name<input value={plan.name} maxLength={120} onChange={(e) => setPlan({ ...plan, name: e.target.value })} placeholder="e.g. Lean bulk, 2,600 kcal" /></label>
                <label>Calories<input type="number" value={plan.calories} onChange={num(plan, setPlan, 'calories')} /></label>
                <label>Protein (g)<input type="number" value={plan.protein} onChange={num(plan, setPlan, 'protein')} /></label>
                <label>Carbs (g)<input type="number" value={plan.carbs} onChange={num(plan, setPlan, 'carbs')} /></label>
                <label>Fat (g)<input type="number" value={plan.fat} onChange={num(plan, setPlan, 'fat')} /></label>
                <label>Meals / day<input type="number" min={1} max={8} value={plan.mealsPerDay} onChange={num(plan, setPlan, 'mealsPerDay')} /></label>
              </div>
              <p className={drift > 100 ? 'dash-warn' : 'dash-muted'}>
                Macros add up to {planKcal.toLocaleString()} kcal{drift > 100 ? `, ${drift} kcal away from your ${plan.calories.toLocaleString()} kcal target.` : ', matching your target.'}
              </p>
              <label className="dash-full">Notes (optional)
                <textarea value={plan.notes} onChange={(e) => setPlan({ ...plan, notes: e.target.value })} maxLength={500} rows={2} />
              </label>
              <div><button className="rr-btn rr-btn-primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create meal plan'}</button></div>
            </form>
          )}
          <div className="dash-cards">
            {mealPlans.data?.map((p) => (
              <article className="dash-card dash-plan" key={p.id}>
                <div className="dash-plan-top">
                  <span className="dash-pill is-active">{p.mealsPerDay} meals/day</span>
                  {canEdit && <button className="dash-icon-btn" onClick={() => window.confirm(`Delete "${p.name}"?`) && remove(() => biz.mealPlans.remove(p.id), mealPlans.reload)} aria-label={`Delete ${p.name}`}><Trash2 size={16} /></button>}
                </div>
                <h3>{p.name}</h3>
                <p className="dash-macros"><b>{p.calories.toLocaleString()}</b> kcal · P {p.protein}g · C {p.carbs}g · F {p.fat}g</p>
                {p.notes && <p className="dash-muted">{p.notes}</p>}
              </article>
            ))}
            {mealPlans.loading && <p className="dash-muted">Loading…</p>}
            {mealPlans.data?.length === 0 && <p className="dash-muted">No meal plans yet.</p>}
          </div>
        </>
      ) : (
        <>
          {canEdit && (
            <form className="dash-card dash-inline-form" onSubmit={createFood} noValidate>
              <h2><Plus size={18} /> Add a food</h2>
              <div className="dash-form-row">
                <label>Food<input value={food.name} maxLength={120} onChange={(e) => setFood({ ...food, name: e.target.value })} placeholder="e.g. Paneer, cooked" /></label>
                <label>Serving<input value={food.serving} maxLength={40} onChange={(e) => setFood({ ...food, serving: e.target.value })} /></label>
                <label>Calories<input type="number" value={food.calories} onChange={num(food, setFood, 'calories')} /></label>
                <label>Protein (g)<input type="number" step="0.1" value={food.protein} onChange={num(food, setFood, 'protein')} /></label>
                <label>Carbs (g)<input type="number" step="0.1" value={food.carbs} onChange={num(food, setFood, 'carbs')} /></label>
                <label>Fat (g)<input type="number" step="0.1" value={food.fat} onChange={num(food, setFood, 'fat')} /></label>
              </div>
              <div><button className="rr-btn rr-btn-primary" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add food'}</button></div>
            </form>
          )}
          <section className="dash-card">
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead><tr><th>Food</th><th>Serving</th><th>kcal</th><th>Protein</th><th>Carbs</th><th>Fat</th>{canEdit && <th />}</tr></thead>
                <tbody>
                  {foods.data?.map((f) => (
                    <tr key={f.id}>
                      <td><strong>{f.name}</strong></td><td>{f.serving}</td><td>{f.calories}</td><td>{f.protein} g</td><td>{f.carbs} g</td><td>{f.fat} g</td>
                      {canEdit && <td><button className="dash-icon-btn" onClick={() => remove(() => biz.foods.remove(f.id), foods.reload)} aria-label={`Remove ${f.name}`}><Trash2 size={16} /></button></td>}
                    </tr>
                  ))}
                  {foods.data?.length === 0 && <tr><td colSpan={7} className="dash-muted" style={{ textAlign: 'center', padding: 28 }}>No foods yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
