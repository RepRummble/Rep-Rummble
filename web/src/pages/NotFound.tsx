import React from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

export default function NotFound() {
  usePageMeta({ title: 'Page Not Found' });
  return (
    <section className="section page-section" data-reveal>
      <div className="section-head">
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist.</p>
      </div>
      <div className="page-actions" data-stagger>
        <Link className="solid-btn" to="/">
          Back to Home
        </Link>
      </div>
    </section>
  );
}
