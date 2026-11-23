import { SCREEN_FILES } from '../../lib/screens';

/** Screenshots used in the hero and feature sections are not repeated in the gallery. */
const RESERVED = /^(hero|feature-)/i;

const caption = (path: string) => {
  const name = (path.split('/').pop() ?? '').replace(/\.[a-z]+$/i, '').replace(/^\d+[-_ ]*/, '').replace(/[-_]+/g, ' ').trim();
  return name ? name[0].toUpperCase() + name.slice(1) : 'Reprummble';
};

export default function ScreenGallery() {
  const shots = Object.entries(SCREEN_FILES).filter(([p]) => !RESERVED.test(p.split('/').pop() ?? '')).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  if (shots.length === 0) return null;
  return (
    <section className="fx-section" aria-labelledby="screens-title">
      <div className="rr-container">
        <div className="fx-head" data-reveal>
          <span className="fx-eyebrow">The real app</span>
          <h2 id="screens-title">See it on a real phone</h2>
          <p>Screenshots from the app, taken with a real account.</p>
        </div>
        <ul className="rr-shots" data-stagger>
          {shots.map(([path, url]) => (
            <li key={path}>
              <img src={url} alt={caption(path)} loading="lazy" decoding="async" />
              <span>{caption(path)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
