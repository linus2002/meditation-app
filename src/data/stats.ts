/**
 * The activity figures used to be a hardcoded March 2023 fixture. They are now
 * derived from recorded sessions; only the targets live here.
 */

/**
 * The daily mindful-minutes target until the reader picks their own, which
 * drives the activities ring, the library's target card and the end of a sit.
 */
export const DAILY_GOAL_MINUTES = 30;

/** The goals offered on Profile: from a few minutes a day up to an hour. */
export const DAILY_GOAL_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const;

/** How many days the date strip offers. */
export const ACTIVITY_DAY_COUNT = 7;

/** A sitting shorter than this is not worth recording. */
export const MIN_RECORDED_SECONDS = 60;
