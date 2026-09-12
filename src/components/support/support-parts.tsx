import { FileWarning, HeartHandshake } from 'lucide-react';

import { supportDisclaimer } from '@/data/support-track';
import { cn } from '@/lib/utils';

/** Shown in place of the track while it is switched off. */
export function SupportUnavailable() {
  return (
    <div className="flex flex-col items-center px-8 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-overlay/[0.06]">
        <HeartHandshake className="h-6 w-6 text-ink-muted" strokeWidth={1.5} />
      </span>
      <p className="mt-4 text-[15px] font-medium text-ink">Not available yet</p>
      <p className="mt-1.5 max-w-[270px] text-[12.5px] leading-relaxed text-ink-muted">
        This part of Serenity is still being prepared. Everything else works as usual.
      </p>
    </div>
  );
}

/**
 * The plain-language note the track always carries: support alongside a care
 * team, never instead of it.
 */
export function SupportDisclaimer({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-tile bg-surface p-4', className)}>
      <p className="text-[13px] font-medium text-ink">{supportDisclaimer.title}</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{supportDisclaimer.body}</p>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">{supportDisclaimer.urgent}</p>
    </div>
  );
}

/**
 * Visible while any wording is still a draft, so testers never mistake it for
 * approved copy. Disappears once every session is marked approved.
 */
export function DraftNotice({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-2.5 rounded-tile bg-overlay/[0.06] px-4 py-3', className)}>
      <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" strokeWidth={1.7} />
      <p className="text-[11.5px] leading-relaxed text-ink-muted">
        Draft wording, awaiting review by a qualified clinician before release.
      </p>
    </div>
  );
}

/** The "Aa" switch for larger text, sized to sit in a header corner. */
export function LargeTextToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label="Larger text"
      onClick={onToggle}
      className={cn(
        '-mt-1.5 flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
        on ? 'bg-action-pill text-white' : 'text-ink-muted hover:bg-overlay/[0.06] hover:text-ink',
      )}
    >
      Aa
    </button>
  );
}
