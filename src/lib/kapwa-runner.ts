import type { Practice } from '@/data/kapwa-knowledge';

/**
 * Turns a practice from the knowledge base into a timed, guided run: one
 * instruction at a time, each for its own length, start to finish.
 *
 * Breathing practices repeat their timed cycle (in 4, hold 4, out 4, hold 4)
 * until the practice's minutes are up, after the setup steps and before a
 * gentle close. Other practices play each step once, for its seconds, or a
 * default for steps without them.
 */

export interface RunnerStep {
  text: string;
  seconds: number;
  /** A breath in a repeating cycle, shown with a breathing cue. */
  breath?: boolean;
}

/** How long a step without its own timing is shown. */
const UNTIMED_SECONDS = 20;
/** Setup steps before a breathing cycle: time to read and settle. */
const SETUP_SECONDS = 8;
/** At least this many cycles, however short the practice. */
const MIN_CYCLES = 3;

/** Whether a practice can be run: it has timing, and isn't reading or writing. */
export function canRun(practice: Practice): boolean {
  return practice.kind !== 'education' && practice.kind !== 'journaling' && practice.steps.some((step) => step.seconds);
}

export function runnerPlan(practice: Practice): RunnerStep[] {
  if (!canRun(practice)) return [];

  if (practice.kind === 'breathing') {
    const firstTimed = practice.steps.findIndex((step) => step.seconds);
    let end = firstTimed;
    while (end < practice.steps.length && practice.steps[end].seconds) end++;
    const setup = practice.steps.slice(0, firstTimed).map((step) => ({ text: step.text, seconds: SETUP_SECONDS }));
    const cycle = practice.steps.slice(firstTimed, end).map((step) => ({ text: step.text, seconds: step.seconds!, breath: true }));
    const cycleSeconds = cycle.reduce((total, step) => total + step.seconds, 0);
    const cycles = Math.max(MIN_CYCLES, Math.round((practice.minutes * 60) / cycleSeconds));
    const repeated = Array.from({ length: cycles }, () => cycle).flat();
    return [...setup, ...repeated, { text: 'Let your breath return to its own rhythm. Notice how you feel.', seconds: 10 }];
  }

  return practice.steps.map((step) => ({ text: step.text, seconds: step.seconds ?? UNTIMED_SECONDS }));
}

export function planSeconds(plan: RunnerStep[]): number {
  return plan.reduce((total, step) => total + step.seconds, 0);
}

/** Where a run is after `elapsed` seconds: the step, the time left in it, and whether it's over. */
export function runnerAt(plan: RunnerStep[], elapsed: number): { index: number; stepLeft: number; done: boolean } {
  let start = 0;
  for (let index = 0; index < plan.length; index++) {
    const end = start + plan[index].seconds;
    if (elapsed < end) return { index, stepLeft: end - elapsed, done: false };
    start = end;
  }
  return { index: plan.length - 1, stepLeft: 0, done: true };
}
