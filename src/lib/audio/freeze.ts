/** A longer silence between ticks than this is worth checking for a freeze. */
const FROZEN_GAP_MS = 5000;

/**
 * Tells a frozen app from one whose timers were merely throttled.
 *
 * Clocks measured against the wall run straight on through a freeze, so a session
 * could finish with nobody hearing it. When ticks stop and the audio clock stopped
 * with them, the sound stopped too. With no sound there is no audio clock and this
 * never reports a freeze, so a silent sit carries on with the phone locked.
 */
export function watchForFreeze(readSoundClock: () => number | null) {
  let lastTick = Date.now();
  let lastSound = readSoundClock();

  return {
    /** The last moment the app was seen running. */
    get lastTick() {
      return lastTick;
    },

    /** Call on every tick. True if everything stopped since the one before. */
    frozen(now: number): boolean {
      const sound = readSoundClock();
      const gapMs = now - lastTick;
      const heardSeconds = sound !== null && lastSound !== null ? sound - lastSound : null;
      if (gapMs > FROZEN_GAP_MS && heardSeconds !== null && heardSeconds * 1000 < gapMs / 2) {
        return true;
      }
      lastTick = now;
      lastSound = sound;
      return false;
    },
  };
}
