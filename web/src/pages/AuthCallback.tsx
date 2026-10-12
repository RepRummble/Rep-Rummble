import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'loading' | 'recovery' | 'expired' | 'done'>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    // Parse hash params — Supabase puts type=recovery (or error=*) in the hash
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const errorCode = params.get('error_code')
    const type = params.get('type')

    // Handle Supabase error params (e.g. otp_expired, access_denied)
    if (errorCode || params.get('error')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode('expired')
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        localStorage.setItem('auth_token', session.access_token)
        if (type === 'recovery') {
          setMode('recovery')
        } else {
          let next = '/dashboard'
          try {
            const saved = sessionStorage.getItem('postAuthPath')
            sessionStorage.removeItem('postAuthPath')
            if (saved && saved.startsWith('/') && !saved.startsWith('//')) next = saved
          } catch { /* storage blocked */ }
          navigate(next, { replace: true })
        }
      } else {
        navigate('/?auth=signin', { replace: true })
      }
    })
  }, [navigate])

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setError('')
    setStatus('loading')
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError(err.message)
      setStatus('error')
    } else {
      setStatus('success')
      setTimeout(() => navigate('/dashboard/profile', { replace: true }), 1800)
    }
  }

  if (mode === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: 'var(--ink-2)' }}>Signing you in…</p>
      </div>
    )
  }

  if (mode === 'expired') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '24px' }}>
        <div style={{
          width: 'min(440px, 100%)',
          background: 'var(--paper-3)',
          border: '1px solid var(--stroke)',
          borderRadius: '24px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px' }}>⏳</div>
          <h2 style={{ margin: 0, color: 'var(--ink)', fontSize: '22px', fontWeight: 700 }}>Link expired</h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>
            This password reset link has expired or already been used. Request a new one.
          </p>
          <button
            onClick={() => navigate('/?auth=forgot', { replace: true })}
            style={{
              padding: '12px',
              borderRadius: '999px',
              background: 'linear-gradient(120deg, var(--accent-0), var(--accent-2))',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            Request new link
          </button>
          <button
            onClick={() => navigate('/?auth=signin', { replace: true })}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '24px' }}>
      <div style={{
        width: 'min(440px, 100%)',
        background: 'var(--paper-3)',
        border: '1px solid var(--stroke)',
        borderRadius: '24px',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔐</div>
          <h2 style={{ margin: 0, color: 'var(--ink)', fontSize: '22px', fontWeight: 700 }}>Set new password</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: '14px' }}>
            {status === 'success' ? 'Password updated! Redirecting…' : 'Choose a strong password for your account.'}
          </p>
        </div>

        {status !== 'success' && (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--ink-2)' }}>
              New password
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoFocus
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--stroke)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: 'var(--ink)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--ink-2)' }}>
              Confirm password
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password"
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--stroke)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: 'var(--ink)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </label>

            {error && <p style={{ margin: 0, color: '#f87171', fontSize: '13px' }}>{error}</p>}

            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                marginTop: '4px',
                padding: '12px',
                borderRadius: '999px',
                background: 'linear-gradient(120deg, var(--accent-0), var(--accent-2))',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' ? 0.7 : 1,
                border: 'none',
              }}
            >
              {status === 'loading' ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

        {status === 'success' && (
          <div style={{ textAlign: 'center', color: 'var(--accent-0)', fontSize: '28px' }}>✓</div>
        )}
      </div>
    </div>
  )
}
