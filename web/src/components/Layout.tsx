import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FaApple, FaFacebookF } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { Menu, X } from 'lucide-react';
import { DEV_BYPASS_AUTH, DEV_USER } from '../config/devAuth';
import api from '../config/api';
import { supabase, auth as supabaseAuth } from '../config/supabase';
import ChatWidget from './chat/ChatWidget';
import CookieBanner from './CookieBanner';
import { useAnalytics } from '../hooks/useAnalytics';
import SiteFooter from './site/SiteFooter';
import '../styles/site.css';

const PRIVATE_ROUTES = ['/analytics', '/reports', '/referral', '/profile', '/wearables'];
const LIGHT_ROUTES = ['/', '/features', '/pricing', '/for-gyms'];
const navClass = ({ isActive }: { isActive: boolean }) => `rr-nav-link${isActive ? ' active' : ''}`;

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
  const [scrolled, setScrolled] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const profileRef = useRef<HTMLDivElement>(null);
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

  const isLight = LIGHT_ROUTES.includes(location.pathname);
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('theme-light', isLight);
  }, [isLight]);

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
      setScrolled(scrollY > 8);
      if (scrollY <= 80) setHeaderVisible(true);
      else setHeaderVisible(scrollY < lastScroll.current);
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

  // Reveal-on-scroll; the MutationObserver catches sections rendered after data loads.
  useEffect(() => {
    const SELECTOR = '[data-reveal], [data-stagger]';
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((n) => n.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    const watch = (root: ParentNode) => {
      root.querySelectorAll<HTMLElement>(SELECTOR).forEach((n) => {
        if (!n.classList.contains('is-visible')) io.observe(n);
      });
    };
    watch(document);
    const mo = new MutationObserver((mutations) => {
      mutations.forEach((m) => m.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches(SELECTOR)) io.observe(node);
        watch(node);
      }));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
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
        navigate('/', { replace: true });
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

  // Starts social sign-in in the browser via Supabase, so visitors go straight from
  // reprummble.com to the provider instead of bouncing through the API host.
  const handleOAuth = async (provider: 'google' | 'apple' | 'facebook' | 'twitter') => {
    setAuthStatus('loading');
    setAuthMessage('');
    const { error } = await supabaseAuth.signInWithOAuth(provider);
    if (error) {
      setAuthStatus('error');
      setAuthMessage(error.message);
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
    <>
    <div className="marketing-page">
      <div className={`route-transition${transitioning ? ' active' : ''}`} aria-hidden="true">
        <span />
        <span />
      </div>
      <header className={`rr-header${scrolled ? ' is-scrolled' : ''}${headerVisible || mobileMenuOpen ? '' : ' is-hidden'}${mobileMenuOpen ? ' menu-open' : ''}`}>
        <div className="rr-container rr-header-inner">
          <Link to="/" className="rr-logo" aria-label="Reprummble home">
            <span className="rr-logo-mark">RR</span>
            <span className="rr-logo-name">Reprummble</span>
          </Link>
          <nav className="rr-nav" aria-label="Main">
            {!isLoggedIn ? (
              <>
                <NavLink to="/pricing" className={navClass}>Pricing</NavLink>
                <NavLink to="/faq" className={navClass}>FAQ</NavLink>
                <NavLink to="/contact" className={navClass}>Contact</NavLink>
                <div className="rr-nav-mobile-actions">
                  <button className="rr-btn rr-btn-outline" onClick={() => { setAuthMode('signin'); setAuthOpen(true); setMobileMenuOpen(false); }}>Sign in</button>
                  <button className="rr-btn rr-btn-primary" onClick={() => { setAuthMode('signup'); setAuthOpen(true); setMobileMenuOpen(false); }}>Start free</button>
                </div>
              </>
            ) : (
              <>
                <NavLink to="/pricing" className={navClass}>Pricing</NavLink>
                <NavLink to="/faq" className={navClass}>FAQ</NavLink>
                <NavLink to="/contact" className={navClass}>Contact</NavLink>
                <div className="rr-nav-mobile-actions">
                  <button className="rr-btn rr-btn-outline" onClick={handleSignOut}>Sign out</button>
                </div>
              </>
            )}
          </nav>
          {!isLoggedIn ? (
            <div className="rr-header-actions rr-desktop-only">
              <button className="rr-nav-link" onClick={() => { setAuthMode('signin'); setAuthOpen(true); }}>Sign in</button>
              <button className="rr-btn rr-btn-primary" onClick={() => { setAuthMode('signup'); setAuthOpen(true); }}>Start free</button>
            </div>
          ) : (
            <div className="rr-header-actions rr-desktop-only">
              <button className="rr-nav-link" onClick={handleSignOut}>Sign out</button>
            </div>
          )}
          {isLoggedIn && (
            <div className="profile-shell" ref={profileRef}>
              <button className="rr-avatar-btn" onClick={handleProfileClick} aria-label="Open profile">
                {(DEV_BYPASS_AUTH ? DEV_USER.name : currentUser?.name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'RR'}
              </button>
              {profileOpen && (
                <div className="rr-popover">
                  <div>
                    <div className="rr-popover-name">{DEV_BYPASS_AUTH ? DEV_USER.name : (currentUser?.name || 'Your account')}</div>
                    <div className="rr-popover-email">{DEV_BYPASS_AUTH ? DEV_USER.email : (currentUser?.email || '')}</div>
                  </div>
                  <Link to="/profile" onClick={() => setProfileOpen(false)}>Account settings</Link>
                  <Link to="/payment" onClick={() => setProfileOpen(false)}>Billing & subscription</Link>
                  <button type="button" onClick={handleSignOut}>Sign out</button>
                </div>
              )}
            </div>
          )}
          <button
            className="rr-menu-btn"
            onClick={() => setMobileMenuOpen((p) => !p)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {authOpen && !isLoggedIn && (
        <div className="auth-modal" onClick={() => setAuthOpen(false)}>
          <div className="auth-card rr-auth" onClick={(event) => event.stopPropagation()}>
            <div className="auth-card-header">
              <div>
                <h2>{authMode === 'signup' ? 'Create your free account' : authMode === 'forgot' ? 'Reset your password' : 'Welcome back'}</h2>
                <p>{authMode === 'signup' ? 'No card needed. Upgrade anytime.' : 'Sign in to continue your training.'}</p>
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
              <button type="button" className="social-btn google" onClick={() => handleOAuth('google')} disabled={authStatus === 'loading'}>
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
              </button>
              <button type="button" className="social-btn apple" onClick={() => handleOAuth('apple')} disabled={authStatus === 'loading'}>
                <FaApple className="social-icon" />
                <span className="sr-only">Continue with Apple</span>
              </button>
              <button type="button" className="social-btn facebook" onClick={() => handleOAuth('facebook')} disabled={authStatus === 'loading'}>
                <FaFacebookF className="social-icon" />
                <span className="sr-only">Continue with Facebook</span>
              </button>
              <button type="button" className="social-btn twitter" onClick={() => handleOAuth('twitter')} disabled={authStatus === 'loading'}>
                <FaXTwitter className="social-icon" />
                <span className="sr-only">Continue with Twitter</span>
              </button>
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

    </div>
    <SiteFooter />
    </>
  );
}

