import React, { useState } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Mail, MessageCircle } from 'lucide-react';
import { openChat } from '../components/chat/openChat';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function Contact() {
  usePageMeta({
    title: 'Contact Us',
    description: 'Get in touch with the Reprummble team. We respond to all support requests quickly.',
    canonical: '/contact',
  });
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    message: '',
    website: '', // honeypot — bots fill this, humans don't
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Honeypot check — silently discard bot submissions
    if (form.website) {
      setStatus('success');
      setMessage('Message sent. We will reply soon.');
      return;
    }

    const name = form.name.trim();
    const email = form.email.trim();
    const msg = form.message.trim();

    if (name.length < 2) {
      setStatus('error');
      setMessage('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }
    if (msg.length < 10) {
      setStatus('error');
      setMessage('Message must be at least 10 characters.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message: msg }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Unable to send message');
      }

      setStatus('success');
      setMessage(data?.message || 'Message sent. We will reply soon.');
      setForm({ name: '', email: '', message: '', website: '' });
    } catch (error: unknown) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <div className="rr-page">
      <header className="rr-pagehead">
        <div className="rr-container">
          <span className="rr-eyebrow">Contact</span>
          <h1>We're here <span className="rr-gradient-text">to help.</span></h1>
          <p>Tell us what you need and a real person will reply within 24 hours on weekdays.</p>
        </div>
      </header>

      <section className="rr-section" style={{ paddingTop: 16 }}>
        <div className="rr-container rr-split" style={{ alignItems: 'start' }}>
          <div className="rr-card" style={{ padding: 'clamp(22px, 4vw, 36px)' }}>
            <form className="rr-form" onSubmit={handleSubmit} noValidate>
              {/* Honeypot field: visually hidden, bots fill it */}
              <label className="hp-field" aria-hidden="true">
                <span>Leave this empty</span>
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                />
              </label>
              <div className="rr-form-row">
                <label className="rr-field">Name
                  <input className="rr-input" value={form.name} maxLength={80} autoComplete="name"
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                </label>
                <label className="rr-field">Email
                  <input className="rr-input" type="email" value={form.email} maxLength={254} autoComplete="email"
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
                </label>
              </div>
              <label className="rr-field">Message
                <textarea className="rr-input" rows={6} value={form.message} maxLength={2000}
                  onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} />
              </label>
              {message && <div className={status === 'error' ? 'rr-msg-err' : 'rr-msg-ok'} role="alert">{message}</div>}
              <button className="rr-btn rr-btn-primary rr-btn-lg" type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div className="rr-card">
              <span className="rr-icon"><MessageCircle size={22} /></span>
              <h3>Need an answer right now?</h3>
              <p>Rumi, our assistant, replies instantly about plans, billing, and getting started.</p>
              <div><button type="button" className="rr-btn rr-btn-outline" onClick={() => openChat()}>Chat with Rumi</button></div>
            </div>
            <div className="rr-card">
              <span className="rr-icon is-orange"><Mail size={22} /></span>
              <h3>Email us</h3>
              <p><a className="rr-link-arrow" href="mailto:support@reprummble.com">support@reprummble.com</a></p>
              <p style={{ fontSize: 14 }}>Replies within 24 hours on weekdays. For billing, refunds, or account deletion, email us from the address on your account.</p>
            </div>
            <div className="rr-card">
              <span className="rr-icon is-violet"><Building2 size={22} /></span>
              <h3>Run a gym or business?</h3>
              <p>Apply to collaborate and get access to the business dashboard.</p>
              <div><Link className="rr-link-arrow" to="/collaborate#apply">Apply to collaborate <ArrowRight size={16} /></Link></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
