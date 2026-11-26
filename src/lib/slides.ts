/**
 * The motion of the onboarding tour (app/welcome): how a step glides to the
 * next, which steps have come into view, and how the dots follow along.
 */

/** Slow at both ends, so a step eases off and settles rather than jumping. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** How long a glide takes: a step is unhurried, a jump of several a little longer, never slow. */
export function glideMs(steps: number): number {
  const distance = Math.max(1, Math.abs(steps));
  return Math.min(820, 560 + (distance - 1) * 110);
}

/** Share of the next step that has to be on screen before its text rises in. */
export const ENTER_SHARE = 0.18;

/**
 * The steps showing at a scroll position (0 = first step, 1.5 = halfway from
 * the second to the third), counting only those showing enough to be read.
 */
export function stepsInView(position: number, count: number): number[] {
  const at = Math.min(Math.max(position, 0), count - 1);
  const left = Math.floor(at);
  const share = at - left;
  const shown: number[] = [];
  if (share <= 1 - ENTER_SHARE) shown.push(left);
  if (share >= ENTER_SHARE && left + 1 < count) shown.push(left + 1);
  return shown;
}

export const DOT = { idle: 6, active: 20, idleOpacity: 0.4 };

/** One dot at a scroll position: it widens and brightens as its step comes in. */
export function dotAt(position: number, index: number): { width: number; opacity: number } {
  const near = Math.max(0, 1 - Math.abs(position - index));
  return {
    width: DOT.idle + (DOT.active - DOT.idle) * near,
    opacity: DOT.idleOpacity + (1 - DOT.idleOpacity) * near,
  };
}
