import React, { useState } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import Breadcrumb from '../components/Breadcrumb';

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
    <section className="section page-section contact-page" data-reveal>
      <Breadcrumb items={[{ label: 'Contact', to: '/contact' }]} />
      <div className="section-head">
        <h1>Contact us</h1>
        <p>Tell us what you need and we will get back quickly.</p>
      </div>

      <form className="form-card contact-form" data-reveal onSubmit={handleSubmit} noValidate>
        {/* Honeypot field — visually hidden, bots fill it */}
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

        <label className="field-label">
          Name
          <input
            className="field-input"
            value={form.name}
            minLength={2}
            maxLength={80}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </label>
        <label className="field-label">
          Email
          <input
            className="field-input"
            type="email"
            value={form.email}
            maxLength={254}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
        </label>
        <label className="field-label">
          Message
          <textarea
            className="field-input text-area"
            value={form.message}
            minLength={10}
            maxLength={2000}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            required
          />
        </label>
        <button className="solid-btn" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Sending…' : 'Send Message'}
        </button>
        {message && (
          <div className={status === 'error' ? 'form-error' : 'form-success'}>{message}</div>
        )}
      </form>
    </section>
  );
}
