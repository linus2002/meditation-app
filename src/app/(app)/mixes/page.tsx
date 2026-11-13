import { Suspense } from 'react';

import { MixesView } from '@/components/mixes/mixes-view';

// Reads `?id=` to open one mix, which needs Suspense.
export default function MixesPage() {
  return (
    <Suspense fallback={<div className="px-5 pt-6 text-body-sm text-ink-muted">Loading…</div>}>
      <MixesView />
    </Suspense>
  );
}
