import { Suspense } from 'react';

import { CircleView } from '@/components/circles/circle-view';

/*
 * Circles are created at runtime, so the id travels in the query string
 * (`/circles/view?id=…`) rather than the path: the mobile build is a static
 * export and cannot prerender a page per circle.
 */
export default function CircleViewPage() {
  return (
    <Suspense fallback={<div className="px-5 pt-6 text-[13px] text-ink-muted">Loading…</div>}>
      <CircleView />
    </Suspense>
  );
}
