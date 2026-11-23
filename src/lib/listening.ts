/**
 * Time actually heard, as opposed to where the scrubber ended up.
 *
 * The clock is read a few times a second. A small step forward while playing
 * was listened to; a jump (a seek, a skip, Next pose) was not, and a jump back
 * takes nothing away. So dragging to the end of a session does not count as
 * having sat through it.
 */

/** The largest step between two readings that still counts as listening. */
const MAX_STEP_SECONDS = 2.5;

export function advanceListened(heard: number, previous: number, current: number, running: boolean): number {
  const step = current - previous;
  return running && step > 0 && step <= MAX_STEP_SECONDS ? heard + step : heard;
}

/** The share of what was left that must be heard for a session to count as finished. */
export const FINISHED_SHARE = 0.8;

/**
 * Whether reaching the end counts as finishing. `remaining` is what was left
 * when this visit began: all of it, or less when picked up from where it was
 * left. Skipping most of it is reaching the end, not finishing.
 */
export function finishedProperly(heard: number, remaining: number): boolean {
  return remaining > 0 && heard >= remaining * FINISHED_SHARE;
}
