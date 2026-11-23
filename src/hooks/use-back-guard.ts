'use client';

import * as React from 'react';

import { registerBackGuard } from '@/lib/back-guard';

/** While `active`, Back calls `onBack` instead of leaving the screen (lib/back-guard). */
export function useBackGuard(active: boolean, onBack: () => void): void {
  const handler = React.useRef(onBack);
  handler.current = onBack;
  React.useEffect(() => (active ? registerBackGuard(() => handler.current()) : undefined), [active]);
}
