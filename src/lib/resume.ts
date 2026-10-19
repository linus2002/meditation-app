/**
 * Where each meditation was left, so leaving the player never loses your place.
 *
 * Interruptions are the norm for many readers — nausea, a nurse, a call — so a
 * session left part-way opens again at the same spot. Only the position and
 * when it was saved are stored, on this device.
 */

const RESUME_KEY = 'serenity.resume.v1';

/** Not worth resuming: barely started, or as good as finished. */
export const MIN_RESUME_SECONDS = 30;
export const FINISHED_FRACTION = 0.95;
/** A place kept longer than this is stale; the session starts fresh. */
export const RESUME_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface ResumeEntry {
  seconds: number;
  savedAt: number;
}

type ResumeMap = Record<string, ResumeEntry>;

/**
 * The second to pick up from, or null when the session should start at the
 * beginning. Pure, so the rules are tested directly.
 */
export function resumePoint(
  entry: ResumeEntry | undefined,
  durationSeconds: number,
  now: number,
): number | null {
  if (!entry) return null;
  if (now - entry.savedAt > RESUME_TTL_MS) return null;
  if (entry.seconds < MIN_RESUME_SECONDS) return null;
  if (entry.seconds >= durationSeconds * FINISHED_FRACTION) return null;
  return Math.floor(entry.seconds);
}

function readAll(): ResumeMap {
  try {
    const raw = window.localStorage.getItem(RESUME_KEY);
    return raw ? (JSON.parse(raw) as ResumeMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: ResumeMap): void {
  try {
    window.localStorage.setItem(RESUME_KEY, JSON.stringify(map));
  } catch {
    // Without storage a session simply starts from the top next time.
  }
}

export function readResume(id: string, durationSeconds: number): number | null {
  return resumePoint(readAll()[id], durationSeconds, Date.now());
}

export function saveResume(id: string, seconds: number): void {
  writeAll({ ...readAll(), [id]: { seconds: Math.floor(seconds), savedAt: Date.now() } });
}

export function clearResume(id: string): void {
  const map = readAll();
  if (!(id in map)) return;
  delete map[id];
  writeAll(map);
}
