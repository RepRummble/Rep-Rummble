import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DEV_BYPASS_AUTH } from '../../config/devAuth';
import { supabase } from '../../config/supabase';
import api from '../../config/api';
import { useAccountUser, type AccountUser } from './useAccountUser';

const GOALS = ['Weight loss', 'Muscle gain', 'Improve endurance', 'Maintain weight', 'General fitness', 'Injury recovery'];
const ACTIVITY = ['Sedentary (desk job, little movement)', 'Lightly active (1-3 days/week)', 'Moderately active (3-5 days/week)', 'Very active (6-7 days/week)', 'Athlete (2x per day)'];
const DIETS = ['High protein', 'Low sugar', 'No dairy', 'No gluten', 'Vegan', 'Vegetarian', 'Keto', 'Halal', 'Kosher'];
const NOTIFS = [
  { key: 'workout_reminders', label: 'Workout reminders', desc: 'A daily nudge to complete your session' },
  { key: 'weekly_reports', label: 'Weekly progress report', desc: 'A summary every Sunday' },
  { key: 'challenge_updates', label: 'Challenge updates', desc: 'Alerts when challenges start or end' },
  { key: 'recovery_alerts', label: 'Recovery alerts', desc: 'When your readiness is low' },
  { key: 'marketing', label: 'Tips & product news', desc: 'Occasional feature announcements' },
];
const SECTIONS = [
  { id: 'profile', label: 'Profile' }, { id: 'goals', label: 'Goals' }, { id: 'notifications', label: 'Notifications' },
  { id: 'security', label: 'Security' }, { id: 'privacy', label: 'Privacy' }, { id: 'delete', label: 'Delete account' },
] as const;
type SectionId = (typeof SECTIONS)[number]['id'];
type Save = 'idle' | 'saving' | 'saved' | 'error';

function useSaver() {
  const [status, setStatus] = useState<Save>('idle');
  const [error, setError] = useState('');
  const run = async (fn: () => Promise<string | null | undefined>) => {
    setStatus('saving');
    setError('');
    let err: string | null | undefined;
    try { err = await fn(); } catch (e) { err = e instanceof Error ? e.message : 'Something went wrong.'; }
    setStatus(err ? 'error' : 'saved');
    setError(err || '');
    window.setTimeout(() => setStatus('idle'), 2500);
  };
  const label = (idle: string) => (status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : idle);
  return { status, error, run, label };
}

export default function Profile() {
  const { user } = useAccountUser();
  const [section, setSection] = useState<SectionId>('profile');
  if (!user) return <p className="dash-muted">Loading…</p>;

  return (
    <>
      <div className="dash-head"><h1>Profile</h1><p>Your details, goals, and account settings.</p></div>
      <div className="dash-sections" role="tablist">
        {SECTIONS.map((s) => (
          <button key={s.id} role="tab" aria-selected={section === s.id} className={`dash-chip${section === s.id ? ' active' : ''}`} onClick={() => setSection(s.id)}>{s.label}</button>
        ))}
      </div>
      {section === 'profile' && <ProfileSection user={user} />}
      {section === 'goals' && <GoalsSection user={user} />}
      {section === 'notifications' && <NotificationsSection user={user} />}
      {section === 'security' && <SecuritySection user={user} />}
      {section === 'privacy' && <PrivacySection />}
      {section === 'delete' && <DeleteSection user={user} />}
    </>
  );
}

function ProfileSection({ user }: { user: AccountUser }) {
  const [name, setName] = useState(user.name);
  const { error, run, label, status } = useSaver();
  return (
    <section className="dash-card">
      <h2>Profile</h2>
      <div className="dash-form-row">
        <label>Display name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
        <label>Email<input value={user.email} readOnly /></label>
      </div>
      <p className="dash-muted">To change your email, contact <a href="mailto:support@reprummble.com">support@reprummble.com</a>.</p>
      {error && <p className="dash-error" role="alert">{error}</p>}
      <div><button className="rr-btn rr-btn-primary" disabled={status === 'saving'} onClick={() => run(async () => (await api.auth.updateProfile({ displayName: name })).error)}>{label('Save profile')}</button></div>
    </section>
  );
}

function GoalsSection({ user }: { user: AccountUser }) {
  const m = user.metadata;
  const [goal, setGoal] = useState(String(m.goal ?? ''));
  const [activity, setActivity] = useState(String(m.activity ?? ''));
  const [diets, setDiets] = useState<string[]>(Array.isArray(m.diets) ? (m.diets as string[]) : []);
  const { error, run, label, status } = useSaver();
  const toggle = (d: string) => setDiets((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));
  return (
    <section className="dash-card">
      <h2>Goals & preferences</h2>
      <div className="dash-form-row">
        <label>Main goal
          <select value={goal} onChange={(e) => setGoal(e.target.value)}><option value="">Select…</option>{GOALS.map((g) => <option key={g}>{g}</option>)}</select>
        </label>
        <label>Activity level
          <select value={activity} onChange={(e) => setActivity(e.target.value)}><option value="">Select…</option>{ACTIVITY.map((a) => <option key={a}>{a}</option>)}</select>
        </label>
      </div>
      <div><strong style={{ fontSize: 14 }}>Dietary preferences</strong>
        <div className="dash-sections" style={{ marginTop: 8 }}>
          {DIETS.map((d) => <button key={d} type="button" aria-pressed={diets.includes(d)} className={`dash-chip${diets.includes(d) ? ' active' : ''}`} onClick={() => toggle(d)}>{d}</button>)}
        </div>
      </div>
      {error && <p className="dash-error" role="alert">{error}</p>}
      <div><button className="rr-btn rr-btn-primary" disabled={status === 'saving'} onClick={() => run(async () => (await api.auth.updateProfile({ goal, activity, diets })).error)}>{label('Save goals')}</button></div>
    </section>
  );
}

function NotificationsSection({ user }: { user: AccountUser }) {
  const saved = (user.metadata.notifications as Record<string, boolean> | undefined) ?? {};
  const [on, setOn] = useState<Record<string, boolean>>({ workout_reminders: true, weekly_reports: true, challenge_updates: true, recovery_alerts: true, marketing: false, ...saved });
  const { error, run, label, status } = useSaver();
  return (
    <section className="dash-card">
      <h2>Notifications</h2>
      <div>
        {NOTIFS.map(({ key, label: l, desc }) => (
          <div className="dash-row" key={key}>
            <div><strong>{l}</strong><small>{desc}</small></div>
            <button type="button" role="switch" aria-checked={on[key]} aria-label={l} className="dash-toggle" onClick={() => setOn((p) => ({ ...p, [key]: !p[key] }))} />
          </div>
        ))}
      </div>
      {error && <p className="dash-error" role="alert">{error}</p>}
      <div><button className="rr-btn rr-btn-primary" disabled={status === 'saving'} onClick={() => run(async () => (await supabase.auth.updateUser({ data: { notifications: on } })).error?.message)}>{label('Save notifications')}</button></div>
    </section>
  );
}

function SecuritySection({ user }: { user: AccountUser }) {
  const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle');
  const send = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/auth/callback` });
    setState(error ? 'error' : 'sent');
  };
  return (
    <section className="dash-card">
      <h2>Security</h2>
      <p className="dash-muted">We'll email a secure link to {user.email} so you can set a new password.</p>
      <div><button className="rr-btn rr-btn-outline" onClick={send} disabled={state === 'sent'}>Send password reset email</button></div>
      {state === 'sent' && <p className="dash-ok" role="status">Check your inbox for the reset link.</p>}
      {state === 'error' && <p className="dash-error" role="alert">Could not send the email. Please try again.</p>}
    </section>
  );
}

function PrivacySection() {
  const rows = [
    { label: 'Privacy Policy', desc: 'How we collect, use, and protect your data.', to: '/privacy', cta: 'Read policy' },
    { label: 'Request a data export', desc: 'Ask for a copy of everything we hold about you.', to: '/contact', cta: 'Request export' },
    { label: 'Terms of Service', desc: 'The rules for using Reprummble.', to: '/terms', cta: 'Read terms' },
  ];
  return (
    <section className="dash-card">
      <h2>Privacy & data</h2>
      <div>{rows.map((r) => (
        <div className="dash-row" key={r.label}><div><strong>{r.label}</strong><small>{r.desc}</small></div><Link className="rr-btn rr-btn-outline" to={r.to}>{r.cta}</Link></div>
      ))}</div>
    </section>
  );
}

function DeleteSection({ user }: { user: AccountUser }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const remove = async () => {
    setBusy(true);
    setError('');
    const res = await api.auth.deleteAccount();
    if (res.error) {
      setBusy(false);
      setError(`We could not delete your account: ${res.error}. Please try again or email support@reprummble.com.`);
      return;
    }
    if (!DEV_BYPASS_AUTH) await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  return (
    <section className="dash-card dash-danger">
      <h2>Delete account</h2>
      <p className="dash-muted">Permanently removes your account, health data, workout logs, and meal history. This cannot be undone.</p>
      <div><button className="rr-btn dash-btn-danger" onClick={() => setOpen(true)}>Delete my account</button></div>
      {open && (
        <div className="dash-modal" role="dialog" aria-modal="true" aria-labelledby="del-title" onClick={() => !busy && setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <h2 id="del-title" style={{ fontSize: 20 }}>Delete your account?</h2>
            <p className="dash-muted">Type your email address, <strong>{user.email}</strong>, to confirm.</p>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={user.email} autoFocus />
            {error && <p className="dash-error" role="alert">{error}</p>}
            <div className="dash-actions">
              <button className="rr-btn rr-btn-outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
              <button className="rr-btn dash-btn-danger" onClick={remove} disabled={busy || confirm.trim().toLowerCase() !== user.email.toLowerCase()}>{busy ? 'Deleting…' : 'Delete permanently'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
