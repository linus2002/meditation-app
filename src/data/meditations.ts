import { content, onContentChange, toImage, type ContentMeditation } from '@/content';
import type { BreathPhase, Meditation } from '@/types';

/*
 * Sessions are edited in Sanity (Studio → Meditations) and arrive through
 * src/content. Order follows each document's Order field.
 */
function toMeditation(item: ContentMeditation): Meditation {
  // A recording without a usable length (published before the Studio measured
  // it) is still played, but the session keeps its listed minutes.
  const track = item.recording?.src ? item.recording : undefined;
  const trackSeconds = Number(track?.duration);
  return {
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    narrator: item.narrator,
    category: item.category,
    // A recording sets its own length; the minutes in Sanity are for the rest.
    durationSeconds:
      Number.isFinite(trackSeconds) && trackSeconds > 0 ? Math.round(trackSeconds) : item.durationMinutes * 60,
    ...(track ? { track: track.src } : {}),
    tone: item.tone,
    image: toImage(item.image),
    imageAlt: item.imageAlt,
    ...(item.cover ? { cover: toImage(item.cover) } : {}),
    ...(item.coverFocus ? { coverFocus: item.coverFocus } : {}),
    soundscape: item.soundscape,
    ...(item.isDailyGoal ? { isDailyGoal: true } : {}),
    ...(item.isSleep ? { isSleep: true } : {}),
    description: item.description,
    breathPattern: item.breathPattern,
  };
}

/*
 * Everything below is rebuilt whenever fresh content arrives from Sanity
 * (see src/content/live.ts); `export let` keeps each import pointing at the
 * current value.
 */

/** The library: every session marked to show in it. */
export let meditations: Meditation[] = [];

/**
 * The sessions inside the free programmes, listed in the order each programme
 * plays them. Kept apart from `meditations` so the library and its category
 * counts stay as they were; `getMeditation` and search look through both, so
 * each one plays and saves like any other.
 */
export let programSessions: Meditation[] = [];

/** Every playable session: the library, then the programme sessions. */
export let allSessions: Meditation[] = [];

export let dailyGoal: Meditation;
export let startGoal: Meditation;
export let sleepSessions: Meditation[] = [];

onContentChange(() => {
  meditations = content.meditations.filter((item) => item.inLibrary !== false).map(toMeditation);
  programSessions = content.meditations.filter((item) => item.inLibrary === false).map(toMeditation);
  allSessions = [...meditations, ...programSessions];
  dailyGoal = meditations.find((item) => item.isDailyGoal) ?? meditations[0];
  startGoal = meditations.find((item) => item.id === 'free-your-mind') ?? meditations[1];
  sleepSessions = meditations.filter((item) => item.isSleep);
});

export function getMeditation(id: string): Meditation | undefined {
  return allSessions.find((item) => item.id === id);
}

export function getMeditationsByCategory(slug: string): Meditation[] {
  return meditations.filter((item) => item.category === slug);
}

/** Total seconds in one full cycle of a breathing pattern. */
export function breathCycleSeconds(pattern: BreathPhase[]): number {
  return pattern.reduce((total, phase) => total + phase.seconds, 0);
}

/**
 * What to offer after a sitting. Prefers something from the same category so
 * the suggestion follows the mood you were already in, and is deterministic so
 * server and client agree on it.
 */
export function suggestNext(excludeId?: string, preferCategory?: string): Meditation {
  const pool = meditations.filter((item) => item.id !== excludeId);
  const sameCategory = preferCategory
    ? pool.filter((item) => item.category === preferCategory)
    : [];
  const list = sameCategory.length > 0 ? sameCategory : pool;

  // The shortest option in the pool — the easiest thing to say yes to next.
  return list.reduce((shortest, item) =>
    item.durationSeconds < shortest.durationSeconds ? item : shortest,
  );
}
