import { useEffect, useLayoutEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ClipboardList, Clock, FileBarChart, LayoutDashboard, LogOut, Menu, Settings, Users, Utensils, X,
} from 'lucide-react';
import { DEV_BYPASS_AUTH } from '../../config/devAuth';
import { supabase } from '../../config/supabase';
import { usePageMeta } from '../../hooks/usePageMeta';
import { biz, can, useLoad, type Area } from './api';
import '../../styles/dashboard.css';

const NAV: { to: string; end?: boolean; label: string; icon: typeof Users; area?: Area }[] = [
  { to: '/business', end: true, label: 'Overview', icon: LayoutDashboard, area: 'reports' },
  { to: '/business/members', label: 'Members', icon: Users, area: 'members' },
  { to: '/business/workouts', label: 'Workout plans', icon: ClipboardList, area: 'plans' },
  { to: '/business/nutrition', label: 'Nutrition & food', icon: Utensils, area: 'nutrition' },
  { to: '/business/reports', label: 'Reports', icon: FileBarChart, area: 'reports' },
  { to: '/business/settings', label: 'Settings', icon: Settings },
];

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

export default function BusinessLayout() {
  usePageMeta({ title: 'Business dashboard', canonical: '/business' });
  const navigate = useNavigate();
  const [auth, setAuth] = useState<'checking' | 'in' | 'out'>(DEV_BYPASS_AUTH ? 'in' : 'checking');
  const [menuOpen, setMenuOpen] = useState(false);

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

  const me = useLoad(() => (auth === 'in' ? biz.me() : Promise.resolve({ data: undefined })), [auth]);

  const signIn = () => {
    try { sessionStorage.setItem('postAuthPath', '/business'); } catch { /* ignore */ }
    navigate('/?auth=signin');
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
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
        <Link className="rr-btn rr-btn-primary rr-btn-lg" to="/collaborate#apply">Apply to collaborate</Link>
        <Link className="rr-link-arrow" to="/">Back to website</Link>
      </Gate>
    );
  }

  if (business.status === 'pending') {
    return (
      <Gate title="Application under review">
        <p className="dash-gate-icon"><Clock size={28} /></p>
        <p>Thanks for applying, <strong>{business.name}</strong>. We review every application personally and reply within two business days. Your dashboard will open here as soon as it is approved.</p>
        <Link className="rr-link-arrow" to="/">Back to website</Link>
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
    <div className="dash">
      <aside className={`dash-side${menuOpen ? ' is-open' : ''}`}>
        <Link to="/business" className="rr-logo dash-logo">
          <span className="rr-logo-mark">RR</span>
          <span className="rr-logo-name">Business</span>
        </Link>
        <nav aria-label="Business dashboard">
          {NAV.filter((n) => !n.area || can(role, n.area, 'read')).map(({ to, end, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `dash-nav${isActive ? ' active' : ''}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="dash-side-foot">
          <Link to="/dashboard" className="dash-nav">My own dashboard</Link>
          <Link to="/" className="dash-nav">← Back to website</Link>
          <button className="dash-nav" onClick={signOut}><LogOut size={18} /> Sign out</button>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-top">
          <button className="dash-menu" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={menuOpen}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <div className="dash-top-label">{role} · Business dashboard</div>
            <strong>{business.name}</strong>
          </div>
        </header>
        <main className="dash-content">
          <Outlet context={{ business, role }} />
        </main>
      </div>
    </div>
  );
}
