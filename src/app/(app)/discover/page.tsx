import { Suspense } from 'react';

import { DiscoverView } from '@/components/discover/discover-view';

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="px-5 pt-6 text-[13px] text-ink-muted">Loading…</div>}>
      <DiscoverView />
    </Suspense>
  );
}
