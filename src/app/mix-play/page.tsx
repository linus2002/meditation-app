import { Suspense } from 'react';

import { MixPlayer } from '@/components/mixes/mix-player';

// Full screen, like the session players. Reads `?id=&shuffle=&loop=`.
export default function MixPlayPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-canvas" aria-hidden="true" />}>
      <MixPlayer />
    </Suspense>
  );
}
