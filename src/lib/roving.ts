import type * as React from 'react';

/**
 * Arrow-key movement for radio groups and tab lists, shared by every chip row,
 * star rating and tab bar in the app.
 *
 * These groups use a roving tabindex: only the selected item is in the tab
 * order, so the arrow keys are the only way to reach the rest. Moving has to
 * select the next item *and* move focus to it — selecting alone leaves focus
 * on an item that is no longer tabbable, and the next key press starts from
 * the wrong place.
 */

/**
 * The index a key moves to, or null for keys the group ignores. Wraps at both
 * ends. Up and Down only count where the group allows them: in a tab bar they
 * would hijack page scrolling.
 */
export function nextRovingIndex(
  key: string,
  index: number,
  count: number,
  { vertical = true }: { vertical?: boolean } = {},
): number | null {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowRight':
      return (index + 1) % count;
    case 'ArrowLeft':
      return (index - 1 + count) % count;
    case 'ArrowDown':
      return vertical ? (index + 1) % count : null;
    case 'ArrowUp':
      return vertical ? (index - 1 + count) % count : null;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/**
 * Handles a key press on item `index` of `count`: selects the next item through
 * `select` and moves focus to it. Use as the item's `onKeyDown`.
 */
export function handleRovingKey(
  event: React.KeyboardEvent<HTMLElement>,
  index: number,
  count: number,
  select: (index: number) => void,
  options?: { vertical?: boolean },
): void {
  const next = nextRovingIndex(event.key, index, count, options);
  if (next === null) return;
  event.preventDefault();
  select(next);

  const group = event.currentTarget.closest('[role="radiogroup"], [role="tablist"]');
  const items = group?.querySelectorAll<HTMLElement>('[role="radio"], [role="tab"]');
  items?.[next]?.focus();
}
