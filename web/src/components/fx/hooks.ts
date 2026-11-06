import { useEffect, useRef, useState, type RefObject } from 'react';

/** True when the person has asked their device for less motion. Every effect here respects it. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** True while the element is on screen, so animations can pause when nobody can see them. */
export function useInView<T extends Element>(ref: RefObject<T | null>, options?: IntersectionObserverInit): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2, ...options });
    io.observe(node);
    return () => io.disconnect();
  }, [ref, options]);
  return inView;
}

/** Runs `onFrame(elapsedSeconds)` every animation frame while `active`. */
export function useFrameLoop(active: boolean, onFrame: (elapsed: number) => void) {
  const callback = useRef(onFrame);
  useEffect(() => { callback.current = onFrame; }, [onFrame]);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      callback.current((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
