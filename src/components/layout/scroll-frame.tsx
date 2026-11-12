'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

/** Last scroll offset per screen, for this visit. */
const positions = new Map<string, number>();

/** Frames to keep trying a restore while a screen's content fills in. */
const RESTORE_FRAMES = 20;

/**
 * The app's single scrolling region (see DeviceStage).
 *
 * The browser only restores scroll for the window, and here the window never
 * scrolls, so without this every screen keeps whatever offset the last one
 * left, and Back to a long list always lands at the top. This remembers each
 * screen's offset, puts it back on Back/Forward, and starts new screens at the
 * top.
 */
export function ScrollFrame({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? '/';
  const keyRef = React.useRef(pathname);
  const traversing = React.useRef(false);

  // Back/Forward (system button, router.back, swipe) all fire popstate.
  React.useEffect(() => {
    const onPop = () => {
      traversing.current = true;
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => positions.set(keyRef.current, el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || keyRef.current === pathname) return;
    // Switch keys first, so scroll events from here on belong to the new screen.
    keyRef.current = pathname;

    const target = traversing.current ? (positions.get(pathname) ?? 0) : 0;
    traversing.current = false;
    el.scrollTop = target;
    if (target === 0) return;

    // Content that waits on stored state or images may not be tall enough yet.
    let frame = 0;
    let id = 0;
    const retry = () => {
      if (keyRef.current !== pathname) return;
      el.scrollTop = target;
      if (Math.abs(el.scrollTop - target) > 1 && ++frame < RESTORE_FRAMES) {
        id = requestAnimationFrame(retry);
      }
    };
    id = requestAnimationFrame(retry);
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
