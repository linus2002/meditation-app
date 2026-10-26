/**
 * Timing for guided yoga: a session is an ordered list of poses, each held for
 * a set number of seconds. Pure, so it is tested directly.
 *
 * A session's length is always the sum of its poses — there is no separate
 * figure to keep in step.
 */

export type YogaSide = 'left' | 'right';

export interface YogaPose {
  name: string;
  seconds: number;
  /** One short instruction, read while holding the pose. */
  cue: string;
  /** Set when the pose is done once on each side. */
  side?: YogaSide;
  /** The instructor's recorded lines, streamed from Sanity where recorded. */
  voice?: YogaPoseVoice;
}

/** Recorded by scripts/sanity/narrate.mjs; each line has a spoken fallback. */
export interface YogaPoseVoice {
  /** "Low lunge, left side." */
  name?: string;
  /** The pose's instruction, read as it begins. */
  cue?: string;
  /** "Next, low lunge, left side.", read just before it begins. */
  next?: string;
}

/** What the instructor says, so recordings and the device's own voice agree. */
export function spokenTitle(pose: YogaPose): string {
  return pose.side ? `${pose.name}, ${pose.side} side` : pose.name;
}

export function poseLines(pose: YogaPose, isLast: boolean) {
  return {
    name: `${spokenTitle(pose)}.`,
    cue: pose.cue,
    next: `${isLast ? 'And finally' : 'Next'}, ${spokenTitle(pose)}.`,
  };
}

export function totalSeconds(poses: YogaPose[]): number {
  return poses.reduce((sum, pose) => sum + pose.seconds, 0);
}

/**
 * Seconds into the whole session: every pose before `index`, plus how far
 * into the current one the clock is. Clamped to the session.
 */
export function elapsedAt(poses: YogaPose[], index: number, remaining: number): number {
  if (poses.length === 0) return 0;
  const current = Math.min(Math.max(index, 0), poses.length - 1);
  const before = totalSeconds(poses.slice(0, current));
  const into = poses[current].seconds - Math.min(Math.max(remaining, 0), poses[current].seconds);
  return Math.min(totalSeconds(poses), before + into);
}

export function poseSideLabel(side: YogaSide): string {
  return side === 'left' ? 'Left side' : 'Right side';
}

/** "Low lunge · Left side", or just the name. */
export function poseTitle(pose: YogaPose): string {
  return pose.side ? `${pose.name} · ${poseSideLabel(pose.side)}` : pose.name;
}
