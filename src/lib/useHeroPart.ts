import { useEffect, type RefObject } from 'react';

interface Options {
  /** The hero section. Its height defines the scroll range. */
  hero: RefObject<HTMLElement | null>;
  /** Pushed left as the hero scrolls away. */
  left: RefObject<HTMLElement | null>;
  /** Pushed right as the hero scrolls away. */
  right: RefObject<HTMLElement | null>;
}

/** How far each hero column travels outward at full progress. */
const PUSH = 140;
/** Below this width the hero is one stacked column, so there are no sides to push to. */
const WIDE = 1024;

/**
 * Parts the two hero columns to the sides as the hero scrolls away.
 *
 * Driven entirely by scroll position, so it tracks a wheel or a finger exactly
 * and never takes the scroll away from the reader. An earlier version also
 * snapped the page to the tool set at the halfway mark; that was removed on
 * request, and nothing here moves the scroll position any more.
 */
export function useHeroPart({ hero, left, right }: Options): void {
  useEffect(() => {
    const heroEl = hero.current;
    if (!heroEl) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    function paint(p: number) {
      // Smoothstep, so the columns ease away instead of tracking scroll
      // linearly and feeling mechanical.
      const e = p * p * (3 - 2 * p);
      const wide = window.innerWidth >= WIDE;
      for (const [el, dir] of [
        [left.current, -1],
        [right.current, 1],
      ] as const) {
        if (!el) continue;
        el.style.transform = wide ? `translate3d(${dir * PUSH * e}px, 0, 0)` : '';
        el.style.opacity = String(1 - e * 0.9);
        // Once it is mostly gone it must stop catching clicks and tab stops.
        el.style.pointerEvents = e > 0.85 ? 'none' : '';
      }
    }

    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const el = hero.current;
        if (!el || reduce.matches) return;
        const height = el.offsetHeight || 1;
        paint(Math.min(1, Math.max(0, window.scrollY / height)));
      });
    }

    if (!reduce.matches) paint(Math.min(1, window.scrollY / (heroEl.offsetHeight || 1)));
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
      for (const el of [left.current, right.current]) {
        if (!el) continue;
        el.style.transform = '';
        el.style.opacity = '';
        el.style.pointerEvents = '';
      }
    };
  }, [hero, left, right]);
}
