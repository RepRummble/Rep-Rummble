import { useEffect, useRef, useState, type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import { clamp, usePrefersReducedMotion, useInView } from './hooks';

/** A card with a soft light that follows the pointer. */
export function SpotlightCard({ as, className = '', children, ...rest }: { as?: ElementType; className?: string; children: ReactNode } & HTMLAttributes<HTMLElement>) {
  const Tag = as ?? 'div';
  return (
    <Tag
      {...rest}
      className={`fx-spot ${className}`}
      onPointerMove={(e: React.PointerEvent<HTMLElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </Tag>
  );
}

/** Leans toward the pointer in 3D. Off for touch screens and reduced motion. */
export function TiltCard({ className = '', children, max = 7 }: { className?: string; children: ReactNode; max?: number }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const set = (rx: number, ry: number) => {
    ref.current?.style.setProperty('--rx', `${rx}deg`);
    ref.current?.style.setProperty('--ry', `${ry}deg`);
  };
  return (
    <div
      ref={ref}
      className={`fx-tilt ${className}`}
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        set(clamp(-y * max * 2, -max, max), clamp(x * max * 2, -max, max));
      }}
      onPointerLeave={() => set(0, 0)}
    >
      {children}
    </div>
  );
}

/** Drifts a little toward the pointer, so buttons feel alive. */
export function Magnetic({ children, strength = 0.3 }: { children: ReactNode; strength?: number }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span
      ref={ref}
      className="fx-magnetic"
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== 'mouse' || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        ref.current.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * strength}px, ${(e.clientY - (r.top + r.height / 2)) * strength}px)`;
      }}
      onPointerLeave={() => { if (ref.current) ref.current.style.transform = ''; }}
    >
      {children}
    </span>
  );
}

/** Cycles through words with a slide, sized to the longest so the line never jumps. */
export function FlipWords({ words, interval = 2600 }: { words: string[]; interval?: number }) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => window.clearInterval(id);
  }, [reduced, words.length, interval]);
  return (
    <span className="fx-flip">
      <span className="fx-flip-sizer" aria-hidden="true">{[...words].sort((a, b) => b.length - a.length)[0]}</span>
      <span key={index} className="fx-flip-word">{words[index]}</span>
    </span>
  );
}

/** Counts up to a number the first time it scrolls into view. */
export function CountUp({ to, duration = 1400, decimals = 0, suffix = '', prefix = '' }: { to: number; duration?: number; decimals?: number; suffix?: string; prefix?: string }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref);
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!seen || started.current) return;
    started.current = true;
    if (reduced) { requestAnimationFrame(() => setValue(to)); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setValue(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, reduced, to, duration]);
  return <span ref={ref} className="fx-num">{prefix}{value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

/** Soft drifting colour behind a section. Put it first inside a `position: relative` parent. */
export function Aurora({ tone = 'light', className = '' }: { tone?: 'light' | 'dark'; className?: string }) {
  return (
    <div className={`fx-aurora is-${tone} ${className}`} aria-hidden="true">
      <i className="fx-blob b1" /><i className="fx-blob b2" /><i className="fx-blob b3" /><i className="fx-blob b4" />
      <span className="fx-grid" />
    </div>
  );
}

/** A border of light that travels around the box. */
export function MovingBorder({ className = '', children, style }: { className?: string; children: ReactNode; style?: CSSProperties }) {
  return <div className={`fx-moving-border ${className}`} style={style}>{children}</div>;
}
