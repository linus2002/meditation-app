/**
 * Where each session was left, so leaving a player never loses your place.
 *
 * Interruptions are the norm for many readers — nausea, a nurse, a call — so a
 * session left part-way opens again at the same spot. Only the position and
 * when it was saved are stored: on this device, and for a signed-in reader
 * also in their account (lib/cloud-sync), so the place follows them to another
 * phone. Support-track places never leave the device.
 *
 * Keys: a meditation's id as is, and `yoga:<id>`, `story:<id>:<unit>` and
 * `support:<id>` for the other players. See `resumeKey`.
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

export type ResumeMap = Record<string, ResumeEntry>;

export type ResumeKind = 'meditation' | 'yoga' | 'story' | 'support';

/** The store key for a session. Meditations keep their bare id, as before. */
export function resumeKey(kind: ResumeKind, id: string, unit?: string): string {
  if (kind === 'meditation') return id;
  return unit ? `${kind}:${id}:${unit}` : `${kind}:${id}`;
}

/** Places that stay on this device only: the support track is private. */
export function isDeviceOnly(key: string): boolean {
  return key.startsWith('support:');
}

/**
 * Told about every local change, so a signed-in reader's account can follow.
 * Set by lib/cloud-sync; null means nothing is listening.
 */
type ResumeListener = {
  saved: (key: string, entry: ResumeEntry) => void;
  cleared: (key: string) => void;
};
let listener: ResumeListener | null = null;

export function onResumeChange(next: ResumeListener | null): void {
  listener = next;
}

/**
 * The second to pick up from, or null when the session should start at the
 * beginning. Pure, so the rules are tested directly.
 */
export function resumePoint(
  entry: ResumeEntry | undefined,
  durationSeconds: number,
  now: number,
  minimum: number = MIN_RESUME_SECONDS,
): number | null {
  if (!entry) return null;
  if (now - entry.savedAt > RESUME_TTL_MS) return null;
  if (entry.seconds < minimum) return null;
  if (entry.seconds >= durationSeconds * FINISHED_FRACTION) return null;
  return Math.floor(entry.seconds);
}

export function readAll(): ResumeMap {
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

/**
 * The place to pick up from. `minimum` is in the same unit as the position:
 * seconds for most players, sentences for a story read by the device's voice.
 */
export function readResume(key: string, duration: number, minimum?: number): number | null {
  return resumePoint(readAll()[key], duration, Date.now(), minimum);
}

export function saveResume(key: string, position: number): void {
  const entry = { seconds: Math.floor(position), savedAt: Date.now() };
  writeAll({ ...readAll(), [key]: entry });
  if (!isDeviceOnly(key)) listener?.saved(key, entry);
}

export function clearResume(key: string): void {
  const map = readAll();
  if (!(key in map)) return;
  delete map[key];
  writeAll(map);
  if (!isDeviceOnly(key)) listener?.cleared(key);
}

/**
 * Folds places kept in the account into this device's. The newer of the two
 * wins for each session. Returns the local places that are newer than the
 * account's, which the caller sends back up. Pure apart from storage.
 */
export function mergeRemoteResume(remote: ResumeMap): ResumeMap {
  const local = readAll();
  const { merged, newerLocally } = mergeResumeMaps(local, remote);
  writeAll(merged);
  return newerLocally;
}

export function mergeResumeMaps(
  local: ResumeMap,
  remote: ResumeMap,
): { merged: ResumeMap; newerLocally: ResumeMap } {
  const merged: ResumeMap = { ...local };
  const newerLocally: ResumeMap = {};
  for (const [key, entry] of Object.entries(remote)) {
    if (!merged[key] || merged[key].savedAt < entry.savedAt) merged[key] = entry;
  }
  for (const [key, entry] of Object.entries(local)) {
    if (isDeviceOnly(key)) continue;
    if (!remote[key] || remote[key].savedAt < entry.savedAt) newerLocally[key] = entry;
  }
  return { merged, newerLocally };
}
