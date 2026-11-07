import { useEffect, useRef } from 'react';

/* Gym equipment drifting through space behind the site, plus the "hyperspace" flash that plays when the page changes.
   Everything here is decoration: it ignores the pointer and is hidden from screen readers. */

const Metal = () => (
  <defs>
    <linearGradient id="sg-steel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#6b7388" /><stop offset=".45" stopColor="#262c3b" /><stop offset="1" stopColor="#0b0e16" />
    </linearGradient>
    <linearGradient id="sg-plate" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#3a4157" /><stop offset=".55" stopColor="#151a27" /><stop offset="1" stopColor="#07090f" />
    </linearGradient>
    <linearGradient id="sg-rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#ff4d4d" /><stop offset="1" stopColor="#ff9a2e" />
    </linearGradient>
  </defs>
);

function Dumbbell() {
  return (
    <svg viewBox="0 0 240 120" aria-hidden="true"><Metal />
      <rect x="62" y="52" width="116" height="16" rx="6" fill="url(#sg-steel)" stroke="url(#sg-rim)" strokeWidth="1.4" />
      {[[14, 68], [36, 92], [182, 92], [206, 68]].map(([x, h], i) => (
        <rect key={i} x={x} y={60 - h / 2} width="22" height={h} rx="7" fill="url(#sg-plate)" stroke="url(#sg-rim)" strokeWidth="1.4" />
      ))}
      <rect x="86" y="53" width="4" height="14" fill="#ff7a1a" opacity=".5" /><rect x="150" y="53" width="4" height="14" fill="#ff7a1a" opacity=".5" />
    </svg>
  );
}

function Kettlebell() {
  return (
    <svg viewBox="0 0 160 170" aria-hidden="true"><Metal />
      <path d="M50 62 C50 14 110 14 110 62" fill="none" stroke="url(#sg-rim)" strokeWidth="14" strokeLinecap="round" />
      <path d="M50 62 C50 14 110 14 110 62" fill="none" stroke="#10131d" strokeWidth="9" strokeLinecap="round" />
      <circle cx="80" cy="108" r="54" fill="url(#sg-plate)" stroke="url(#sg-rim)" strokeWidth="1.6" />
      <ellipse cx="62" cy="88" rx="14" ry="22" fill="#fff" opacity=".08" transform="rotate(25 62 88)" />
      <circle cx="80" cy="112" r="16" fill="none" stroke="#ff7a1a" strokeWidth="1.6" opacity=".55" />
    </svg>
  );
}

function Plate() {
  return (
    <svg viewBox="0 0 180 180" aria-hidden="true"><Metal />
      <circle cx="90" cy="90" r="84" fill="url(#sg-plate)" stroke="url(#sg-rim)" strokeWidth="2" />
      <circle cx="90" cy="90" r="64" fill="none" stroke="#ff7a1a" strokeWidth="1.2" opacity=".45" />
      <circle cx="90" cy="90" r="44" fill="none" stroke="#fff" strokeWidth="1" opacity=".12" />
      <circle cx="90" cy="90" r="14" fill="#05070d" stroke="url(#sg-rim)" strokeWidth="1.6" />
      <text x="90" y="42" textAnchor="middle" fontSize="12" fontWeight="700" fill="#ff7a1a" opacity=".7" fontFamily="Inter, sans-serif">20 KG</text>
    </svg>
  );
}

function Barbell() {
  return (
    <svg viewBox="0 0 420 100" aria-hidden="true"><Metal />
      <rect x="10" y="44" width="400" height="12" rx="5" fill="url(#sg-steel)" stroke="url(#sg-rim)" strokeWidth="1.2" />
      {[30, 54, 340, 364].map((x, i) => (
        <rect key={i} x={x} y={i % 2 ? 12 : 4} width="18" height={i % 2 ? 76 : 92} rx="6" fill="url(#sg-plate)" stroke="url(#sg-rim)" strokeWidth="1.3" />
      ))}
    </svg>
  );
}

const GEAR = [
  { Art: Dumbbell, x: '6%',  y: '14%', s: 220, d: 28, r: '-24deg', z: 1 },
  { Art: Kettlebell, x: '86%', y: '22%', s: 150, d: 34, r: '14deg', z: 2 },
  { Art: Plate, x: '78%', y: '66%', s: 200, d: 40, r: '0deg', z: 1 },
  { Art: Barbell, x: '10%', y: '72%', s: 330, d: 46, r: '-8deg', z: 3 },
  { Art: Kettlebell, x: '46%', y: '8%', s: 90, d: 30, r: '-20deg', z: 3 },
  { Art: Dumbbell, x: '58%', y: '84%', s: 130, d: 36, r: '28deg', z: 2 },
] as const;

export default function SpaceStage({ path }: { path: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const warp = useRef<HTMLDivElement>(null);

  // Mouse and scroll move the gear at different speeds, so it feels like depth. Values go to CSS variables.
  useEffect(() => {
    const el = stage.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let mx = 0, my = 0;
    const apply = () => {
      raf = 0;
      el.style.setProperty('--mx', String(mx));
      el.style.setProperty('--my', String(my));
      el.style.setProperty('--sy', String(window.scrollY));
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const move = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; queue(); };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('scroll', queue, { passive: true });
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('scroll', queue); if (raf) cancelAnimationFrame(raf); };
  }, []);

  // Replay the hyperspace flash on every page change (not on the very first load).
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const w = warp.current;
    if (!w) return;
    w.classList.remove('is-on');
    void w.offsetWidth; // restart the animation
    w.classList.add('is-on');
  }, [path]);

  return (
    <>
      <div className="sp-stage" ref={stage} aria-hidden="true">
        <i className="sp-stars s1" /><i className="sp-stars s2" /><i className="sp-stars s3" />
        <i className="sp-glow g1" /><i className="sp-glow g2" />
        {GEAR.map(({ Art, x, y, s, d, r, z }, i) => (
          <div key={i} className={`sp-gear z${z}`} style={{ '--x': x, '--y': y, '--s': `${s}px`, '--d': `${d}s`, '--r': r, '--delay': `${-i * 5}s` } as React.CSSProperties}>
            <div className="sp-gear-in"><Art /></div>
          </div>
        ))}
      </div>
      <div className="sp-warp" ref={warp} aria-hidden="true" />
    </>
  );
}
