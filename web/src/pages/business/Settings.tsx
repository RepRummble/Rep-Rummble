import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { biz, useLoad, type Staff } from './api';
import { useBusiness } from './useBusiness';

const TYPES = ['Gym', 'CrossFit box', 'Studio', 'Personal trainer', 'Online coach', 'Nutritionist / dietitian', 'Employer / corporate wellness', 'Clinic / physiotherapist', 'Club / community', 'Other'];

export default function Settings() {
  const { business, role, allowed } = useBusiness();
  const owner = allowed('settings');
  const staff = useLoad(() => (owner ? biz.staff.list() : Promise.resolve({ data: [] as Staff[] })), [owner]);
  const [profile, setProfile] = useState({ name: business.name, type: business.type, city: business.city, contactEmail: business.contactEmail });
  const [saved, setSaved] = useState(false);
  const [member, setMember] = useState<{ name: string; email: string; role: Staff['role'] }>({ name: '', email: '', role: 'Coach' });
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await biz.updateProfile(profile);
    if (res.error) { setError(res.error); return; }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const addStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member.name.trim() || !/^\S+@\S+\.\S+$/.test(member.email.trim())) { setError('Enter a name and a valid email.'); return; }
    setError('');
    const res = await biz.staff.create({ name: member.name.trim(), email: member.email.trim(), role: member.role });
    if (res.error) { setError(res.error); return; }
    setMember({ name: '', email: '', role: 'Coach' });
    staff.reload();
  };

  const removeStaff = async (s: Staff) => {
    if (!window.confirm(`Remove ${s.name}? They will lose access immediately.`)) return;
    const res = await biz.staff.remove(s.id);
    if (res.error) setError(res.error);
    staff.reload();
  };

  if (!owner) {
    return (
      <>
        <div className="dash-head"><h1>Settings</h1></div>
        <section className="dash-card"><p className="dash-muted">You are signed in as <strong>{role}</strong> for {business.name}. Only the account owner can change business settings and the team.</p></section>
      </>
    );
  }

  return (
    <>
      <div className="dash-head"><h1>Settings</h1><p>Your business profile and team.</p></div>
      {error && <p className="dash-error" role="alert">{error}</p>}

      <form className="dash-card dash-inline-form" onSubmit={save}>
        <h2>Business profile</h2>
        <div className="dash-form-row">
          <label>Business name<input value={profile.name} maxLength={120} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
          <label>Type<select value={profile.type} onChange={(e) => setProfile({ ...profile, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label>City<input value={profile.city} maxLength={120} onChange={(e) => setProfile({ ...profile, city: e.target.value })} /></label>
          <label>Contact email<input type="email" value={profile.contactEmail} onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })} /></label>
        </div>
        <div className="dash-actions"><button className="rr-btn rr-btn-primary" type="submit">Save profile</button>{saved && <span className="dash-ok" role="status">Saved</span>}</div>
      </form>

      <section className="dash-card">
        <h2>Team</h2>
        <p className="dash-muted">Coaches manage members and workout plans. Nutritionists manage meal plans and foods. Viewers can look but not change anything. They sign in with the email you enter here.</p>
        <form className="dash-form-row" onSubmit={addStaff} noValidate>
          <label>Name<input value={member.name} maxLength={80} onChange={(e) => setMember({ ...member, name: e.target.value })} /></label>
          <label>Email<input type="email" value={member.email} onChange={(e) => setMember({ ...member, email: e.target.value })} /></label>
          <label>Role<select value={member.role} onChange={(e) => setMember({ ...member, role: e.target.value as Staff['role'] })}><option>Coach</option><option>Nutritionist</option><option>Viewer</option></select></label>
          <button className="rr-btn rr-btn-outline" type="submit">Add team member</button>
        </form>
        <ul className="dash-list">
          <li><div><strong>You</strong><small>Account owner</small></div><span className="dash-pill is-active">Owner</span></li>
          {staff.data?.map((s) => (
            <li key={s.id}>
              <div><strong>{s.name}</strong><small>{s.email}</small></div>
              <span><span className="dash-pill is-active">{s.role}</span><button className="dash-icon-btn" onClick={() => removeStaff(s)} aria-label={`Remove ${s.name}`}><Trash2 size={16} /></button></span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
