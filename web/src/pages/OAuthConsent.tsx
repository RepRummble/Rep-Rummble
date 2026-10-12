import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import type { OAuthAuthorizationDetails } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { usePageMeta } from '../hooks/usePageMeta';
import { safeRedirectUrl } from '../lib/safeRedirect';

// Supabase redirects people here (the "Authorization Path" in Authentication → OAuth Server)
// when another app asks to sign them in with their Reprummble account.
const SCOPE_LABELS: Record<string, string> = {
  openid: 'Confirm who you are',
  profile: 'See your name and profile details',
  email: 'See your email address',
  phone: 'See your phone number',
};

type View =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'consent'; details: OAuthAuthorizationDetails }
  | { kind: 'redirecting' };

export default function OAuthConsent() {
  usePageMeta({ title: 'Authorize access' });
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id') ?? '';
  const valid = /^[\w-]{8,128}$/.test(authorizationId);
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);

  const leave = (url: string) => {
    const target = safeRedirectUrl(url);
    if (!target) {
      setView({ kind: 'error', message: 'We could not send you back to the app safely, so nothing was shared. Please go back and try again.' });
      return;
    }
    setView({ kind: 'redirecting' });
    window.location.assign(target);
  };

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        // Sign in first, then come straight back to this request.
        try { sessionStorage.setItem('postAuthPath', `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`); } catch { /* ignore */ }
        navigate('/?auth=signin', { replace: true });
        return;
      }
      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (cancelled) return;
      if (error || !data) {
        setView({ kind: 'error', message: 'This request has expired or is no longer valid. Please go back to the app and try again.' });
      } else if ('redirect_url' in data) {
        leave(data.redirect_url); // you already approved this app earlier
      } else {
        setView({ kind: 'consent', details: data });
      }
    })();
    return () => { cancelled = true; };
  }, [authorizationId, valid, navigate]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const options = { skipBrowserRedirect: true };
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, options)
      : await supabase.auth.oauth.denyAuthorization(authorizationId, options);
    if (error || !data?.redirect_url) {
      setBusy(false);
      setView({ kind: 'error', message: 'Something went wrong, so nothing was shared. Please go back to the app and try again.' });
      return;
    }
    leave(data.redirect_url);
  };

  const shell = (body: React.ReactNode) => (
    <div className="rr-page">
      <section className="rr-section" style={{ paddingTop: 120, minHeight: '70vh' }}>
        <div className="rr-container" style={{ display: 'grid', placeItems: 'center' }}>
          <div className="rr-card rr-consent">{body}</div>
        </div>
      </section>
    </div>
  );

  if (!valid) {
    return shell(<><h1>Link not valid</h1><p>This page needs a request from another app. Please go back to that app and try again.</p><Link className="rr-btn rr-btn-outline" to="/">Back to Reprummble</Link></>);
  }
  if (view.kind === 'loading' || view.kind === 'redirecting') {
    return shell(<p role="status">{view.kind === 'loading' ? 'Checking your request…' : 'Taking you back to the app…'}</p>);
  }
  if (view.kind === 'error') {
    return shell(<><h1>We couldn't continue</h1><p role="alert">{view.message}</p><Link className="rr-btn rr-btn-outline" to="/">Back to Reprummble</Link></>);
  }

  const { client, scope, user, redirect_uri } = view.details;
  const scopes = scope.split(/\s+/).filter(Boolean);
  let destination = redirect_uri;
  try { destination = new URL(redirect_uri).host || redirect_uri; } catch { /* show as given */ }
  const logo = client.logo_uri?.startsWith('https://') ? client.logo_uri : null;

  return shell(
    <>
      <span className="rr-icon"><ShieldCheck size={22} /></span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {logo && <img src={logo} alt="" width={44} height={44} referrerPolicy="no-referrer" style={{ borderRadius: 10, objectFit: 'cover' }} />}
        <h1 style={{ fontSize: 24 }}>{client.name} wants to access your Reprummble account</h1>
      </div>
      <p>Signed in as <strong>{user.email}</strong></p>
      <div>
        <strong style={{ fontSize: 14 }}>This will allow {client.name} to:</strong>
        <ul className="rr-consent-scopes">
          {scopes.map((s) => <li key={s}>{SCOPE_LABELS[s] ?? s}</li>)}
        </ul>
      </div>
      <p className="rr-consent-note">
        You will be sent to <strong>{destination}</strong>. Only continue if you started this from {client.name} and you trust it.
        You can cancel and nothing is shared.
      </p>
      <div className="rr-hero-ctas" style={{ margin: 0 }}>
        <button className="rr-btn rr-btn-primary" onClick={() => decide(true)} disabled={busy}>Allow access</button>
        <button className="rr-btn rr-btn-outline" onClick={() => decide(false)} disabled={busy}>Cancel</button>
      </div>
    </>,
  );
}
