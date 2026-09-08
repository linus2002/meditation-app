import Link from 'next/link';
import { CloudOff } from 'lucide-react';

/**
 * Served by the service worker when a page is requested that was never cached
 * and there is no connection. Rare — the whole app is precached on install —
 * but better than the browser's own error page.
 */
export default function OfflinePage() {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center px-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06]">
        <CloudOff className="h-6 w-6 text-ink-soft" strokeWidth={1.6} />
      </span>

      <h1 className="mt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink">
        No connection
      </h1>
      <p className="mx-auto mt-2.5 max-w-[260px] text-[12.5px] leading-relaxed text-ink-muted">
        This part of Serenity has not been saved to your device yet. Your sessions, sounds and
        reflections all still work offline.
      </p>

      <Link
        href="/home"
        className="mt-7 rounded-full bg-action-pill px-6 py-3 text-[13px] font-medium text-white transition-[filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        Back to Serenity
      </Link>
    </div>
  );
}
