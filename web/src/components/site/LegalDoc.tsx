import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface LegalSection {
  id: string;
  title: string;
  summary: string;
  details: ReactNode;
}

/** Shared layout for the Privacy Policy and Terms of Service: a contents list beside the full text. */
export default function LegalDoc({ badge, title, updated, lead, sections }: {
  badge: string; title: string; updated: string; lead: string; sections: LegalSection[];
}) {
  return (
    <div className="rr-page">
      <header className="rr-pagehead">
        <div className="rr-container">
          <span className="rr-eyebrow">{badge}</span>
          <h1>{title}</h1>
          <p>{lead}</p>
          <p className="rr-legal-updated">Last updated: {updated}</p>
        </div>
      </header>

      <section className="rr-section" style={{ paddingTop: 16 }}>
        <div className="rr-container rr-legal">
          <nav className="rr-legal-toc" aria-label="Contents">
            <strong>On this page</strong>
            <ol>
              {sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}
            </ol>
          </nav>

          <div className="rr-legal-body">
            {sections.map((s) => (
              <section id={s.id} key={s.id}>
                <h2>{s.title}</h2>
                <p className="rr-legal-summary">{s.summary}</p>
                {s.details}
              </section>
            ))}
            <p className="rr-legal-foot">
              Questions? <Link to="/contact">Contact us</Link> or ask Rumi using the chat button in the corner.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
