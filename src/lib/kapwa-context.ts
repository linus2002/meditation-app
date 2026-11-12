import type { Program } from '@/data/programs';
import type { Meditation, SessionRecord } from '@/types';

/**
 * What Kapwa's AI knows about the app and this reader, sent with each message
 * as plain text. Built on the device from the catalogue and the reader's own
 * history, so the AI can say what a feature does, what's in the library, and
 * which sessions the reader hasn't tried yet. It holds no name or email.
 *
 * The AI suggests sessions by id on a final `SESSIONS:` line, which
 * `parseSessionLine` turns into tap-to-play buttons; titles named in the
 * reply are the fallback (`findSessionTitles`).
 */

/**
 * Every screen Kapwa may describe, and how to do the common things. Settings
 * and shortcuts are read from the app's own lists, so their names here always
 * match what the reader sees.
 */
export function appFeatures(
  settings: { label: string; description: string }[],
  shortcuts: { label: string; href: string; description: string }[],
): string {
  return [
    'Bottom bar: Home, Meditations, Kapwa (middle button), Yoga, Sleep.',
    'Home: today’s suggested session, daily goal, streak and recent activity.',
    'Meditations: the library by mood category (Focus, Sleep, Anxiety, Happiness, Relaxation, Breathing) and free multi-session programmes. Tap a session to play it; tap the heart to save it to Favourites; tap download to keep it offline.',
    'Yoga: short guided yoga sessions with a spoken voice guide.',
    'Sleep: sleep sessions, a soundscape mixer and a sleep log.',
    'Profile: streak, mindful minutes and sessions count; Daily Goal (set your minutes per day); Preferences; Shortcuts; account sign-in and sign-out.',
    'Profile > Preferences has these switches:',
    ...settings.map((s) => `- ${s.label}: ${s.description}.`),
    'Profile > Shortcuts opens these screens:',
    ...shortcuts.map((s) => `- ${s.label} (${s.href}): ${s.description}.`),
    'To set a reminder: open Profile, go to Preferences and turn on "Daily reminder" (or "Bedtime wind down"); allow notifications when the phone asks. Notifications (bell icon) shows reminders.',
  ].join('\n');
}

export interface KapwaContextInput {
  meditations: Meditation[];
  programs: Program[];
  stories: { title: string; category: string }[];
  yoga: { title: string; focus: string; level: string }[];
  sessions: SessionRecord[];
  favorites: string[];
  streakDays: number;
  settings: { label: string; description: string }[];
  shortcuts: { label: string; href: string; description: string }[];
}

type Status = 'done' | 'started' | 'new';

function statusById(sessions: SessionRecord[]): Map<string, Status> {
  const map = new Map<string, Status>();
  for (const record of sessions) {
    if (record.completed) map.set(record.meditationId, 'done');
    else if (!map.has(record.meditationId)) map.set(record.meditationId, 'started');
  }
  return map;
}

const minutes = (seconds: number) => Math.round(seconds / 60);

/**
 * The reader's lists are worked out here, not left to the model: small local
 * models misread a status column, but copy a ready-made list faithfully.
 */
export function buildKapwaContext(input: KapwaContextInput): string {
  const status = statusById(input.sessions);
  const statusOf = (id: string): Status => status.get(id) ?? 'new';
  const favourites = new Set(input.favorites);

  const line = (m: Meditation) =>
    `${m.title} (${minutes(m.durationSeconds)} min, ${m.category}) [${m.id}]`;
  const list = (items: Meditation[]) => (items.length > 0 ? items.map((m) => `- ${line(m)}`) : ['- none']);

  const notTried = input.meditations.filter((m) => statusOf(m.id) === 'new');
  const finished = input.meditations.filter((m) => statusOf(m.id) === 'done');
  const started = input.meditations.filter((m) => statusOf(m.id) === 'started');
  const saved = input.meditations.filter((m) => favourites.has(m.id));

  const programmes = input.programs.map((program) => {
    const done = program.sessions.filter((s) => statusOf(s.id) === 'done').length;
    const next = program.sessions.find((s) => statusOf(s.id) !== 'done');
    const nextText = next ? `; next session: ${line(next)}` : '; all finished';
    return `- ${program.title} (${program.level}): ${done} of ${program.sessions.length} done${nextText}`;
  });

  const completed = input.sessions.filter((s) => s.completed);
  const totalMinutes = minutes(input.sessions.reduce((sum, s) => sum + s.seconds, 0));

  return [
    'APP FEATURES',
    appFeatures(input.settings, input.shortcuts),
    '',
    'READER PROGRESS',
    `Completed sittings: ${completed.length}. Minutes practised: ${totalMinutes}. Current streak: ${input.streakDays} days.`,
    `Library: ${input.meditations.length} meditations. Finished: ${finished.length}. Started but not finished: ${started.length}. Not tried yet: ${notTried.length}.`,
    '',
    `NOT TRIED YET (${notTried.length}) — use this list for "what haven't I tried", "what's left", "what's new":`,
    ...list(notTried),
    '',
    `FINISHED (${finished.length}) — use this list for "what have I done/finished":`,
    ...list(finished),
    '',
    `STARTED BUT NOT FINISHED (${started.length}):`,
    ...list(started),
    '',
    `FAVOURITES (${saved.length}):`,
    ...list(saved),
    '',
    'PROGRAMMES (free, multi-session, in Meditations):',
    ...programmes,
    '',
    'STORIES (in Stories):',
    ...input.stories.map((s) => `- ${s.title} (${s.category})`),
    '',
    'YOGA (in Yoga):',
    ...input.yoga.map((y) => `- ${y.title} (${y.focus}, ${y.level})`),
  ].join('\n');
}

const SESSION_LINE = 'SESSIONS:';

/**
 * Splits the AI's reply into the text to show and the session ids on its
 * final `SESSIONS:` line. Mid-stream, a line that is still being written and
 * could become `SESSIONS:` is held back so it never flashes on screen.
 */
export function parseSessionLine(raw: string): { text: string; ids: string[] } {
  // Small models sometimes copy the [id] tags from APP CONTEXT into the text.
  const reply = raw.replace(/[ \t]*\[[a-z0-9-]+\]/g, '');
  const at = reply.lastIndexOf(SESSION_LINE);
  if (at !== -1) {
    const ids = reply
      .slice(at + SESSION_LINE.length)
      .split(/[,\s]+/)
      .map((id) => id.replace(/[^a-z0-9-]/g, ''))
      .filter((id) => /^[a-z0-9-]+$/.test(id));
    return { text: reply.slice(0, at).trim(), ids: [...new Set(ids)] };
  }

  const lastBreak = reply.lastIndexOf('\n');
  const tail = reply.slice(lastBreak + 1).trim();
  if (tail && SESSION_LINE.startsWith(tail)) {
    return { text: reply.slice(0, Math.max(lastBreak, 0)).trim(), ids: [] };
  }
  return { text: reply.trim(), ids: [] };
}

/**
 * Sessions named in the reply by title, in the order they appear. Small local
 * models often leave out the `SESSIONS:` line, so this is how their
 * suggestions still become buttons. Longer titles are matched first, so
 * "Full Body Scan" isn't also counted as "Body Scan".
 */
export function findSessionTitles(text: string, sessions: { id: string; title: string }[]): string[] {
  const lower = text.toLowerCase();
  const taken: [number, number][] = [];
  const found: { id: string; at: number }[] = [];
  for (const session of [...sessions].sort((a, b) => b.title.length - a.title.length)) {
    const title = session.title.toLowerCase();
    if (title.length < 4) continue;
    const at = lower.indexOf(title);
    if (at === -1 || taken.some(([start, end]) => at < end && at + title.length > start)) continue;
    taken.push([at, at + title.length]);
    found.push({ id: session.id, at });
  }
  return found.sort((a, b) => a.at - b.at).map((match) => match.id);
}
