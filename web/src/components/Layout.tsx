import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FaApple, FaFacebookF } from 'react-icons/fa';
import { Check, Eye, EyeOff, Menu, X } from 'lucide-react';
import { DEV_BYPASS_AUTH, DEV_USER } from '../config/devAuth';
import api from '../config/api';
import { supabase, auth as supabaseAuth } from '../config/supabase';
import ChatWidget from './chat/ChatWidget';
import CookieBanner from './CookieBanner';
import { useAnalytics } from '../hooks/useAnalytics';
import SiteFooter from './site/SiteFooter';
import '../styles/site.css';

const LIGHT_ROUTES = ['/', '/features', '/pricing', '/collaborate', '/faq', '/contact', '/privacy', '/terms', '/oauth/consent'];
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
  const [showPassword, setShowPassword] = useState(false);
  // Set after sign-up (or a sign-in attempt) when the email still has to be verified.
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');
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
      if (authMode === 'signup' && formData.password.length < 8) {
        setAuthStatus('error');
        setAuthMessage('Your password needs at least 8 characters.');
        return;
      }

      const result =
        authMode === 'signin'
          ? await api.auth.login(formData.email, formData.password)
          : await api.auth.register(formData.email, formData.password, formData.name);

      if (result.error) {
        // Signing in before clicking the verification link: offer to send it again.
        if (authMode === 'signin' && /verify your email/i.test(result.error)) {
          setVerifyEmail(formData.email.trim());
          setResendState('idle');
        }
        throw new Error(result.error);
      }

      // New account: Supabase has emailed a link, and nobody is signed in until it is clicked.
      if (authMode === 'signup' && (result.data as { emailVerificationRequired?: boolean } | undefined)?.emailVerificationRequired) {
        setVerifyEmail(formData.email.trim());
        setResendState('idle');
        setAuthStatus('idle');
        setAuthMessage('');
        setFormData((prev) => ({ ...prev, password: '' }));
        return;
      }

      // The API confirms the credentials; this opens the browser session, so the
      // account stays signed in after a reload and works across the dashboard.
      const { error: sessionError } = await supabaseAuth.signIn(formData.email, formData.password);
      if (sessionError) {
        throw new Error(sessionError.message);
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
        navigate('/dashboard', { replace: true });
      }
    } catch (error: unknown) {
      setAuthStatus('error');
      setAuthMessage(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  const handleResend = async () => {
    if (!verifyEmail) return;
    setResendState('sending');
    await api.auth.resendVerification(verifyEmail);
    setResendState('sent');
  };

  const handleAuthModeChange = (mode: 'signin' | 'signup' | 'forgot') => {
    setVerifyEmail(null);
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
                <NavLink to="/features" className={navClass}>Features</NavLink>
                <NavLink to="/pricing" className={navClass}>Pricing</NavLink>
                <NavLink to="/faq" className={navClass}>FAQ</NavLink>
                <NavLink to="/contact" className={navClass}>Contact</NavLink>
                <NavLink to="/collaborate" className={navClass}>Collaboration</NavLink>
                <div className="rr-nav-mobile-actions">
                  <button className="rr-btn rr-btn-outline" onClick={() => { setAuthMode('signin'); setAuthOpen(true); setMobileMenuOpen(false); }}>Sign in</button>
                  <button className="rr-btn rr-btn-primary" onClick={() => { setAuthMode('signup'); setAuthOpen(true); setMobileMenuOpen(false); }}>Start free</button>
                </div>
              </>
            ) : (
              <>
                <NavLink to="/features" className={navClass}>Features</NavLink>
                <NavLink to="/pricing" className={navClass}>Pricing</NavLink>
                <NavLink to="/faq" className={navClass}>FAQ</NavLink>
                <NavLink to="/contact" className={navClass}>Contact</NavLink>
                <NavLink to="/collaborate" className={navClass}>Collaboration</NavLink>
                <div className="rr-nav-mobile-actions">
                  <Link className="rr-btn rr-btn-primary" to="/dashboard">My dashboard</Link>
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
              <Link className="rr-btn rr-btn-primary" to="/dashboard">My dashboard</Link>
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
                  <Link to="/dashboard" onClick={() => setProfileOpen(false)}>My dashboard</Link>
                  <Link to="/dashboard/profile" onClick={() => setProfileOpen(false)}>Account settings</Link>
                  <Link to="/dashboard/billing" onClick={() => setProfileOpen(false)}>Billing</Link>
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
          <div
            className="rr-authcard"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            onClick={(event) => event.stopPropagation()}
          >
            <aside className="rr-auth-aside" aria-hidden="true">
              <Link to="/" className="rr-logo" tabIndex={-1} onClick={() => setAuthOpen(false)}>
                <span className="rr-logo-mark">RR</span>
                <span className="rr-logo-name">Reprummble</span>
              </Link>
              <h3>Your training, on every device.</h3>
              <ul>
                <li><Check size={18} /> Personalized plans built around your goals</li>
                <li><Check size={18} /> Log meals with a photo</li>
                <li><Check size={18} /> One account on iPhone, Android, and web</li>
              </ul>
              <p className="rr-auth-aside-note">Free plan. No card needed.</p>
            </aside>

            <div className="rr-auth-main">
              <button className="rr-auth-x" type="button" onClick={() => { setAuthOpen(false); setVerifyEmail(null); }} aria-label="Close"><X size={18} /></button>
              <div className="rr-auth-head">
                <h2 id="auth-title">
                  {verifyEmail && authMode !== 'forgot' ? 'Check your inbox' : authMode === 'signup' ? 'Create your free account' : authMode === 'forgot' ? 'Reset your password' : 'Welcome back'}
                </h2>
                <p>
                  {verifyEmail && authMode !== 'forgot' ? 'One more step to finish.' : authMode === 'signup' ? 'Start in two minutes. Upgrade anytime.' : authMode === 'forgot' ? "Enter your email and we'll send a reset link." : 'Sign in to continue your training.'}
                </p>
              </div>

              {verifyEmail && authMode !== 'forgot' ? (
                <div className="rr-auth-verify">
                  <p>
                    We sent a verification link to <strong>{verifyEmail}</strong>. Click it to confirm your email, then sign in.
                    It can take a minute, and it may land in your spam folder.
                  </p>
                  <button type="button" className="rr-btn rr-btn-outline rr-btn-block" onClick={handleResend} disabled={resendState !== 'idle'}>
                    {resendState === 'sending' ? 'Sending…' : resendState === 'sent' ? 'Sent. Check your inbox' : 'Resend verification email'}
                  </button>
                  <button type="button" className="rr-auth-link" onClick={() => { setVerifyEmail(null); setAuthMode('signin'); setAuthMessage(''); setAuthStatus('idle'); }}>← Back to sign in</button>
                </div>
              ) : authMode === 'forgot' ? (
                <form className="rr-auth-form" onSubmit={handleForgotSubmit} noValidate>
                  <label className="rr-auth-field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={formData.email}
                      autoFocus
                      autoComplete="email"
                      placeholder="you@example.com"
                      onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  </label>
                  <button className="rr-btn rr-btn-primary rr-btn-block" type="submit" disabled={authStatus === 'loading'}>
                    {authStatus === 'loading' ? 'Sending…' : 'Send reset link'}
                  </button>
                  {authMessage && <div className={`rr-auth-msg ${authStatus === 'error' ? 'is-error' : 'is-ok'}`} role="alert">{authMessage}</div>}
                  <button type="button" className="rr-auth-link" onClick={() => handleAuthModeChange('signin')}>← Back to sign in</button>
                </form>
              ) : (
                <>
                  <div className="rr-auth-tabs" role="tablist">
                    <button type="button" role="tab" aria-selected={authMode === 'signin'} className={authMode === 'signin' ? 'active' : ''} onClick={() => handleAuthModeChange('signin')}>Sign in</button>
                    <button type="button" role="tab" aria-selected={authMode === 'signup'} className={authMode === 'signup' ? 'active' : ''} onClick={() => handleAuthModeChange('signup')}>Sign up</button>
                  </div>

                  <div className="rr-auth-social">
                    <button type="button" className="rr-social" onClick={() => handleOAuth('google')} disabled={authStatus === 'loading'}>
                      <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true" focusable="false">
                        <path fill="#EA4335" d="M24 9.5c3.2 0 5.4 1.4 6.7 2.6l4.9-4.9C32.6 4.4 28.8 2.5 24 2.5 14.9 2.5 7.1 7.9 3.4 15.7l5.8 4.5C11.4 13.6 17.2 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v7.8h12.7c-.3 2-1.6 5-4.6 7.1l5.7 4.4c3.4-3.1 5.7-7.8 5.7-15.2z" />
                        <path fill="#FBBC05" d="M9.2 28.2c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-5.8-4.5C1.9 16.7 1 20.1 1 23.5s.9 6.8 2.4 9.7l5.8-4.5z" />
                        <path fill="#34A853" d="M24 44.5c6.5 0 12-2.1 16-5.8l-5.7-4.4c-1.5 1-3.5 1.8-10.3 1.8-6.7 0-12.4-4.1-14.4-9.8l-5.8 4.5C7.1 39.1 14.9 44.5 24 44.5z" />
                      </svg>
                      Continue with Google
                    </button>
                    <button type="button" className="rr-social" onClick={() => handleOAuth('apple')} disabled={authStatus === 'loading'}>
                      <FaApple size={20} aria-hidden="true" /> Continue with Apple
                    </button>
                    <button type="button" className="rr-social" onClick={() => handleOAuth('facebook')} disabled={authStatus === 'loading'}>
                      <FaFacebookF size={18} color="#1877f2" aria-hidden="true" /> Continue with Facebook
                    </button>
                  </div>

                  <div className="rr-auth-or"><span>or use your email</span></div>

                  <form className="rr-auth-form" onSubmit={handleAuthSubmit} noValidate>
                    {authMode === 'signup' && (
                      <label className="rr-auth-field">
                        <span>Name</span>
                        <input
                          value={formData.name}
                          autoComplete="name"
                          placeholder="Your name"
                          onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                        />
                      </label>
                    )}
                    <label className="rr-auth-field">
                      <span>Email</span>
                      <input
                        type="email"
                        value={formData.email}
                        autoComplete="email"
                        placeholder="you@example.com"
                        onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                      />
                    </label>
                    <label className="rr-auth-field">
                      <span className="rr-auth-field-row">
                        Password
                        {authMode === 'signin' && (
                          <button type="button" className="rr-auth-link" onClick={() => handleAuthModeChange('forgot')}>Forgot password?</button>
                        )}
                      </span>
                      <span className="rr-auth-pw">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                          placeholder={authMode === 'signup' ? 'At least 8 characters' : 'Your password'}
                          onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                        />
                        <button type="button" className="rr-auth-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </span>
                    </label>
                    <button className="rr-btn rr-btn-primary rr-btn-block" type="submit" disabled={authStatus === 'loading'}>
                      {authStatus === 'loading' ? 'Please wait…' : authMode === 'signin' ? 'Sign in' : 'Create account'}
                    </button>
                    {authMessage && <div className={`rr-auth-msg ${authStatus === 'error' ? 'is-error' : 'is-ok'}`} role="alert">{authMessage}</div>}
                  </form>

                  <p className="rr-auth-legal">
                    By continuing you agree to our <Link to="/terms" onClick={() => setAuthOpen(false)}>Terms</Link> and <Link to="/privacy" onClick={() => setAuthOpen(false)}>Privacy Policy</Link>.
                  </p>
                </>
              )}
            </div>
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

