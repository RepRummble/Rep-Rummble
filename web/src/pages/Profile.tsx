import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import api from '../config/api';

const GOAL_OPTIONS = ['Weight loss', 'Muscle gain', 'Improve endurance', 'Maintain weight', 'General fitness', 'Injury recovery'];
const ACTIVITY_OPTIONS = ['Sedentary (desk job, little movement)', 'Lightly active (1-3 days/week)', 'Moderately active (3-5 days/week)', 'Very active (6-7 days/week)', 'Athlete (2x per day)'];
const DEVICE_CATALOG = ['Apple Watch', 'Oura Ring', 'Garmin', 'Whoop', 'Fitbit', 'Polar'];
const DIET_OPTIONS = ['High protein', 'Low sugar', 'No dairy', 'No gluten', 'Vegan', 'Vegetarian', 'Keto', 'Halal', 'Kosher'];
const NOTIF_KEYS = [
  { key: 'workout_reminders', label: 'Workout reminders', desc: 'Daily nudge to complete your session' },
  { key: 'weekly_reports', label: 'Weekly progress report', desc: 'Summary every Sunday' },
  { key: 'challenge_updates', label: 'Challenge updates', desc: 'Alerts when challenges start or end' },
  { key: 'recovery_alerts', label: 'Recovery alerts', desc: 'Flagged when readiness is low' },
  { key: 'marketing', label: 'Tips & product news', desc: 'Occasional feature announcements' },
];

const NAV_ITEMS = [
  { id: 'profile',       icon: '👤', label: 'Profile' },
  { id: 'security',      icon: '🔐', label: 'Security' },
  { id: 'goals',         icon: '🎯', label: 'Goals' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'devices',       icon: '⌚', label: 'Devices' },
  { id: 'privacy',       icon: '🔒', label: 'Privacy' },
  { id: 'danger',        icon: '⚠️', label: 'Delete account' },
];

type Save = 'idle' | 'loading' | 'success' | 'error';

export default function Profile() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('profile');

  // Profile
  const [avatar, setAvatar] = useState<string | null>(null);
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [profileStatus, setProfileStatus] = useState<Save>('idle');

  // Security
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  // Goals
  const [goal, setGoal] = useState('');
  const [activity, setActivity] = useState('');
  const [diets, setDiets] = useState<string[]>([]);
  const [goalsStatus, setGoalsStatus] = useState<Save>('idle');
  const [goalsError, setGoalsError] = useState<string | null>(null);

  // Notifications
  const [notifs, setNotifs] = useState<Record<string, boolean>>({
    workout_reminders: true, weekly_reports: true, challenge_updates: true,
    recovery_alerts: true, marketing: false,
  });
  const [notifStatus, setNotifStatus] = useState<Save>('idle');

  // Devices
  const [devices, setDevices] = useState<{ name: string; lastSync: string }[]>([]);
  const [newDevice, setNewDevice] = useState('');

  // Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const m = user.user_metadata || {};
      setProfile({ name: m.displayName || m.full_name || '', email: user.email || '' });
      setGoal(m.goal || '');
      setActivity(m.activity || '');
      setDiets(m.diets || []);
      setNotifs((p) => ({ ...p, ...(m.notifications || {}) }));
      setDevices(m.devices || []);
    });
  }, []);


  // Helpers
  const initials = profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'RR';

  const saveBtn = (status: Save, label: string) =>
    status === 'loading' ? 'Saving…' : status === 'success' ? '✓ Saved' : label;

  // Saves
  const saveProfile = async () => {
    setProfileStatus('loading');
    try {
      const res = await api.auth.updateProfile({ displayName: profile.name });
      setProfileStatus(res.error ? 'error' : 'success');
    } catch (err) {
      setProfileStatus('error');
    } finally {
      setTimeout(() => setProfileStatus('idle'), 2500);
    }
  };

  const sendPasswordReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setPasswordStatus(error ? 'error' : 'sent');
  };

  const saveGoals = async () => {
    setGoalsStatus('loading');
    try {
      setGoalsError(null);
      // Use backend API to update profile metadata (reliable for admin updates)
      const res = await api.auth.updateProfile({ goal, activity, diets });
      if (res.error) {
        console.error('Failed to save goals (API):', res.error);
        setGoalsError(res.error);
        setGoalsStatus('error');
      } else {
        setGoalsStatus('success');
      }
    } catch (err: any) {
      console.error('Unexpected error saving goals:', err);
      setGoalsError(err?.message || String(err));
      setGoalsStatus('error');
    } finally {
      setTimeout(() => setGoalsStatus('idle'), 2500);
    }
  };

  const saveNotifs = async () => {
    setNotifStatus('loading');
    const { error } = await supabase.auth.updateUser({ data: { notifications: notifs } });
    setNotifStatus(error ? 'error' : 'success');
    setTimeout(() => setNotifStatus('idle'), 2500);
  };

  const toggleDiet = (t: string) =>
    setDiets((p) => p.includes(t) ? p.filter((d) => d !== t) : [...p, t]);

  const addDevice = async () => {
    if (!newDevice) return;
    const updated = [...devices, { name: newDevice, lastSync: 'Just now' }];
    setDevices(updated);
    setNewDevice('');
    await supabase.auth.updateUser({ data: { devices: updated } });
  };

  const removeDevice = async (name: string) => {
    const updated = devices.filter((d) => d.name !== name);
    setDevices(updated);
    await supabase.auth.updateUser({ data: { devices: updated } });
  };

  // Delete — always signs user out regardless of backend result
  const handleDelete = async () => {
    if (deleteConfirm !== profile.email) return;
    setDeleteStatus('loading');
    // Attempt backend deletion (best-effort — data purge happens server-side)
    await api.auth.deleteAccount().catch(() => null);
    // Always sign out and redirect
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeleteConfirm('');
    setDeleteReason('');
    setDeleteStatus('idle');
  };

  const availableDevices = DEVICE_CATALOG.filter((d) => !devices.some((x) => x.name === d));

  return (
    <div className="sp-root">
      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside className="sp-sidebar">
        <div className="sp-sidebar-inner">
          <div className="sp-user-block">
            <div className="sp-user-avatar">{avatar ? <img src={avatar} alt="" /> : initials}</div>
            <div>
              <div className="sp-user-name">{profile.name || 'Your account'}</div>
              <div className="sp-user-email">{profile.email}</div>
            </div>
          </div>
          <nav className="sp-nav">
            {NAV_ITEMS.map(({ id, icon, label }) => (
              <button
                key={id}
                className={`sp-nav-item${activeSection === id ? ' active' : ''}${id === 'danger' ? ' danger' : ''}`}
                onClick={() => setActiveSection(id)}
              >
                <span className="sp-nav-icon">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* ── CONTENT ─────────────────────────────────────── */}
      <div className="sp-content">

        {/* Profile */}
        {activeSection === 'profile' && <section className="sp-card" id="profile">
          <div className="sp-card-head">
            <div className="sp-card-icon">👤</div>
            <div>
              <h2>Profile</h2>
              <p>Your public name and photo.</p>
            </div>
          </div>
          <div className="sp-card-body">
            <div className="sp-avatar-row">
              <div className="sp-avatar-lg">{avatar ? <img src={avatar} alt="" /> : initials}</div>
              <div className="sp-avatar-actions">
                <label className="sp-outline-btn" style={{ cursor: 'pointer' }}>
                  Upload photo
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setAvatar(URL.createObjectURL(f)); }} />
                </label>
                {avatar && <button className="sp-text-btn" onClick={() => setAvatar(null)}>Remove</button>}
                <span className="sp-hint">JPG or PNG · max 2 MB</span>
              </div>
            </div>
            <div className="sp-fields">
              <label className="sp-field">
                <span>Display name</span>
                <input className="sp-input" value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Your name" />
              </label>
              <label className="sp-field">
                <span>Email address <em className="sp-badge">read-only</em></span>
                <input className="sp-input" type="email" value={profile.email} readOnly />
                <span className="sp-hint">To change your email contact support@reprummble.com</span>
              </label>
            </div>
            <div className="sp-footer">
              <button className="sp-primary-btn" onClick={saveProfile} disabled={profileStatus === 'loading'}>
                {saveBtn(profileStatus, 'Save profile')}
              </button>
              {profileStatus === 'error' && <span className="sp-error">Save failed — try again.</span>}
            </div>
          </div>
        </section>}

        {/* Security */}
        {activeSection === 'security' && <section className="sp-card" id="security">
          <div className="sp-card-head">
            <div className="sp-card-icon">🔐</div>
            <div>
              <h2>Security</h2>
              <p>Password and sign-in methods.</p>
            </div>
          </div>
          <div className="sp-card-body">
            <div className="sp-row">
              <div className="sp-row-info">
                <strong>Password</strong>
                <span className="sp-hint">We'll email a reset link to {profile.email || 'you'}.</span>
              </div>
              <button className="sp-outline-btn" onClick={sendPasswordReset}>Send reset link</button>
            </div>
            {passwordStatus === 'sent' && <p className="sp-success">Reset email sent — check your inbox.</p>}
            {passwordStatus === 'error' && <p className="sp-error">Failed to send. Try again.</p>}

            <div className="sp-divider" />

            <div className="sp-row">
              <div className="sp-row-info">
                <strong>Connected providers</strong>
                <span className="sp-hint">OAuth sign-in via these services is enabled.</span>
              </div>
              <div className="sp-chips">
                <span className="sp-chip">Google</span>
                <span className="sp-chip">Apple</span>
              </div>
            </div>
          </div>
        </section>}

        {/* Goals */}
        {activeSection === 'goals' && <section className="sp-card" id="goals">
          <div className="sp-card-head">
            <div className="sp-card-icon">🎯</div>
            <div>
              <h2>Goals & preferences</h2>
              <p>Used to personalise your training and nutrition plan.</p>
            </div>
          </div>
          <div className="sp-card-body">
            <div className="sp-fields sp-fields-2col">
              <label className="sp-field">
                <span>Primary goal</span>
                <select className="sp-input" value={goal} onChange={(e) => setGoal(e.target.value)}>
                  <option value="">Select a goal…</option>
                  {GOAL_OPTIONS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </label>
              <label className="sp-field">
                <span>Activity level</span>
                <select className="sp-input" value={activity} onChange={(e) => setActivity(e.target.value)}>
                  <option value="">Select level…</option>
                  {ACTIVITY_OPTIONS.map((a) => <option key={a}>{a}</option>)}
                </select>
              </label>
            </div>
            <div className="sp-field">
              <span>Dietary preferences</span>
              <div className="sp-tags">
                {DIET_OPTIONS.map((t) => (
                  <button key={t} type="button"
                    className={`sp-tag${diets.includes(t) ? ' on' : ''}`}
                    onClick={() => toggleDiet(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className="sp-footer">
              <button className="sp-primary-btn" onClick={saveGoals} disabled={goalsStatus === 'loading'}>
                {saveBtn(goalsStatus, 'Save goals')}
              </button>
              {goalsStatus === 'error' && <span className="sp-error">Save failed — try again.</span>}
              {goalsError && <div className="sp-error" style={{ marginTop: 8 }}>{goalsError}</div>}
            </div>
          </div>
        </section>}

        {/* Notifications */}
        {activeSection === 'notifications' && <section className="sp-card" id="notifications">
          <div className="sp-card-head">
            <div className="sp-card-icon">🔔</div>
            <div>
              <h2>Notifications</h2>
              <p>Control which emails Reprummble sends you.</p>
            </div>
          </div>
          <div className="sp-card-body">
            <div className="sp-notif-list">
              {NOTIF_KEYS.map(({ key, label, desc }) => (
                <div className="sp-notif-row" key={key}>
                  <div>
                    <strong>{label}</strong>
                    <span className="sp-hint">{desc}</span>
                  </div>
                  <button
                    type="button"
                    className={`sp-toggle${notifs[key] ? ' on' : ''}`}
                    onClick={() => setNotifs((p) => ({ ...p, [key]: !p[key] }))}
                    aria-label={notifs[key] ? 'Disable' : 'Enable'}
                  >
                    <span className="sp-toggle-knob" />
                  </button>
                </div>
              ))}
            </div>
            <div className="sp-footer">
              <button className="sp-primary-btn" onClick={saveNotifs} disabled={notifStatus === 'loading'}>
                {saveBtn(notifStatus, 'Save preferences')}
              </button>
              {notifStatus === 'error' && <span className="sp-error">Save failed — try again.</span>}
            </div>
          </div>
        </section>}

        {/* Devices */}
        {activeSection === 'devices' && <section className="sp-card" id="devices">
          <div className="sp-card-head">
            <div className="sp-card-icon">⌚</div>
            <div>
              <h2>Connected devices</h2>
              <p>Wearables that sync data into your dashboard.</p>
            </div>
          </div>
          <div className="sp-card-body">
            {devices.length > 0 && (
              <div className="sp-device-list">
                {devices.map((d) => (
                  <div className="sp-device-row" key={d.name}>
                    <div className="sp-device-dot" />
                    <div className="sp-device-info">
                      <strong>{d.name}</strong>
                      <span className="sp-hint">Last sync: {d.lastSync}</span>
                    </div>
                    <button className="sp-remove-btn" onClick={() => removeDevice(d.name)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            {availableDevices.length > 0 && (
              <div className="sp-device-add">
                <select className="sp-input" value={newDevice} onChange={(e) => setNewDevice(e.target.value)}>
                  <option value="">Add a device…</option>
                  {availableDevices.map((d) => <option key={d}>{d}</option>)}
                </select>
                <button className="sp-primary-btn" onClick={addDevice} disabled={!newDevice}>Connect</button>
              </div>
            )}
            {devices.length === 0 && availableDevices.length === 0 && (
              <p className="sp-hint">All available devices are connected.</p>
            )}
          </div>
        </section>}

        {/* Privacy */}
        {activeSection === 'privacy' && <section className="sp-card" id="privacy">
          <div className="sp-card-head">
            <div className="sp-card-icon">🔒</div>
            <div>
              <h2>Privacy & data</h2>
              <p>Your rights over the data we hold.</p>
            </div>
          </div>
          <div className="sp-card-body">
            {[
              { label: 'Privacy Policy', desc: 'How we collect, use and protect your data.', href: '/privacy', cta: 'Read policy' },
              { label: 'Request data export', desc: 'Download everything we hold about you (GDPR Art. 20).', href: '/contact', cta: 'Request export' },
              { label: 'Terms of Service', desc: 'The rules governing use of Reprummble.', href: '/terms', cta: 'Read terms' },
            ].map(({ label, desc, href, cta }, i) => (
              <React.Fragment key={label}>
                {i > 0 && <div className="sp-divider" />}
                <div className="sp-row">
                  <div className="sp-row-info">
                    <strong>{label}</strong>
                    <span className="sp-hint">{desc}</span>
                  </div>
                  <a className="sp-outline-btn" href={href}>{cta} →</a>
                </div>
              </React.Fragment>
            ))}
          </div>
        </section>}

        {/* Danger zone */}
        {activeSection === 'danger' && <section className="sp-card sp-danger-card" id="danger">
          <div className="sp-card-head">
            <div className="sp-card-icon">⚠️</div>
            <div>
              <h2>Delete account</h2>
              <p>Permanent and irreversible. Proceed with care.</p>
            </div>
          </div>
          <div className="sp-card-body">
            <div className="sp-row">
              <div className="sp-row-info">
                <strong>Permanently delete my account</strong>
                <span className="sp-hint">
                  Removes your account, all health data, workout logs, meal history, and personal information. Cannot be undone.
                </span>
              </div>
              <button className="sp-delete-btn" onClick={() => setDeleteOpen(true)}>Delete account</button>
            </div>
          </div>
        </section>}
      </div>

      {/* ── DELETE MODAL ────────────────────────────────── */}
      {deleteOpen && (
        <div className="sp-modal-bg" onClick={closeDelete}>
          <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sp-modal-head">
              <span className="sp-modal-emoji">⚠️</span>
              <div>
                <h2>Delete your account</h2>
                <p>This action is permanent and cannot be undone.</p>
              </div>
              <button className="sp-modal-close" onClick={closeDelete}>✕</button>
            </div>

            <div className="sp-modal-body">
              <div className="sp-delete-warn">
                <p><strong>Everything below will be deleted immediately:</strong></p>
                <ul>
                  <li>Account and login credentials</li>
                  <li>All workout logs and training plans</li>
                  <li>Meal entries and nutrition history</li>
                  <li>Body metrics and progress snapshots</li>
                  <li>Wearable sync data and reports</li>
                </ul>
              </div>

              <label className="sp-field">
                <span>Reason for leaving <em className="sp-badge">optional</em></span>
                <select className="sp-input" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)}>
                  <option value="">Select a reason…</option>
                  <option value="not_using">I don't use it anymore</option>
                  <option value="missing_features">Missing features I need</option>
                  <option value="too_expensive">Too expensive</option>
                  <option value="privacy">Privacy concerns</option>
                  <option value="switching">Switching to another app</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="sp-field">
                <span>Type your email to confirm</span>
                <input className="sp-input" type="email" autoComplete="off"
                  placeholder={profile.email}
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)} />
                <span className="sp-hint">Enter exactly: <strong>{profile.email}</strong></span>
              </label>
            </div>

            <div className="sp-modal-foot">
              <button className="sp-outline-btn" onClick={closeDelete}>Cancel</button>
              <button
                className="sp-delete-btn"
                onClick={handleDelete}
                disabled={deleteConfirm !== profile.email || deleteStatus === 'loading'}
              >
                {deleteStatus === 'loading' ? 'Deleting…' : 'Permanently delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
