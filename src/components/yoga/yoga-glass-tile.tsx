import type * as React from 'react';
import Link from 'next/link';

import type { YogaSession } from '@/data/yoga';
import { formatMinutesLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { totalSeconds } from '@/lib/yoga';

/** Each kind of yoga has its own glow colour. */
const GLOWS: Record<string, string> = {
  'morning-flow': '#FDE4C3',
  'desk-stretch': '#FF8A6E',
  'evening-unwind': '#8E96EC',
  'bedtime-yoga': '#8A8D9C',
  'back-release': '#F09090',
  'breath-balance': '#9BDDB4',
  'neck-shoulders': '#C9A7F0',
  'gentle-core': '#F5C26B',
  'chair-yoga': '#7FD0E8',
  'sun-salutation': '#FFB38A',
};

/** For a session added later without a colour of its own. */
const FALLBACK = '#8E96EC';

/** A session's glow colour, shared by its tile and its own page. */
export function yogaColor(sessionId: string): string {
  return GLOWS[sessionId] ?? FALLBACK;
}

/**
 * The glass itself: the colour glowing down from the top of the pane, a faint
 * sheen, a lit rim and the colour bleeding in along every edge. Shared by the
 * tiles and the panel at the top of a session's page, so they always match.
 */
export function glassStyle(color: string): React.CSSProperties {
  return {
    background: [
      // A faint sheen across the top, as light catches glass.
      'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 22%)',
      `radial-gradient(150% 120% at 50% -10%, ${color} 0%, ${color} 30%, ${color}99 55%, ${color}00 82%)`,
      // The pane: plain in dark mode, a pastel of the tile's colour in light.
      `color-mix(in srgb, ${color} var(--tile-tint), rgb(var(--canvas-raised)))`,
    ].join(', '),
    // The glass edge: a bright top lip, a hairline rim, and the tile's colour
    // bleeding in along every side.
    boxShadow: [
      'inset 0 1.5px 0 rgba(255,255,255,0.45)',
      'inset 0 0 0 1px rgba(255,255,255,0.12)',
      `inset 0 0 22px 2px ${color}66`,
      `0 12px 32px -14px ${color}80`,
    ].join(', '),
  };
}

/**
 * One yoga session as a glass tile in the manner of a smart home overview:
 * its own colour glowing down from the top of a dark pane, a lit rim along the
 * edges, and the label in the dark at the foot, the same on every tile. The
 * tile fills whatever box it is given, so the Yoga mosaic and the home rail
 * size it themselves.
 */
export function YogaGlassTile({ session, className }: { session: YogaSession; className?: string }) {
  const color = yogaColor(session.id);

  return (
    <Link
      href={`/yoga/${session.id}`}
      className={cn(
        'relative flex flex-col items-center justify-end overflow-hidden rounded-[34px] px-4 pb-6 text-center',
        'transition-transform duration-200 hover:scale-[1.015] active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
        className,
      )}
      style={glassStyle(color)}
    >
      {/* Four dots, as on the reference tiles: a quiet hint that each one opens. */}
      <span
        aria-hidden="true"
        className="absolute right-5 top-5 grid grid-cols-2 gap-[3px] opacity-45"
      >
        {[0, 1, 2, 3].map((dot) => (
          <span key={dot} className="h-[3px] w-[3px] rounded-full bg-ink" />
        ))}
      </span>

      <span className="text-[0.875rem] font-medium leading-snug text-ink">
        {session.title}
      </span>
      <span className="mt-1 text-[0.6875rem] text-ink-muted">
        {formatMinutesLabel(totalSeconds(session.poses))} · {session.poses.length} poses
      </span>
    </Link>
  );
}
