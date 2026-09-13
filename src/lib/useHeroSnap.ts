import { useEffect, type RefObject } from 'react';

interface Options {
  /** The hero section. Its height defines the scroll range. */
  hero: RefObject<HTMLElement | null>;
  /** The tool set. Scrolling down snaps to the top of this. */
  tools: RefObject<HTMLElement | null>;
  /** Pushed left as the hero leaves. */
  left: RefObject<HTMLElement | null>;
  /** Pushed right as the hero leaves. */
  right: RefObject<HTMLElement | null>;
}

/** How far each hero column travels outward at full progress. */
const PUSH = 140;
/** Below this width the hero is one stacked column, so there are no sides to push to. */
const WIDE = 1024;
/** Fallback for browsers without `scrollend`. */
const SETTLE_MS = 800;
/**
 * A jump larger than this in one frame is momentum from a flick, or a jump to
 * an anchor, not a deliberate scroll through the hero. Snapping into the
 * middle of momentum scrolling is what makes this pattern feel broken on a
 * phone. Set well above a mouse wheel notch so ordinary desktop scrolling
 * still snaps.
 */
const FLICK_PX = 200;

/**
 * Couples the hero to the tool set: the two columns part to the sides as you
 * scroll, and crossing the halfway mark carries you the rest of the way.
 *
 * Two things keep this from becoming the kind of scroll hijacking that traps
 * people. It only ever fires on the single frame where the halfway mark is
 * crossed, never continuously, and it is skipped entirely under
 * prefers-reduced-motion, where the page scrolls exactly as the browser
 * intends. The parting motion is driven by scroll position rather than by a
 * timer, so it tracks a finger or a wheel as closely as it tracks the snap.
 */
export function useHeroSnap({ hero, tools, left, right }: Options): void {
  useEffect(() => {
    const heroEl = hero.current;
    const toolsEl = tools.current;
    if (!heroEl || !toolsEl) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Checked once: an `in` test inside the branch narrows `window` to never.
    const hasScrollEnd = 'onscrollend' in window;
    let frame = 0;
    let lastY = window.scrollY;
    let snapping = false;
    let settle = 0;

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

    function done() {
      snapping = false;
      lastY = window.scrollY;
    }

    function snapTo(top: number) {
      snapping = true;
      window.scrollTo({ top, behavior: 'smooth' });
      window.clearTimeout(settle);
      if (hasScrollEnd) {
        window.addEventListener('scrollend', done, { once: true });
      } else {
        settle = window.setTimeout(done, SETTLE_MS);
      }
    }

    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const heroNow = hero.current;
        const toolsNow = tools.current;
        if (!heroNow || !toolsNow) return;

        const height = heroNow.offsetHeight || 1;
        const y = window.scrollY;
        const p = Math.min(1, Math.max(0, y / height));
        const was = Math.min(1, Math.max(0, lastY / height));
        const down = y > lastY;

        if (!reduce.matches) paint(p);
        if (reduce.matches || snapping) {
          lastY = y;
          return;
        }

        const target = toolsNow.offsetTop;
        const flick = Math.abs(y - lastY) > FLICK_PX;
        // Only on the frame that crosses the halfway mark, only in the
        // direction actually being scrolled, and never mid-flick.
        if (flick) {
          lastY = y;
          return;
        }
        if (down && was < 0.5 && p >= 0.5 && y < target) {
          snapTo(target);
        } else if (!down && was > 0.5 && p <= 0.5 && y > 0) {
          snapTo(0);
        }
        lastY = y;
      });
    }

    if (!reduce.matches) paint(Math.min(1, window.scrollY / (heroEl.offsetHeight || 1)));
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scrollend', done);
      window.clearTimeout(settle);
      if (frame) cancelAnimationFrame(frame);
      for (const el of [left.current, right.current]) {
        if (!el) continue;
        el.style.transform = '';
        el.style.opacity = '';
        el.style.pointerEvents = '';
      }
    };
  }, [hero, tools, left, right]);
}
