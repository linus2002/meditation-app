import { Suspense } from 'react';

import { MeditationsView } from '@/components/meditations/meditations-view';

// The library reads `?tab=` to open straight onto a tab, which needs Suspense.
export default function MeditationsPage() {
  return (
    <Suspense fallback={<div className="px-5 pt-6 text-[13px] text-ink-muted">Loading…</div>}>
      <MeditationsView />
    </Suspense>
  );
}
