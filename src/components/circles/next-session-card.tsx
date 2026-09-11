import Link from 'next/link';
import { Radio } from 'lucide-react';

import { GradientButton } from '@/components/shared/gradient-button';
import { formatClock, formatCountdown, sessionDayLabel } from '@/lib/circles/format';
import { canJoin, currentOrNextOccurrence, LOBBY_OPENS_MS, livePhase } from '@/lib/circles/schedule';
import type { Circle } from '@/lib/circles/types';

/**
 * When the circle next sits, and the way in when the room is open.
 *
 * Once joining has closed for today, it offers a solo sit instead — which
 * still counts for the circle — rather than a door that will not open.
 */
export function NextSessionCard({
  circle,
  now,
  children,
}: {
  circle: Circle;
  now: number;
  /** Rendered under the text while the room is open, e.g. who is here. */
  children?: React.ReactNode;
}) {
  const occurrence = currentOrNextOccurrence(circle, now);

  if (!occurrence) {
    return (
      <div className="rounded-tile bg-surface p-4 text-[12.5px] text-ink-muted">
        This circle has no sessions scheduled.
      </div>
    );
  }

  const phase = livePhase(occurrence, now);
  const clock = formatClock(occurrence.startsAt);
  const roomOpen = phase === 'lobby' || phase === 'live' || phase === 'closing';

  const title =
    phase === 'upcoming'
      ? `${sessionDayLabel(occurrence.startsAt, now)} at ${clock}`
      : phase === 'lobby'
        ? `Starting at ${clock}`
        : 'Sitting now';

  const detail =
    phase === 'upcoming'
      ? `${formatCountdown(occurrence.startsAt - now)} · the room opens at ${formatClock(occurrence.startsAt - LOBBY_OPENS_MS)}`
      : phase === 'lobby'
        ? `The room is open. It begins ${formatCountdown(occurrence.startsAt - now)}.`
        : phase === 'live'
          ? 'Join now and you start where everyone is.'
          : 'Nearly finished. Sit on your own and it still counts for the circle.';

  return (
    <div className="rounded-tile bg-surface p-4">
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-overlay/[0.06]">
          <Radio
            className={roomOpen ? 'h-[18px] w-[18px] text-ink' : 'h-[18px] w-[18px] text-ink-soft'}
            strokeWidth={1.7}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] leading-none text-ink-faint">Next session</p>
          <p className="mt-1.5 text-[15px] font-semibold leading-tight text-ink">{title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{detail}</p>
        </div>
      </div>

      {roomOpen && children ? <div className="mt-3.5">{children}</div> : null}

      {canJoin(phase) ? (
        <GradientButton asChild className="mt-4 h-11 w-full text-[13px]">
          <Link href={{ pathname: '/circles/live', query: { id: circle.id } }}>Join the room</Link>
        </GradientButton>
      ) : phase === 'closing' ? (
        <Link
          href={`/player/${circle.meditationId}`}
          className="mt-4 flex h-11 w-full items-center justify-center rounded-full border border-overlay/25 text-[13px] font-medium text-ink transition-colors hover:bg-overlay/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          Sit on your own
        </Link>
      ) : null}
    </div>
  );
}
