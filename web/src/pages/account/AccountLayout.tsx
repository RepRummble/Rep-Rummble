import { useEffect, useLayoutEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Building2, CreditCard, Gift, LayoutDashboard, FileBarChart, LogOut, Menu, ShieldCheck, UserRound, Watch, X,
} from 'lucide-react';
import { DEV_BYPASS_AUTH } from '../../config/devAuth';
import { supabase } from '../../config/supabase';
import { usePageMeta } from '../../hooks/usePageMeta';
import { biz, useLoad } from '../business/api';
import { useAccountUserLoader } from './useAccountUser';
import '../../styles/dashboard.css';

const NAV = [
  { to: '/dashboard', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dashboard/reports', label: 'Reports', icon: FileBarChart },
  { to: '/dashboard/wearables', label: 'Wearables', icon: Watch },
  { to: '/dashboard/referral', label: 'Referral', icon: Gift },
  { to: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { to: '/dashboard/profile', label: 'Profile', icon: UserRound },
];

export default function AccountLayout() {
  usePageMeta({ title: 'Your dashboard', canonical: '/dashboard' });
  const navigate = useNavigate();
  const [user, setUser] = useAccountUserLoader();
  const [auth, setAuth] = useState<'checking' | 'in' | 'out'>(DEV_BYPASS_AUTH ? 'in' : 'checking');
  const [menuOpen, setMenuOpen] = useState(false);
  // Reviewers (ADMIN_EMAILS) and business owners/staff get an extra link; everyone else sees nothing.
  const admin = useLoad(() => (auth === 'in' ? biz.admin.status() : Promise.resolve({ data: undefined })), [auth]);
  const business = useLoad(() => (auth === 'in' ? biz.me() : Promise.resolve({ data: undefined })), [auth]);

  useLayoutEffect(() => {
    document.documentElement.classList.add('theme-light');
    return () => document.documentElement.classList.remove('theme-light');
  }, []);

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

  const signOut = async () => {
    if (!DEV_BYPASS_AUTH) await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  if (auth !== 'in') {
    return <div className="dash-gate"><div className="dash-gate-card"><p>Opening your dashboard…</p></div></div>;
  }

  const initials = (user?.name || user?.email || 'RR').split(/[\s@]/).filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="dash">
      <aside className={`dash-side${menuOpen ? ' is-open' : ''}`}>
        <Link to="/dashboard" className="rr-logo dash-logo">
          <span className="rr-logo-mark">RR</span>
          <span className="rr-logo-name">Reprummble</span>
        </Link>
        <nav aria-label="Your dashboard">
          {NAV.map(({ to, end, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `dash-nav${isActive ? ' active' : ''}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="dash-side-foot">
          {business.data?.business?.status === 'approved' && (
            <Link to="/business" className="dash-nav" onClick={() => setMenuOpen(false)}><Building2 size={18} /> Business dashboard</Link>
          )}
          {admin.data?.isAdmin && (
            <Link to="/admin/applications" className="dash-nav" onClick={() => setMenuOpen(false)}>
              <ShieldCheck size={18} /> Review applications
              {!!admin.data.pending && <span className="dash-badge" aria-label={`${admin.data.pending} pending`}>{admin.data.pending}</span>}
            </Link>
          )}
          <Link to="/" className="dash-nav">← Back to website</Link>
          <button className="dash-nav" onClick={signOut}><LogOut size={18} /> Sign out</button>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-top">
          <button className="dash-menu" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={menuOpen}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="dash-user">
            <span className="rr-avatar-btn" aria-hidden="true">{initials}</span>
            <div>
              <strong>{user?.name || 'Your account'}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
        </header>
        <main className="dash-content">
          <Outlet context={{ user, setUser }} />
        </main>
      </div>
    </div>
  );
}
