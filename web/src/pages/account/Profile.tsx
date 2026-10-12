import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { OAuthGrant } from '@supabase/supabase-js';
import {
  BadgeCheck, Bell, Check, CreditCard, ExternalLink, FileText, KeyRound, Link2, ShieldAlert, Target, Trash2, TriangleAlert, UserRound, X,
} from 'lucide-react';
import { DEV_BYPASS_AUTH } from '../../config/devAuth';
import { supabase } from '../../config/supabase';
import api, { type BillingView } from '../../config/api';
import { biz } from '../business/api';
import { useAccountUser, type AccountUser } from './useAccountUser';
import PaymentMethodManager from './PaymentMethod';

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
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: KeyRound },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'privacy', label: 'Privacy & data', icon: FileText },
  { id: 'delete', label: 'Delete account', icon: Trash2 },
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
  return { status, error, run };
}

/** A settings card: title and description, the content, and an optional footer with the save button. */
function Panel({ title, description, children, footer, danger }: { title: string; description: string; children: ReactNode; footer?: ReactNode; danger?: boolean }) {
  return (
    <section className={`pf-panel${danger ? ' is-danger' : ''}`}>
      <header className="pf-panel-head"><h2>{title}</h2><p>{description}</p></header>
      <div className="pf-panel-body">{children}</div>
      {footer && <footer className="pf-panel-foot">{footer}</footer>}
    </section>
  );
}

function SaveBar({ status, error, onSave, label }: { status: Save; error: string; onSave: () => void; label: string }) {
  return (
    <>
      <span className={`pf-status${status === 'error' ? ' is-error' : ''}`} role={status === 'error' ? 'alert' : 'status'}>
        {status === 'saved' && <><Check size={16} /> Saved</>}
        {status === 'error' && error}
      </span>
      <button className="rr-btn rr-btn-primary" disabled={status === 'saving'} onClick={onSave}>{status === 'saving' ? 'Saving…' : label}</button>
    </>
  );
}

const initialsOf = (user: AccountUser) =>
  (user.name || user.email).split(/[\s@.]+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'RR';

export default function Profile() {
  const { user } = useAccountUser();
  const [params] = useSearchParams();
  const requested = SECTIONS.find((x) => x.id === params.get('section'))?.id;
  const [section, setSection] = useState<SectionId>(requested ?? 'profile');
  if (!user) return <p className="dash-muted">Loading…</p>;

  const since = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null;

  return (
    <div className="pf">
      <header className="pf-hero">
        <span className="pf-avatar" aria-hidden="true">{initialsOf(user)}</span>
        <div className="pf-hero-text">
          <h1>{user.name || 'Your profile'}</h1>
          <p>{user.email}</p>
          <div className="pf-badges">
            {user.emailVerified && <span className="pf-badge is-ok"><BadgeCheck size={14} /> Email verified</span>}
            {since && <span className="pf-badge">Member since {since}</span>}
          </div>
        </div>
      </header>

      <div className="pf-layout">
        <nav className="pf-nav" aria-label="Profile sections" role="tablist">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} role="tab" aria-selected={section === id} className={`pf-nav-item${section === id ? ' active' : ''}${id === 'delete' ? ' is-danger' : ''}`} onClick={() => setSection(id)}>
              <Icon size={18} /> <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="pf-content">
          {section === 'profile' && <ProfileSection user={user} />}
          {section === 'goals' && <GoalsSection user={user} />}
          {section === 'notifications' && <NotificationsSection user={user} />}
          {section === 'security' && <><SecuritySection user={user} /><ConnectedApps /></>}
          {section === 'payment' && <PaymentSection />}
          {section === 'privacy' && <PrivacySection />}
          {section === 'delete' && <DeleteSection user={user} />}
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ user }: { user: AccountUser }) {
  const [name, setName] = useState(user.name);
  const { error, run, status } = useSaver();
  return (
    <Panel title="Personal details" description="How you appear in Reprummble." footer={<SaveBar status={status} error={error} label="Save changes" onSave={() => run(async () => (await api.auth.updateProfile({ displayName: name })).error)} />}>
      <div className="pf-grid">
        <label className="pf-field">Display name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Your name" />
        </label>
        <label className="pf-field">Email address
          <input value={user.email} readOnly />
          <small>To change it, email <a href="mailto:support@reprummble.com">support@reprummble.com</a>.</small>
        </label>
      </div>
    </Panel>
  );
}

function GoalsSection({ user }: { user: AccountUser }) {
  const m = user.metadata;
  const [goal, setGoal] = useState(String(m.goal ?? ''));
  const [activity, setActivity] = useState(String(m.activity ?? ''));
  const [diets, setDiets] = useState<string[]>(Array.isArray(m.diets) ? (m.diets as string[]) : []);
  const { error, run, status } = useSaver();
  const toggle = (d: string) => setDiets((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));
  return (
    <Panel title="Goals & preferences" description="We use these to tailor your plan and targets." footer={<SaveBar status={status} error={error} label="Save goals" onSave={() => run(async () => (await api.auth.updateProfile({ goal, activity, diets })).error)} />}>
      <div className="pf-group">
        <h3>Main goal</h3>
        <div className="pf-choices" role="radiogroup" aria-label="Main goal">
          {GOALS.map((g) => (
            <button key={g} type="button" role="radio" aria-checked={goal === g} className={`pf-choice${goal === g ? ' active' : ''}`} onClick={() => setGoal(g)}>
              {goal === g && <Check size={16} />} {g}
            </button>
          ))}
        </div>
      </div>
      <div className="pf-group">
        <h3>Activity level</h3>
        <label className="pf-field"><select value={activity} onChange={(e) => setActivity(e.target.value)} aria-label="Activity level"><option value="">Select…</option>{ACTIVITY.map((a) => <option key={a}>{a}</option>)}</select></label>
      </div>
      <div className="pf-group">
        <h3>Dietary preferences</h3>
        <div className="pf-choices">
          {DIETS.map((d) => (
            <button key={d} type="button" aria-pressed={diets.includes(d)} className={`pf-choice${diets.includes(d) ? ' active' : ''}`} onClick={() => toggle(d)}>
              {diets.includes(d) && <Check size={16} />} {d}
            </button>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function NotificationsSection({ user }: { user: AccountUser }) {
  const saved = (user.metadata.notifications as Record<string, boolean> | undefined) ?? {};
  const [on, setOn] = useState<Record<string, boolean>>({ workout_reminders: true, weekly_reports: true, challenge_updates: true, recovery_alerts: true, marketing: false, ...saved });
  const { error, run, status } = useSaver();
  return (
    <Panel title="Notifications" description="Choose what we send you." footer={<SaveBar status={status} error={error} label="Save preferences" onSave={() => run(async () => (await supabase.auth.updateUser({ data: { notifications: on } })).error?.message)} />}>
      <div className="pf-rows">
        {NOTIFS.map(({ key, label, desc }) => (
          <div className="pf-row" key={key}>
            <div><strong>{label}</strong><small>{desc}</small></div>
            <button type="button" role="switch" aria-checked={on[key]} aria-label={label} className="dash-toggle" onClick={() => setOn((p) => ({ ...p, [key]: !p[key] }))} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SecuritySection({ user }: { user: AccountUser }) {
  const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle');
  const send = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/auth/callback` });
    setState(error ? 'error' : 'sent');
  };
  return (
    <Panel title="Sign-in & security" description="Keep your account safe.">
      <div className="pf-rows">
        <div className="pf-row">
          <div><strong>Password</strong><small>We'll email a secure link to {user.email} so you can set a new one.</small></div>
          <button className="rr-btn rr-btn-outline" onClick={send} disabled={state === 'sent'}>{state === 'sent' ? 'Email sent' : 'Send reset email'}</button>
        </div>
        <div className="pf-row">
          <div><strong>Email verification</strong><small>{user.emailVerified ? 'Your email address is verified.' : 'Your email address is not verified yet.'}</small></div>
          <span className={`pf-badge${user.emailVerified ? ' is-ok' : ''}`}>{user.emailVerified ? <><BadgeCheck size={14} /> Verified</> : 'Not verified'}</span>
        </div>
      </div>
      {state === 'sent' && <p className="pf-status" role="status"><Check size={16} /> Check your inbox for the reset link.</p>}
      {state === 'error' && <p className="pf-status is-error" role="alert">Could not send the email. Please try again.</p>}
    </Panel>
  );
}

/** Apps the person has allowed to sign in with their Reprummble account. Hidden if the OAuth server is off. */
function ConnectedApps() {
  const [grants, setGrants] = useState<OAuthGrant[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    supabase.auth.oauth.listGrants().then(({ data }) => { if (!cancelled) setGrants(data ?? null); });
    return () => { cancelled = true; };
  }, []);

  if (!grants) return null; // loading, or the OAuth server is not enabled
  const revoke = async (g: OAuthGrant) => {
    if (!window.confirm(`Disconnect ${g.client.name}? It will stop being able to sign you in.`)) return;
    setError('');
    const { error: err } = await supabase.auth.oauth.revokeGrant({ clientId: g.client.id });
    if (err) { setError('Could not disconnect the app. Please try again.'); return; }
    setGrants((prev) => (prev ?? []).filter((x) => x.client.id !== g.client.id));
  };

  return (
    <Panel title="Connected apps" description="Apps you have allowed to sign in with your Reprummble account.">
      {grants.length === 0 ? <p className="dash-muted">No apps connected.</p> : (
        <div className="pf-rows">
          {grants.map((g) => (
            <div className="pf-row" key={g.client.id}>
              <div><strong><Link2 size={14} /> {g.client.name}</strong><small>Can: {g.scopes.join(', ')} · since {new Date(g.granted_at).toLocaleDateString()}</small></div>
              <button className="rr-btn rr-btn-outline" onClick={() => revoke(g)}>Disconnect</button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="pf-status is-error" role="alert">{error}</p>}
    </Panel>
  );
}

function PaymentSection() {
  const [billing, setBilling] = useState<BillingView | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    api.billing.get().then(({ data, error: err }) => {
      if (cancelled) return;
      if (data) setBilling(data); else setError(err || 'Could not load your payment details.');
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <Panel title="Payment method" description="The card used to renew your plan. Change your plan or turn auto-renew on or off in Billing.">
      {billing ? <PaymentMethodManager billing={billing} onChange={setBilling} /> : error ? <p className="pf-status is-error" role="alert">{error}</p> : <p className="dash-muted">Loading…</p>}
      <p className="dash-muted"><Link to="/dashboard/billing">Go to Billing</Link> to see your plan and renewal date.</p>
    </Panel>
  );
}

function PrivacySection() {
  const rows = [
    { label: 'Privacy Policy', desc: 'How we collect, use, and protect your data.', to: '/privacy', cta: 'Read policy' },
    { label: 'Request a data export', desc: 'Ask for a copy of everything we hold about you. You can also download your reports from the Reports page.', to: '/contact', cta: 'Request export' },
    { label: 'Terms of Service', desc: 'The rules for using Reprummble.', to: '/terms', cta: 'Read terms' },
  ];
  return (
    <Panel title="Privacy & data" description="Your rights over the data we hold.">
      <div className="pf-rows">
        {rows.map((r) => (
          <div className="pf-row" key={r.label}>
            <div><strong>{r.label}</strong><small>{r.desc}</small></div>
            <Link className="rr-btn rr-btn-outline" to={r.to}>{r.cta} <ExternalLink size={14} /></Link>
          </div>
        ))}
      </div>
    </Panel>
  );
}

const WILL_DELETE = [
  'Your account and sign-in',
  'Your workouts, meals, and wearable readings',
  'Your referral link, rewards, and friend connections',
  'Anything you sent us through the contact form',
];

function DeleteSection({ user }: { user: AccountUser }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ownsBusiness, setOwnsBusiness] = useState(false);

  // People who run a business lose that business too, so tell them before they confirm.
  useEffect(() => {
    let cancelled = false;
    biz.me().then((res) => { if (!cancelled) setOwnsBusiness(res.data?.business != null && res.data?.role === 'Owner'); });
    return () => { cancelled = true; };
  }, []);

  const close = () => { if (busy) return; setOpen(false); setConfirm(''); setError(''); };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const matches = confirm.trim().toLowerCase() === user.email.toLowerCase();

  const remove = async () => {
    setBusy(true);
    setError('');
    const res = await api.auth.deleteAccount();
    if (res.error) {
      setBusy(false);
      setError(res.error);
      return;
    }
    // The server has already closed the sign-in, so just clear this browser's copy of the session.
    if (!DEV_BYPASS_AUTH) await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    navigate('/', { replace: true });
  };

  return (
    <Panel danger title="Delete account" description="Permanently remove your account and everything in it.">
      <div className="pf-warning"><ShieldAlert size={20} /><div><strong>This cannot be undone.</strong><p>Deleting your account removes all of the following straight away:</p></div></div>
      <ul className="pf-delete-list">
        {WILL_DELETE.map((item) => <li key={item}><X size={14} /> {item}</li>)}
        {ownsBusiness && <li className="is-strong"><TriangleAlert size={14} /> Your business, its members, plans, foods, and team</li>}
      </ul>
      <p className="dash-muted">Want a copy first? Download your history from the Reports page before you delete.</p>
      <div><button className="rr-btn pf-btn-danger" onClick={() => setOpen(true)}>Delete my account…</button></div>

      {open && (
        <div className="dash-modal" role="dialog" aria-modal="true" aria-labelledby="del-title" onClick={close}>
          <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
            <span className="pf-modal-icon"><Trash2 size={22} /></span>
            <h2 id="del-title">Delete your account?</h2>
            <p>This permanently deletes your Reprummble account and data.{ownsBusiness ? ' It also deletes your business and everything in it.' : ''} There is no way to get it back.</p>
            <label className="pf-field">
              <span>Type <strong>{user.email}</strong> to confirm</span>
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={user.email} autoFocus autoComplete="off" spellCheck={false} />
            </label>
            {error && <p className="pf-status is-error" role="alert">{error}</p>}
            <div className="pf-modal-actions">
              <button className="rr-btn rr-btn-outline" onClick={close} disabled={busy}>Keep my account</button>
              <button className="rr-btn pf-btn-danger" onClick={remove} disabled={busy || !matches}>{busy ? 'Deleting…' : 'Delete permanently'}</button>
            </div>
            {!matches && <small className="dash-muted">The delete button turns on once your email matches exactly.</small>}
          </div>
        </div>
      )}
    </Panel>
  );
}
