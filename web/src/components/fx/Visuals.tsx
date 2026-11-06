import { useMemo, useRef, useState } from 'react';
import { Apple, Flame, Heart, Moon, Trophy, Watch } from 'lucide-react';
import { CountUp } from './Effects';
import { useFrameLoop, useInView, usePrefersReducedMotion } from './hooks';

// Small illustrative visuals for the feature tiles. Sample values, not user data.

/** A heartbeat trace that keeps scrolling. */
export function PulseLine() {
  const path = 'M0 40 L40 40 L52 40 L58 20 L66 62 L74 8 L82 48 L90 40 L150 40 L162 40 L168 24 L176 58 L184 14 L192 46 L200 40 L260 40';
  return (
    <div className="fx-pulse">
      <div className="fx-pulse-head"><Heart size={15} /> <span>Resting HR</span><b className="fx-num"><CountUp to={56} /> bpm</b></div>
      <svg viewBox="0 0 260 80" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="pulseFade" x1="0" x2="1"><stop offset="0" stopColor="#14b8a6" stopOpacity="0" /><stop offset=".5" stopColor="#14b8a6" /><stop offset="1" stopColor="#14b8a6" stopOpacity="0" /></linearGradient></defs>
        <path d={path} className="fx-pulse-trace" fill="none" stroke="url(#pulseFade)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Readiness as a ring that fills when it comes into view. */
export function ReadinessRing({ score = 84 }: { score?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const seen = useInView(ref);
  const r = 46, c = 2 * Math.PI * r;
  return (
    <div className="fx-ready">
      <svg ref={ref} viewBox="0 0 120 120" aria-hidden="true">
        <defs><linearGradient id="readyGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5eead4" /><stop offset="1" stopColor="#0f766e" /></linearGradient></defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(15,118,110,.12)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="url(#readyGrad)" strokeWidth="10" strokeLinecap="round" transform="rotate(-90 60 60)" strokeDasharray={c} strokeDashoffset={seen ? c * (1 - score / 100) : c} style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="fx-ready-text"><b className="fx-num"><CountUp to={score} /></b><span>readiness</span></div>
    </div>
  );
}

/** A night of sleep drawn as stages. */
const STAGES: { s: 'awake' | 'rem' | 'light' | 'deep'; w: number }[] = [
  { s: 'light', w: 9 }, { s: 'deep', w: 14 }, { s: 'light', w: 8 }, { s: 'rem', w: 10 }, { s: 'light', w: 7 }, { s: 'deep', w: 12 },
  { s: 'rem', w: 12 }, { s: 'awake', w: 3 }, { s: 'light', w: 8 }, { s: 'rem', w: 14 }, { s: 'light', w: 3 },
];
export function SleepStages() {
  return (
    <div className="fx-sleep" aria-hidden="true">
      <div className="fx-sleep-bars">
        {STAGES.map((st, i) => <i key={i} className={`st-${st.s}`} style={{ flexGrow: st.w, animationDelay: `${i * 70}ms` }} />)}
      </div>
      <div className="fx-sleep-legend"><span><i className="st-deep" /> Deep</span><span><i className="st-rem" /> REM</span><span><i className="st-light" /> Light</span></div>
      <div className="fx-sleep-meta"><Moon size={14} /> <b className="fx-num">7h 20m</b> asleep</div>
    </div>
  );
}

/** A plate gets scanned and the foods pop up. */
export function MealScan() {
  return (
    <div className="fx-scan" aria-hidden="true">
      <div className="fx-plate">
        <i className="food f1" /><i className="food f2" /><i className="food f3" />
        <span className="fx-scan-beam" />
      </div>
      <span className="fx-tag t1"><Apple size={12} /> Grilled chicken <b>38g P</b></span>
      <span className="fx-tag t2">Brown rice <b>52g C</b></span>
      <span className="fx-tag t3">Broccoli <b>6g F</b></span>
    </div>
  );
}

/** Twelve weeks of training as a heat grid; today pulses. */
export function StreakGrid() {
  const cells = Array.from({ length: 84 }, (_, i) => {
    const seed = Math.sin(i * 12.9898) * 43758.5453;
    const v = seed - Math.floor(seed);
    return i > 77 ? 0 : v > 0.72 ? 3 : v > 0.5 ? 2 : v > 0.28 ? 1 : 0;
  });
  return (
    <div className="fx-streak" aria-hidden="true">
      <div className="fx-streak-grid">{cells.map((v, i) => <i key={i} className={`h${v}${i === 83 ? ' is-today' : ''}`} />)}</div>
      <div className="fx-streak-meta"><Flame size={15} /> <b className="fx-num"><CountUp to={21} /></b> day streak</div>
    </div>
  );
}

/** Wearables orbiting one account. */
export function DeviceOrbit() {
  const items = [{ i: Watch, n: 'Watch' }, { i: Heart, n: 'Strap' }, { i: Moon, n: 'Ring' }, { i: Apple, n: 'Health' }];
  return (
    <div className="fx-orbit" aria-hidden="true">
      <div className="fx-orbit-ring r1" /><div className="fx-orbit-ring r2" />
      <div className="fx-orbit-core">RR</div>
      {items.map(({ i: Icon, n }, idx) => (
        <span key={n} className="fx-orbit-item" style={{ ['--i' as string]: idx, ['--n' as string]: items.length }}><span><Icon size={16} /> {n}</span></span>
      ))}
    </div>
  );
}

/** A challenge board where people overtake each other. */
const BOARD = [
  { n: 'Maya', xp: 4820 }, { n: 'Dev', xp: 4410 }, { n: 'Jordan', xp: 4105 }, { n: 'Sam', xp: 3890 },
];
export function Leaderboard() {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref);
  const [tick, setTick] = useState(0);
  useFrameLoop(seen && !reduced, (s) => setTick(Math.floor(s / 2.6)));
  const order = useMemo(() => {
    const o = [0, 1, 2, 3];
    for (let k = 1; k <= tick; k++) { const i = k % 3; [o[i], o[i + 1]] = [o[i + 1], o[i]]; }
    return o;
  }, [tick]);
  return (
    <div className="fx-board" ref={ref} aria-hidden="true">
      <div className="fx-board-head"><Trophy size={15} /> This week</div>
      <div className="fx-board-list">
        {BOARD.map((p, idx) => {
          const rank = order.indexOf(idx);
          return (
            <div key={p.n} className="fx-board-row" style={{ transform: `translateY(${rank * 100}%)` }}>
              <span className="rk">{rank + 1}</span><span className="av">{p.n[0]}</span><span className="nm">{p.n}</span><b className="fx-num">{p.xp.toLocaleString()}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}
