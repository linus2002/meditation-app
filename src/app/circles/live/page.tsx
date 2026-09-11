import { Suspense } from 'react';

import { LiveRoom } from '@/components/circles/live-room';

/*
 * Full screen, outside the (app) group, so there is no bottom bar in the room —
 * the same treatment as the session player.
 */
export default function CircleLivePage() {
  return (
    <Suspense fallback={<div className="px-5 pt-6 text-[13px] text-ink-muted">Loading…</div>}>
      <LiveRoom />
    </Suspense>
  );
}
