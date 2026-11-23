import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { POSTS, fmtDate } from '../content/posts';

export default function Blog() {
  usePageMeta({
    title: 'Blog',
    description: 'How Reprummble’s recovery and strain scores work, how the coach builds plans, and how to get the most from your wearable.',
    canonical: '/blog',
  });
  return (
    <div className="rr-page">
      <header className="rr-pagehead">
        <div className="rr-container">
          <span className="rr-eyebrow">Learn</span>
          <h1>How it works, <span className="rr-gradient-text">in plain words.</span></h1>
          <p>The maths behind your scores and plans, written so you can check our working.</p>
        </div>
      </header>
      <section className="rr-section" style={{ paddingTop: 16 }}>
        <div className="rr-container">
          <ul className="rr-blog-grid">
            {POSTS.map((p) => (
              <li key={p.slug}>
                <Link to={`/blog/${p.slug}`} className="rr-blog-card">
                  <span className="rr-blog-tag">{p.tag}</span>
                  <h2>{p.title}</h2>
                  <p>{p.description}</p>
                  <span className="rr-blog-meta">{fmtDate(p.date)} · {p.readMins} min read <ArrowRight size={14} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
