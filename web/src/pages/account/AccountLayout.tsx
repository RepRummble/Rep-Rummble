import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { DEV_BYPASS_AUTH } from '../../config/devAuth';
import { supabase } from '../../config/supabase';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useAccountUserLoader } from './useAccountUser';
import '../../styles/dashboard.css';

/** Member pages. The menu for them lives in the site's top bar, so this is just the content area. */
export default function AccountLayout() {
  usePageMeta({ title: 'Your dashboard', canonical: '/dashboard' });
  const navigate = useNavigate();
  const [user, setUser] = useAccountUserLoader();
  const [auth, setAuth] = useState<'checking' | 'in' | 'out'>(DEV_BYPASS_AUTH ? 'in' : 'checking');

  useEffect(() => {
    if (DEV_BYPASS_AUTH) return;
    supabase.auth.getSession().then(({ data: { session } }) => setAuth(session ? 'in' : 'out'));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setAuth(session ? 'in' : 'out'));
    return () => subscription.unsubscribe();
  }, []);

  // Signed-out visitors go to the sign-in window and come back here afterwards.
  useEffect(() => {
    if (auth !== 'out') return;
    try { sessionStorage.setItem('postAuthPath', window.location.pathname); } catch { /* ignore */ }
    navigate('/?auth=signin', { replace: true });
  }, [auth, navigate]);

  if (auth !== 'in') {
    return <div className="dash-gate"><div className="dash-gate-card"><p>Opening your dashboard…</p></div></div>;
  }

  return (
    <div className="dash-page">
      <div className="rr-container dash-content">
        <Outlet context={{ user, setUser }} />
      </div>
    </div>
  );
}
