'use client';

import * as React from 'react';

import { adoptEarlierScreen } from '@/lib/history-depth';

/**
 * On "This page isn't here", lets Back return to the screen whose link led
 * here rather than going home (see adoptEarlierScreen). A missing address is
 * loaded afresh, by the browser and by the installed app alike, so it starts
 * with no earlier screen counted.
 */
export function NotFoundBack() {
  React.useEffect(() => {
    adoptEarlierScreen();
  }, []);
  return null;
}
