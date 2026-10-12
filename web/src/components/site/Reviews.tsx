import React, { useEffect, useState } from 'react';
import { usePublicStats } from '../../hooks/usePublicStats';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface Review {
  _id: string;
  name: string;
  rating: number;
  text: string;
  source: string;
  createdAt: string;
}

function fmtCount(n: number): string {
  if (n >= 10000) return `${Math.floor(n / 1000)}k+`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k+`;
  return n.toLocaleString();
}

export function LiveStats() {
  const stats = usePublicStats();
  if (!stats) return null;
  const items = [
    { value: stats.userCount, label: 'Members' },
    { value: stats.workoutCount, label: 'Workouts completed' },
  ].filter((i) => i.value > 0);
  if (stats.averageRating !== null && stats.reviewCount > 0) {
    items.push({ value: -1, label: `Average from ${stats.reviewCount} review${stats.reviewCount === 1 ? '' : 's'}` });
  }
  if (items.length === 0) return null;
  return (
    <div style={{ textAlign: 'center' }} data-reveal>
      <div className="rr-stats">
        {items.map((i) => (
          <div className="rr-stat" key={i.label}>
            <span className="rr-stat-value">{i.value === -1 ? `${stats.averageRating}★` : fmtCount(i.value)}</span>
            <span className="rr-stat-label">{i.label}</span>
          </div>
        ))}
      </div>
      <div className="rr-live"><i /> Live numbers from our platform</div>
    </div>
  );
}

const SOURCE_LABEL: Record<string, string> = { web: 'Website review', 'in-app': 'In-app review', google: 'Google review' };

export function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/reviews`)
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews || []))
      .catch(() => setReviews([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Please add your name.');
    if (!rating) return setError('Please choose a star rating.');
    if (text.trim().length < 10) return setError('Please write at least 10 characters.');
    setError('');
    setStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), rating, text: text.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <>
      {reviews && reviews.length > 0 ? (
        <div className="rr-grid-3" data-stagger>
          {reviews.slice(0, 6).map((r) => (
            <article className="rr-review" key={r._id}>
              <div className="rr-stars" aria-label={`${r.rating} out of 5 stars`}>
                {'★'.repeat(r.rating)}<span style={{ color: '#d0d5dd' }}>{'★'.repeat(5 - r.rating)}</span>
              </div>
              <p>{r.text}</p>
              <div className="rr-review-author">
                <div className="rr-review-avatar">{r.name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <div className="rr-review-name">{r.name}</div>
                  <div className="rr-review-src">{SOURCE_LABEL[r.source] ?? 'Review'}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : reviews ? (
        <div className="rr-empty">
          <h3>We're just getting started</h3>
          <p>No reviews yet. Tried Reprummble? Be the first to share an honest one.</p>
        </div>
      ) : null}

      <div style={{ maxWidth: 520, margin: '28px auto 0', textAlign: 'center' }}>
        {status === 'done' ? (
          <div className="rr-msg-ok">Thank you! Your review will appear here once it's approved.</div>
        ) : !open ? (
          <button className="rr-btn rr-btn-outline" onClick={() => setOpen(true)}>Write a review</button>
        ) : (
          <form className="rr-form" onSubmit={submit} style={{ textAlign: 'left' }} noValidate>
            <label className="rr-field">
              Your name
              <input className="rr-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </label>
            <div className="rr-field">
              Rating
              <div className="rr-star-pick" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={n <= rating ? 'on' : ''}
                    onClick={() => setRating(n)}
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  >★</button>
                ))}
              </div>
            </div>
            <label className="rr-field">
              Your experience
              <textarea className="rr-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
            </label>
            {error && <div className="rr-msg-err">{error}</div>}
            {status === 'error' && <div className="rr-msg-err">Something went wrong. Please try again.</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="rr-btn rr-btn-primary" type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? 'Submitting…' : 'Submit review'}
              </button>
              <button className="rr-btn rr-btn-outline" type="button" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
