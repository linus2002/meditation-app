'use client';

import Link from 'next/link';

import { SupportPlayer } from '@/components/support/support-player';
import { SupportUnavailable } from '@/components/support/support-parts';
import { getSupportSession } from '@/data/support-track';
import { useSupport } from '@/hooks/use-support';
import { supportTrackEnabled } from '@/lib/support-track';

/**
 * One support session, full screen. Each session has its own page file under
 * `app/support/`, so the offline worker precaches every one of them without
 * any change to how routes are collected.
 */
export function SupportSessionScreen({ id }: { id: string }) {
  const support = useSupport();
  const session = getSupportSession(id);

  if (!supportTrackEnabled || !session) {
    return (
      <div className="flex min-h-full flex-col">
        <SupportUnavailable />
        <Link href="/home" className="mx-auto text-[13px] font-medium text-ink-soft hover:text-ink">
          Back to Serenity
        </Link>
      </div>
    );
  }

  return (
    <SupportPlayer
      session={session}
      largeText={support.largeText}
      onToggleLargeText={() => support.setLargeText(!support.largeText)}
      onListened={support.recordListen}
    />
  );
}
