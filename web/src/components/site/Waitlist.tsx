import { useState, type FormEvent } from 'react';
import { ArrowRight, Check } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Collects an email for the app launch. It is shown instead of store badges until the store links are set,
 * so the site never points at an app that is not there yet.
 */
export default function Waitlist({ variant = 'dark', source = 'waitlist-app', compact = false }: { variant?: 'dark' | 'light'; source?: string; compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL.test(value)) { setStatus('error'); setMessage('Enter a valid email address.'); return; }
    setStatus('sending'); setMessage('');
    try {
      const r = await fetch(`${API_BASE}/api/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: value, source }) });
      if (r.status === 429) { setStatus('error'); setMessage('Too many tries. Please wait a little and try again.'); return; }
      if (!r.ok) throw new Error(String(r.status));
      setStatus('done'); setMessage(r.status === 200 ? 'You are already on the list. We will email you at launch.' : 'You are on the list. We will email you when the app is out.');
    } catch { setStatus('error'); setMessage('Something went wrong. Please try again in a moment.'); }
  };

  if (status === 'done') return <p className={`rr-waitlist-done rr-waitlist-${variant}`} role="status"><Check size={18} /> {message}</p>;
  return (
    <form className={`rr-waitlist rr-waitlist-${variant}${compact ? ' is-compact' : ''}`} onSubmit={submit} noValidate>
      {!compact && <p className="rr-waitlist-title">The iPhone and Android apps are coming soon.</p>}
      <div className="rr-waitlist-row">
        <label className="sr-only" htmlFor={`waitlist-${source}`}>Email address</label>
        <input id={`waitlist-${source}`} type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={status === 'error'} required />
        <button type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Joining…' : <>Tell me at launch <ArrowRight size={16} /></>}</button>
      </div>
      {status === 'error' && <p className="rr-waitlist-error" role="alert">{message}</p>}
      {!compact && <p className="rr-waitlist-fine">One email when the app is out. No spam.</p>}
    </form>
  );
}
