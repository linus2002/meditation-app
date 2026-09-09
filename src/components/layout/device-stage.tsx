import type { ReactNode } from 'react';
import { Smartphone, Tablet } from 'lucide-react';

/**
 * Serenity is a handheld app. Up to the `desktop` breakpoint (1025px) the app
 * renders at handset width, centred, filling the viewport height — which covers
 * phones and tablets in portrait as well as a 1024pt iPad in landscape.
 *
 * Beyond that width the app is not offered at all: the gate is a plain CSS
 * `display: none`, so the app is never painted on a laptop or desktop and is
 * removed from the accessibility tree along with it. No JS, no measuring, and
 * no flash of the wrong layout on first paint.
 */
export function DeviceStage({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="min-h-stage flex w-full justify-center bg-canvas-deep desktop:hidden">
        <div className="rail h-stage relative flex w-full max-w-[430px] flex-col overflow-y-auto overflow-x-hidden overscroll-contain bg-canvas sm:border-x sm:border-overlay/[0.06]">
          {children}
        </div>
      </div>

      <div className="min-h-stage hidden w-full items-center justify-center bg-[radial-gradient(125%_95%_at_50%_-5%,#6FE6B4_0%,#2BB086_24%,#0C5B4A_50%,#052721_74%,#010B09_100%)] px-8 desktop:flex">
        <UnsupportedScreen />
      </div>
    </>
  );
}

function UnsupportedScreen() {
  return (
    <main className="w-full max-w-[430px] rounded-[2rem] border border-overlay/10 bg-canvas/85 px-8 py-10 text-center shadow-[0_45px_100px_-35px_rgba(0,0,0,0.8)] backdrop-blur-xl">
      <div aria-hidden="true" className="flex items-center justify-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-overlay/[0.06]">
          <Smartphone className="h-5 w-5 text-ink-soft" strokeWidth={1.6} />
        </span>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-action-pill">
          <Tablet className="h-6 w-6 text-white" strokeWidth={1.6} />
        </span>
      </div>

      <h1 className="mt-7 text-[24px] font-bold leading-tight tracking-[-0.015em] text-ink">
        Made for phones and tablets
      </h1>

      <p className="mx-auto mt-3 max-w-[300px] text-[13px] leading-[1.65] text-ink-muted">
        Serenity is a handheld experience and is not available on laptop or desktop screens. Open it
        on your phone or tablet, or narrow this window to 1024px or less.
      </p>

      <p className="mt-7 text-[11px] uppercase tracking-[0.18em] text-ink-faint">
        Phone · Tablet · iPad
      </p>
    </main>
  );
}
