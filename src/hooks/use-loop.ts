'use client';

import * as React from 'react';

export type LoopKind = 'meditation' | 'story' | 'yoga';

const key = (kind: LoopKind) => `serenity.loop.v1.${kind}`;

function read(kind: LoopKind): boolean {
  try {
    return window.localStorage.getItem(key(kind)) === '1';
  } catch {
    return false;
  }
}

/**
 * Whether sessions of one kind play on repeat. Remembered on this device per
 * kind, so looping sleep stories doesn't also loop every meditation. Off by
 * default, and off wherever storage is blocked.
 */
export function useLoop(kind: LoopKind): [boolean, () => void] {
  const [loop, setLoop] = React.useState(false);

  React.useEffect(() => {
    setLoop(read(kind));
  }, [kind]);

  const toggle = React.useCallback(() => {
    setLoop((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(key(kind), next ? '1' : '0');
      } catch {
        // Not remembered, but still applies for this visit.
      }
      return next;
    });
  }, [kind]);

  return [loop, toggle];
}
