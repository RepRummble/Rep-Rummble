import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import api, { type WearableDay } from '../../config/api';
import { supabase } from '../../config/supabase';
import { useAccountUser } from './useAccountUser';

const CATALOG = ['Apple Watch', 'Oura Ring', 'Garmin', 'Whoop', 'Fitbit', 'Polar'];
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** The newest non-empty value of one reading across recent days (a watch may report weight only weekly). */
const latest = (days: WearableDay[], pick: (d: WearableDay) => number | null | undefined) => {
  const hit = days.find((d) => { const v = pick(d); return v !== null && v !== undefined && v > 0; });
  return hit ? { value: pick(hit) as number, date: hit.date } : null;
};

export default function Wearables() {
  const { user } = useAccountUser();
  const [days, setDays] = useState<WearableDay[] | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    let cancelled = false;
    api.wearables.data(14).then((res) => { if (!cancelled) setDays(Array.isArray(res.data) ? res.data : null); });
    return () => { cancelled = true; };
  }, []);

  if (!user) return <p className="dash-muted">Loading…</p>;
  const saved = (user.metadata.devices as { name: string }[] | undefined)?.map((d) => d.name) ?? [];

  const tiles = days ? [
    { label: 'Steps', r: latest(days, (d) => d.steps), unit: '' },
    { label: 'Sleep', r: latest(days, (d) => d.sleepHours), unit: ' h' },
    { label: 'Resting heart rate', r: latest(days, (d) => d.restingHR), unit: ' bpm' },
    { label: 'HRV', r: latest(days, (d) => d.hrv), unit: ' ms' },
    { label: 'Weight', r: latest(days, (d) => d.weight), unit: ' kg' },
    { label: 'Body fat', r: latest(days, (d) => d.bodyFat), unit: '%' },
  ] : [];
  const lastSync = days?.[0]?.syncedAt;

  return (
    <>
      <div className="dash-head"><h1>Wearables</h1><p>Sleep, heart rate, recovery and activity from your devices. Data syncs automatically through Apple Health on iPhone.</p></div>

      <section className="dash-card">
        <div className="dash-card-top">
          <h2>Latest from your devices</h2>
          {lastSync && <small className="dash-muted">Last sync {new Date(lastSync).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</small>}
        </div>
        {days === undefined ? <p className="dash-muted">Loading…</p> : days === null ? (
          <p className="dash-error" role="alert">We could not load your wearable data. Please try again.</p>
        ) : days.length === 0 ? (
          <div className="dash-empty">
            <h2>No wearable data yet</h2>
            <p className="dash-muted">Open the Reprummble iPhone app, go to your profile, and allow access to Apple Health. Your readings appear here after the next sync.</p>
          </div>
        ) : (
          <div className="dash-mini dash-mini-3">
            {tiles.map((t) => (
              <div key={t.label}>
                <small>{t.label}</small>
                <strong>{t.r ? `${fmt(t.r.value)}${t.unit}` : '—'}</strong>
                <small className="dash-muted" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{t.r ? day(t.r.date) : 'Not reported'}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      {days && days.length > 0 && (
        <section className="dash-card">
          <h2>Last 14 days</h2>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead><tr><th>Date</th><th>Steps</th><th>Sleep</th><th>Resting HR</th><th>HRV</th><th>Weight</th></tr></thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.date}>
                    <td><strong>{day(d.date)}</strong></td><td>{fmt(d.steps)}</td><td>{d.sleepHours ? `${fmt(d.sleepHours)} h` : '—'}</td>
                    <td>{d.restingHR ? `${d.restingHR} bpm` : '—'}</td><td>{d.hrv ? `${d.hrv} ms` : '—'}</td><td>{d.weight ? `${fmt(d.weight)} kg` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <DevicePicker initial={saved} />

      <section className="dash-card">
        <h2>How syncing works</h2>
        <ol className="dash-steps-list">
          <li>Your device (Apple Watch, Garmin, Oura, Whoop, Fitbit or Polar) sends its data to <strong>Apple Health</strong> on your iPhone.</li>
          <li>The Reprummble iPhone app reads Apple Health, with your permission, and syncs it to your account.</li>
          <li>It shows up here and on your dashboard. Android Health Connect support is coming.</li>
        </ol>
      </section>
    </>
  );
}

/** Which devices the person uses. This is a note for us; the sync itself goes through Apple Health. */
function DevicePicker({ initial }: { initial: string[] }) {
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
    <section className="dash-card">
      <h2>Devices you use</h2>
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
  );
}
