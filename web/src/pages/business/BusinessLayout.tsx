import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { DEV_BYPASS_AUTH } from '../../config/devAuth';
import { supabase } from '../../config/supabase';
import { usePageMeta } from '../../hooks/usePageMeta';
import { biz, useLoad } from './api';
import '../../styles/dashboard.css';

function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="dash-gate">
      <div className="dash-gate-card">
        <span className="rr-logo-mark">RR</span>
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  );
}

/** Business pages. The menu for them lives in the site's top bar, so this checks access and shows the content. */
export default function BusinessLayout() {
  usePageMeta({ title: 'Business dashboard', canonical: '/business' });
  const navigate = useNavigate();
  const [auth, setAuth] = useState<'checking' | 'in' | 'out'>(DEV_BYPASS_AUTH ? 'in' : 'checking');
  const [signedInAs, setSignedInAs] = useState('');

  useEffect(() => {
    if (DEV_BYPASS_AUTH) return;
    supabase.auth.getSession().then(({ data: { session } }) => { setAuth(session ? 'in' : 'out'); setSignedInAs(session?.user.email ?? ''); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => { setAuth(session ? 'in' : 'out'); setSignedInAs(session?.user.email ?? ''); });
    return () => subscription.unsubscribe();
  }, []);

  const me = useLoad(() => (auth === 'in' ? biz.me() : Promise.resolve({ data: undefined })), [auth]);

  const signIn = () => {
    try { sessionStorage.setItem('postAuthPath', '/business'); } catch { /* ignore */ }
    navigate('/?auth=signin');
  };

  if (auth === 'checking' || (auth === 'in' && me.loading)) return <Gate title="Business dashboard"><p>Loading…</p></Gate>;

  if (auth === 'out') {
    return (
      <Gate title="Business dashboard">
        <p>Sign in with your Reprummble account to manage your members, plans, nutrition, and reports.</p>
        <button className="rr-btn rr-btn-primary rr-btn-lg" onClick={signIn}>Sign in</button>
        <Link className="rr-link-arrow" to="/collaborate#apply">No business account yet? Apply to collaborate</Link>
      </Gate>
    );
  }

  if (me.error) {
    return (
      <Gate title="Something went wrong">
        <p>We could not load your business account. {me.error}</p>
        <button className="rr-btn rr-btn-primary" onClick={me.reload}>Try again</button>
      </Gate>
    );
  }

  const business = me.data?.business;
  const role = me.data?.role;

  if (!business || !role) {
    return (
      <Gate title="Business dashboard">
        <p>You do not have a business account yet. Apply to collaborate and, once we approve it, your dashboard opens here.</p>
        {signedInAs && (
          <p className="dash-muted">
            You are signed in as <strong>{signedInAs}</strong>. A business belongs to the account that applied for it, so if you applied with a different email or sign-in method, sign out and sign in with that one.
          </p>
        )}
        <Link className="rr-btn rr-btn-primary rr-btn-lg" to="/collaborate#apply">Apply to collaborate</Link>
        <Link className="rr-link-arrow" to="/dashboard">Go to my dashboard</Link>
      </Gate>
    );
  }

  if (business.status === 'pending') {
    return (
      <Gate title="Application under review">
        <p className="dash-gate-icon"><Clock size={28} /></p>
        <p>Thanks for applying, <strong>{business.name}</strong>. We review every application personally and reply within two business days. Your dashboard will open here as soon as it is approved.</p>
        <Link className="rr-link-arrow" to="/dashboard">Go to my dashboard</Link>
      </Gate>
    );
  }

  if (business.status === 'rejected') {
    return (
      <Gate title="Application not approved">
        <p>We could not approve <strong>{business.name}</strong> this time.{business.rejectionReason ? ` Reason: ${business.rejectionReason}` : ''}</p>
        <Link className="rr-btn rr-btn-primary" to="/collaborate#apply">Update and apply again</Link>
        <Link className="rr-link-arrow" to="/contact">Contact us</Link>
      </Gate>
    );
  }

  return (
    <div className="dash-page">
      <div className="rr-container dash-content">
        <p className="dash-top-label">{role} · {business.name}</p>
        <Outlet context={{ business, role }} />
      </div>
    </div>
  );
}
