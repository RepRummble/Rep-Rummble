import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { POSTS, bySlug, fmtDate } from '../content/posts';
import NotFound from './NotFound';

export default function BlogPost() {
  const { slug = '' } = useParams();
  const post = bySlug(slug);
  usePageMeta({ title: post?.title ?? 'Not found', description: post?.description, canonical: post ? `/blog/${post.slug}` : '/blog' });
  if (!post) return <NotFound />;
  const more = POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);
  const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description: post.description, datePublished: post.date, author: { '@type': 'Organization', name: 'Reprummble' }, publisher: { '@type': 'Organization', name: 'Reprummble', logo: { '@type': 'ImageObject', url: 'https://reprummble.com/favicon.svg' } }, mainEntityOfPage: `https://reprummble.com/blog/${post.slug}` };
  return (
    <div className="rr-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <header className="rr-pagehead">
        <div className="rr-container rr-post-head">
          <Link to="/blog" className="rr-post-back"><ArrowLeft size={16} /> All articles</Link>
          <span className="rr-eyebrow">{post.tag}</span>
          <h1>{post.title}</h1>
          <p className="rr-legal-updated">{fmtDate(post.date)} · {post.readMins} min read</p>
        </div>
      </header>
      <article className="rr-section" style={{ paddingTop: 8 }}>
        <div className="rr-container rr-post">
          {post.body.map((b, i) => {
            if ('h' in b) return <h2 key={i}>{b.h}</h2>;
            if ('p' in b) return <p key={i}>{b.p}</p>;
            if ('ul' in b) return <ul key={i}>{b.ul.map((x) => <li key={x}>{x}</li>)}</ul>;
            return <p key={i} className="rr-post-note">{b.note}</p>;
          })}
          <div className="rr-post-cta">
            <strong>See it in the app.</strong> Start free on the web, and join the waitlist for the iPhone and Android apps.
            <Link className="rr-btn rr-btn-primary" to="/?auth=signup">Start free <ArrowRight size={16} /></Link>
          </div>
          {more.length > 0 && (
            <nav className="rr-post-more" aria-label="More articles">
              <h2>Keep reading</h2>
              <ul>{more.map((p) => <li key={p.slug}><Link to={`/blog/${p.slug}`}>{p.title}</Link></li>)}</ul>
            </nav>
          )}
        </div>
      </article>
    </div>
  );
}
