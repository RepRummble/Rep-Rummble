import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FaApple, FaFacebookF } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { DEV_BYPASS_AUTH, DEV_USER } from '../config/devAuth';
import api from '../config/api';
import { supabase } from '../config/supabase';
import ChatWidget from './chat/ChatWidget';
import CookieBanner from './CookieBanner';
import { useAnalytics } from '../hooks/useAnalytics';

const API_URL = import.meta.env.VITE_API_URL || '';
const PRIVATE_ROUTES = ['/analytics', '/reports', '/referral', '/payment', '/profile', '/wearables'];

export default function Layout() {
  useAnalytics();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [authMessage, setAuthMessage] = useState('');
  const [authStatus, setAuthStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [isLoggedIn, setIsLoggedIn] = useState(DEV_BYPASS_AUTH);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [footerVisible, setFooterVisible] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const profileRef = useRef<HTMLDivElement>(null);
  const dashboardDropdownRef = useRef<HTMLDetailsElement>(null);
  const lastScroll = useRef(0);
  const hasMounted = useRef(false);
  useEffect(() => {
    if (DEV_BYPASS_AUTH) {
      setIsLoggedIn(true);
      setAuthOpen(false);
      return;
    }
    // Check existing Supabase session (e.g. after OAuth redirect)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true);
        setCurrentUser({
          name: session.user.user_metadata?.displayName || session.user.user_metadata?.full_name || 'Account',
          email: session.user.email || '',
        });
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (session) {
        setCurrentUser({
          name: session.user.user_metadata?.displayName || session.user.user_metadata?.full_name || 'Account',
          email: session.user.email || '',
        });
      } else {
        setCurrentUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (DEV_BYPASS_AUTH || isLoggedIn) return;
    const params = new URLSearchParams(location.search);
    const authParam = params.get('auth');
    if (authParam === 'signin' || authParam === 'signup' || authParam === 'forgot') {
      setAuthMode(authParam);
      setAuthOpen(true);
    }
  }, [location.search, isLoggedIn]);

  useEffect(() => {
    if (DEV_BYPASS_AUTH || isLoggedIn) return;
    const needsAuth = PRIVATE_ROUTES.some((route) => location.pathname.startsWith(route));
    if (needsAuth) {
      sessionStorage.setItem('postAuthPath', location.pathname);
      navigate('/?auth=signin', { replace: true });
    }
  }, [location.pathname, isLoggedIn, navigate]);

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    lastScroll.current = 0;
    setHeaderVisible(true);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    setTransitioning(true);
    const timeout = window.setTimeout(() => setTransitioning(false), 750);
    return () => window.clearTimeout(timeout);
  }, [location.pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    if (profileOpen) {
      document.addEventListener('mousedown', handleClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [profileOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const nearTop = scrollY <= 20;
      const nearBottom = scrollY >= Math.max(0, maxScroll - 20);
      const scrollingDown = scrollY > lastScroll.current;

      if (nearTop) {
        setHeaderVisible(true);
      } else if (scrollingDown) {
        setHeaderVisible(false);
      } else {
        setHeaderVisible(true);
      }

      if (nearBottom) {
        setFooterVisible(true);
      } else if (!scrollingDown) {
        setFooterVisible(false);
      }

      lastScroll.current = scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    lastScroll.current = window.scrollY;
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // One global mousemove listener — powers gradient border on every card
  useEffect(() => {
    const SELECTOR = [
      '.feature-card', '.testimonial-card', '.stat-card', '.info-card',
      '.step-card', '.sp-card', '.legal-card', '.kpi-card', '.ppc-plan',
      '.hdc-metric', '.hdc-workout', '.download-band', '.plans-preview-inner',
      '.cta-final-inner', '.hero-dashboard-card', '.service-card',
    ].join(', ');

    const handler = (e: MouseEvent) => {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((card) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--gx', `${e.clientX - r.left}px`);
        card.style.setProperty('--gy', `${e.clientY - r.top}px`);
      });
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal], [data-stagger]'));
    if (!nodes.length) return;

    if (!('IntersectionObserver' in window)) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [location.pathname]);

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthStatus('loading');
    setAuthMessage('');

    try {
      if (authMode === 'signup' && !formData.name.trim()) {
        setAuthStatus('error');
        setAuthMessage('Please enter your name to continue.');
        return;
      }
      if (!formData.email.trim() || !formData.password.trim()) {
        setAuthStatus('error');
        setAuthMessage('Please enter your email and password.');
        return;
      }

      const result =
        authMode === 'signin'
          ? await api.auth.login(formData.email, formData.password)
          : await api.auth.register(formData.email, formData.password, formData.name);

      if (result.error) {
        throw new Error(result.error);
      }

      setAuthStatus('success');
      setAuthMessage(authMode === 'signin' ? 'Signed in successfully.' : 'Account created.');
      setIsLoggedIn(true);
      setAuthOpen(false);
      setFormData({ name: '', email: '', password: '' });
      const postAuthPath = sessionStorage.getItem('postAuthPath');
      if (postAuthPath) {
        sessionStorage.removeItem('postAuthPath');
        navigate(postAuthPath, { replace: true });
      } else {
        navigate('/analytics', { replace: true });
      }
    } catch (error: unknown) {
      setAuthStatus('error');
      setAuthMessage(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  const handleAuthModeChange = (mode: 'signin' | 'signup' | 'forgot') => {
    setAuthMode(mode);
    setAuthMessage('');
    setAuthStatus('idle');
  };

  const handleForgotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      setAuthStatus('error');
      setAuthMessage('Please enter your email address.');
      return;
    }
    setAuthStatus('loading');
    setAuthMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
      redirectTo: `${import.meta.env.VITE_SITE_URL || 'https://reprummble.com'}/auth/callback`,
    });
    if (error) {
      setAuthStatus('error');
      setAuthMessage(error.message);
    } else {
      setAuthStatus('success');
      setAuthMessage('Check your email for a reset link.');
    }
  };

  const handleSignOut = async () => {
    if (DEV_BYPASS_AUTH) return;
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setAuthMode('signin');
    setAuthMessage('');
    setAuthStatus('idle');
    setProfileOpen(false);
    navigate('/', { replace: true });
  };

  const handleProfileClick = () => {
    if (isLoggedIn) {
      setProfileOpen((prev) => !prev);
    } else {
      setProfileOpen(false);
      setAuthOpen(true);
    }
  };

  return (
    <div className="marketing-page">
      <div className={`route-transition${transitioning ? ' active' : ''}`} aria-hidden="true">
        <span />
        <span />
      </div>
      <header className={`marketing-header${headerVisible ? '' : ' hidden'}`}>
        <Link to="/" className="brand brand-link">
          <span className="brand-mark">RR</span>
          <span className="brand-name">Reprummble</span>
        </Link>
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(p => !p)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger${mobileMenuOpen ? ' open' : ''}`} />
        </button>
        <nav className={`marketing-nav${mobileMenuOpen ? ' mobile-open' : ''}`}>
          {!isLoggedIn ? (
            <>
              <NavLink to="/services" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Services</NavLink>
              <NavLink to="/plans" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Plans</NavLink>
              <NavLink to="/faq" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>FAQ</NavLink>
              <NavLink to="/contact" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Contact Us</NavLink>
              <button className="ghost-btn nav-signin-btn" onClick={() => { setAuthMode('signin'); setAuthOpen(true); setMobileMenuOpen(false); }}>Sign In</button>
              <button className="solid-btn nav-signup-btn" onClick={() => { setAuthMode('signup'); setAuthOpen(true); setMobileMenuOpen(false); }}>Sign Up</button>
            </>
          ) : (
            <>
              <details className="nav-dropdown" ref={dashboardDropdownRef}>
                <summary className="nav-link">Dashboard</summary>
                <div className="nav-dropdown-menu">
                  <NavLink to="/analytics" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => { dashboardDropdownRef.current?.removeAttribute('open'); }}>Analytics</NavLink>
                  <NavLink to="/reports" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => { dashboardDropdownRef.current?.removeAttribute('open'); }}>Reports</NavLink>
                  <NavLink to="/wearables" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => { dashboardDropdownRef.current?.removeAttribute('open'); }}>Wearables</NavLink>
                </div>
              </details>
              <NavLink to="/payment" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Subscription</NavLink>
              <NavLink to="/referral" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Referral</NavLink>
              <NavLink to="/profile" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Settings</NavLink>
            </>
          )}
        </nav>
        <div className="profile-shell" ref={profileRef}>
          {isLoggedIn && (
            <>
              <button className="profile-button icon-only" onClick={handleProfileClick} aria-label="Open profile">
                <span className="avatar">
                  {(DEV_BYPASS_AUTH ? DEV_USER.name : currentUser?.name || '')
                    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'RR'}
                </span>
              </button>
              {profileOpen && (
                <div className="profile-popover menu-only">
                  <div className="popover-column">
                    <div className="menu-card">
                      <div className="menu-header">
                        <span className="avatar large">
                          {(DEV_BYPASS_AUTH ? DEV_USER.name : currentUser?.name || '')
                            .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'RR'}
                        </span>
                        <div>
                          <div className="menu-title">{DEV_BYPASS_AUTH ? DEV_USER.name : (currentUser?.name || 'Your account')}</div>
                          <div className="menu-sub">{DEV_BYPASS_AUTH ? DEV_USER.email : (currentUser?.email || '')}</div>
                        </div>
                      </div>
                      <div className="menu-list">
                        <Link to="/profile" onClick={() => setProfileOpen(false)}>View Profile</Link>
                        <button className="menu-signout" type="button" onClick={handleSignOut}>Sign Out</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </header>

      {authOpen && !isLoggedIn && (
        <div className="auth-modal" onClick={() => setAuthOpen(false)}>
          <div className="auth-card" onClick={(event) => event.stopPropagation()}>
            <div className="auth-card-header">
              <div>
                <h2>Welcome back</h2>
                <p>Sign in or create a new account in seconds.</p>
              </div>
              <button className="icon-close" type="button" onClick={() => setAuthOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            {authMode !== 'forgot' && (
            <div className="popover-tabs">
              <button
                className={`tab-chip${authMode === 'signin' ? ' active' : ''}`}
                onClick={() => handleAuthModeChange('signin')}
              >
                Sign In
              </button>
              <button
                className={`tab-chip${authMode === 'signup' ? ' active' : ''}`}
                onClick={() => handleAuthModeChange('signup')}
              >
                Sign Up
              </button>
            </div>
            )}
            {authMode === 'forgot' && (
              <form className="popover-form compact" onSubmit={handleForgotSubmit} noValidate>
                <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--muted)' }}>
                  Enter your email and we'll send a reset link.
                </p>
                <label className="field-label">
                  Email
                  <input
                    className="field-input"
                    type="email"
                    value={formData.email}
                    autoFocus
                    onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </label>
                <button className="solid-btn" type="submit" disabled={authStatus === 'loading'}>
                  {authStatus === 'loading' ? 'Sending…' : 'Send reset link'}
                </button>
                {authMessage && (
                  <div className={authStatus === 'error' ? 'form-error' : 'form-success'}>{authMessage}</div>
                )}
                <button
                  type="button"
                  onClick={() => handleAuthModeChange('signin')}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  Back to sign in
                </button>
              </form>
            )}
            {authMode !== 'forgot' && (
            <form className="popover-form compact" onSubmit={handleAuthSubmit} noValidate>
              {authMode === 'signup' && (
                <label className="field-label">
                  Name
                  <input
                    className="field-input"
                    value={formData.name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </label>
              )}
              <label className="field-label">
                Email
                <input
                  className="field-input"
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                />
              </label>
              <label className="field-label">
                Password
                <input
                  className="field-input"
                  type="password"
                  value={formData.password}
                  onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                />
              </label>
              <button className="solid-btn" type="submit" disabled={authStatus === 'loading'}>
                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
              {authMode === 'signin' && (
                <button
                  type="button"
                  onClick={() => handleAuthModeChange('forgot')}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', padding: 0, textAlign: 'left' }}
                >
                  Forgot password?
                </button>
              )}
              {authMessage && (
                <div className={authStatus === 'error' ? 'form-error' : 'form-success'}>{authMessage}</div>
              )}
            </form>
            )}
            {authMode !== 'forgot' && (
            <div className="social-buttons">
              <a className="social-btn google" href={`${API_URL}/api/auth/oauth/google`}>
                <svg
                  className="social-icon google-multi"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.2 0 5.4 1.4 6.7 2.6l4.9-4.9C32.6 4.4 28.8 2.5 24 2.5 14.9 2.5 7.1 7.9 3.4 15.7l5.8 4.5C11.4 13.6 17.2 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v7.8h12.7c-.3 2-1.6 5-4.6 7.1l5.7 4.4c3.4-3.1 5.7-7.8 5.7-15.2z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M9.2 28.2c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-5.8-4.5C1.9 16.7 1 20.1 1 23.5s.9 6.8 2.4 9.7l5.8-4.5z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 44.5c6.5 0 12-2.1 16-5.8l-5.7-4.4c-1.5 1-3.5 1.8-10.3 1.8-6.7 0-12.4-4.1-14.4-9.8l-5.8 4.5C7.1 39.1 14.9 44.5 24 44.5z"
                  />
                </svg>
                <span className="sr-only">Continue with Google</span>
              </a>
              <a className="social-btn apple" href={`${API_URL}/api/auth/oauth/apple`}>
                <FaApple className="social-icon" />
                <span className="sr-only">Continue with Apple</span>
              </a>
              <a className="social-btn facebook" href={`${API_URL}/api/auth/oauth/facebook`}>
                <FaFacebookF className="social-icon" />
                <span className="sr-only">Continue with Facebook</span>
              </a>
              <a className="social-btn twitter" href={`${API_URL}/api/auth/oauth/twitter`}>
                <FaXTwitter className="social-icon" />
                <span className="sr-only">Continue with Twitter</span>
              </a>
            </div>
            )}
          </div>
        </div>
      )}

      <main className="page" key={location.pathname}>
        <Outlet />
      </main>


      <ChatWidget />
      <CookieBanner />

      <footer className={`marketing-footer${footerVisible ? '' : ' hidden'}`}>
        <span>© 2025 Reprummble</span>
        <div>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/contact">Support</Link>
        </div>
      </footer>
    </div>
  );
}

