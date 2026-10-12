import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useAccountUser } from './useAccountUser';

const CATALOG = ['Apple Watch', 'Oura Ring', 'Garmin', 'Whoop', 'Fitbit', 'Polar'];
const METRICS = ['Sleep', 'Resting heart rate', 'HRV', 'Steps & activity', 'Workouts', 'Weight & body fat'];

export default function Wearables() {
  const { user } = useAccountUser();
  if (!user) return <p className="dash-muted">Loading…</p>;
  return <WearablesList initial={(user.metadata.devices as { name: string }[] | undefined)?.map((d) => d.name) ?? []} />;
}

function WearablesList({ initial }: { initial: string[] }) {
  const [devices, setDevices] = useState(initial);
  const [error, setError] = useState('');

  const save = async (next: string[]) => {
    const prev = devices;
    setDevices(next);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ data: { devices: next.map((name) => ({ name })) } });
    if (err) { setDevices(prev); setError('Could not save your devices. Please try again.'); }
  };

  const available = CATALOG.filter((d) => !devices.includes(d));

  return (
    <>
      <div className="dash-head"><h1>Wearables</h1><p>Tell us which devices you use. Data syncs automatically through Apple Health on iPhone.</p></div>

      <section className="dash-card">
        <h2>Your devices</h2>
        {devices.length === 0 ? <p className="dash-muted">No devices added yet.</p> : (
          <ul className="dash-list">
            {devices.map((d) => (
              <li key={d}><strong>{d}</strong><button className="dash-icon-btn" onClick={() => save(devices.filter((x) => x !== d))} aria-label={`Remove ${d}`}><Trash2 size={16} /></button></li>
            ))}
          </ul>
        )}
        {available.length > 0 && (
          <div className="dash-sections" role="group" aria-label="Add a device">
            {available.map((d) => <button key={d} className="dash-chip" onClick={() => save([...devices, d])}>+ {d}</button>)}
          </div>
        )}
        {error && <p className="dash-error" role="alert">{error}</p>}
      </section>

      <section className="dash-card">
        <h2>What syncs</h2>
        <p className="dash-muted">Garmin, Oura, Whoop, Fitbit, and Polar sync through Apple Health on iPhone. Android Health Connect support is coming.</p>
        <div className="dash-sections">{METRICS.map((m) => <span className="dash-pill is-active" key={m}>{m}</span>)}</div>
      </section>
    </>
  );
}
