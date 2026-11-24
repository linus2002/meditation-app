'use client';

import * as React from 'react';

/**
 * Grows a one-line message box with what is typed, up to its CSS max-height,
 * after which it scrolls. Shrinks back once the message is sent and cleared.
 */
export function useAutoGrow(value: string): React.RefObject<HTMLTextAreaElement | null> {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);

  React.useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    box.style.height = 'auto';
    const max = parseFloat(getComputedStyle(box).maxHeight);
    const wanted = box.scrollHeight + (box.offsetHeight - box.clientHeight);
    const height = Number.isFinite(max) ? Math.min(wanted, max) : wanted;
    box.style.height = `${height}px`;
    box.style.overflowY = Number.isFinite(max) && wanted > max ? 'auto' : 'hidden';
  }, [value]);

  return ref;
}
