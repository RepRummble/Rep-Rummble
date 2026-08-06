import React, { useState } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function Contact() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Unable to send message');
      }

      setStatus('success');
      setMessage(data?.message || 'Message sent. We will reply soon.');
      setForm({ name: '', email: '', message: '' });
    } catch (error: unknown) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <section className="section page-section contact-page" data-reveal>
      <div className="section-head">
        <h2>Contact us</h2>
        <p>Tell us what you need and we will get back quickly.</p>
      </div>

      <form className="form-card contact-form" data-reveal onSubmit={handleSubmit}>
        <label className="field-label">
          Name
          <input
            className="field-input"
            value={form.name}
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
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
        </label>
        <label className="field-label">
          Message
          <textarea
            className="field-input text-area"
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            required
          />
        </label>
        <button className="solid-btn" type="submit" disabled={status === 'loading'}>
          Send Message
        </button>
        {message && (
          <div className={status === 'error' ? 'form-error' : 'form-success'}>{message}</div>
        )}
      </form>
    </section>
  );
}
