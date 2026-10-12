import React, { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function WaitlistForm({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'app-waitlist' }),
      });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return <div className="rr-msg-ok">You're on the list — we'll email you when the iOS & Android apps launch.</div>;
  }
  return (
    <form className="rr-inline-form" onSubmit={submit} noValidate>
      <input
        className="rr-input"
        type="email"
        placeholder="you@email.com"
        aria-label="Email address"
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
      />
      <button className={`rr-btn ${dark ? 'rr-btn-white' : 'rr-btn-dark'}`} type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Saving…' : 'Notify me'}
      </button>
      {status === 'error' && <span className="rr-msg-err" style={{ flexBasis: '100%' }}>Please enter a valid email and try again.</span>}
    </form>
  );
}
