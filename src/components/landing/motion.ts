'use client';

import * as React from 'react';

/** True when the reader has asked the system for less motion. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/**
 * Calls `onProgress` with how far the page has scrolled through `ref`, from 0
 * when its top meets the top of the viewport to 1 when its bottom meets the
 * bottom. That is the span a `sticky` child stays pinned for.
 *
 * Written straight to the DOM from one rAF per scroll, so a long pinned section
 * never re-renders React at frame rate.
 */
export function useScrollProgress(
  ref: React.RefObject<HTMLElement | null>,
  onProgress: (progress: number) => void,
) {
  const callback = React.useRef(onProgress);
  callback.current = onProgress;

  React.useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      callback.current(span > 0 ? clamp(-rect.top / span) : rect.top < 0 ? 1 : 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ref]);
}

/** Adds `data-shown` once an element scrolls into view, for CSS reveals. */
export function useReveal<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.shown = '';
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    el.querySelectorAll<HTMLElement>('[data-reveal]').forEach((node) => observer.observe(node));
    if (el.hasAttribute('data-reveal')) observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

/** Hidden until `useReveal` marks it shown, then rises into place. */
export const REVEAL =
  'translate-y-8 opacity-0 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] data-[shown]:translate-y-0 data-[shown]:opacity-100';
