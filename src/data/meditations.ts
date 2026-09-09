import { photos } from '@/data/images';
import type { BreathPhase, Meditation } from '@/types';

const boxBreath: BreathPhase[] = [
  { label: 'Breathe in', seconds: 4 },
  { label: 'Hold', seconds: 4 },
  { label: 'Breathe out', seconds: 4 },
  { label: 'Hold', seconds: 4 },
];

const calmBreath: BreathPhase[] = [
  { label: 'Breathe in', seconds: 4 },
  { label: 'Hold', seconds: 7 },
  { label: 'Breathe out', seconds: 8 },
];

const softBreath: BreathPhase[] = [
  { label: 'Breathe in', seconds: 5 },
  { label: 'Breathe out', seconds: 5 },
];

export const meditations: Meditation[] = [
  {
    id: 'meditation-daily',
    title: 'Meditation',
    subtitle: 'Daily Goals',
    narrator: 'Ava Lindqvist',
    category: 'focus',
    durationSeconds: 1800,
    tone: 'relaxation',
    image: photos.meditationSunrise,
    imageAlt: 'A person sitting cross-legged on a jetty at sunrise',
    soundscape: 'bowl',
    rating: 4.9,
    isDailyGoal: true,
    description:
      'A guided thirty minute sit that settles the breath, softens the jaw and returns attention to the body whenever it drifts.',
    breathPattern: boxBreath,
  },
  {
    id: 'free-your-mind',
    title: 'Start Your Goal',
    subtitle: 'Free your mind',
    narrator: 'Ava Lindqvist',
    category: 'focus',
    durationSeconds: 600,
    tone: 'activities',
    image: photos.ancientTree,
    imageAlt: 'Sunlight breaking through the canopy of a broad old tree',
    soundscape: 'pad',
    rating: 4.7,
    description:
      'Ten minutes to clear the noise before your first session. Nothing to achieve, nothing to fix.',
    breathPattern: softBreath,
  },
  {
    id: 'morning-clarity',
    title: 'Morning Clarity',
    subtitle: 'Begin the day unhurried',
    narrator: 'Noah Brandt',
    category: 'focus',
    durationSeconds: 900,
    tone: 'activities',
    image: photos.morningField,
    imageAlt: 'Sun rising over an open field',
    soundscape: 'forest',
    rating: 4.8,
    description:
      'Set an intention while the day is still quiet, then carry that steadiness into the hours ahead.',
    breathPattern: boxBreath,
  },
  {
    id: 'quiet-the-noise',
    title: 'Quiet The Noise',
    subtitle: 'Release the racing thoughts',
    narrator: 'Ines Moreau',
    category: 'anxiety',
    durationSeconds: 720,
    tone: 'happiness',
    image: photos.duskRidge,
    imageAlt: 'Layered mountain ridges at dusk',
    soundscape: 'rain',
    rating: 4.9,
    description:
      'A grounding practice for the moments when everything feels loud at once.',
    breathPattern: calmBreath,
  },
  {
    id: 'open-heart',
    title: 'Open Heart',
    subtitle: 'A practice in gratitude',
    narrator: 'Ines Moreau',
    category: 'happiness',
    durationSeconds: 1080,
    tone: 'happiness',
    image: photos.openArms,
    imageAlt: 'A person standing with arms open against a low sun',
    soundscape: 'pad',
    rating: 4.8,
    description:
      'Turn toward what is already going well and let appreciation do the rest of the work.',
    breathPattern: softBreath,
  },
  {
    id: 'body-scan',
    title: 'Full Body Scan',
    subtitle: 'Head to toe release',
    narrator: 'Noah Brandt',
    category: 'relaxation',
    durationSeconds: 1500,
    tone: 'relaxation',
    image: photos.forestBridge,
    imageAlt: 'A wooden footbridge through dense green forest',
    soundscape: 'drone',
    rating: 4.6,
    description:
      'Move slowly through the body, unclenching each place that has been holding on all day.',
    breathPattern: calmBreath,
  },
  {
    id: 'ocean-drift',
    title: 'Ocean Drift',
    subtitle: 'Slow tidal breathing',
    narrator: 'Ava Lindqvist',
    category: 'relaxation',
    durationSeconds: 1200,
    tone: 'relaxation',
    image: photos.oceanWave,
    imageAlt: 'A slow wave rolling over open water',
    soundscape: 'ocean',
    rating: 4.9,
    description:
      'Match your breath to a long, unhurried tide until the rhythm carries itself.',
    breathPattern: softBreath,
  },
  {
    id: 'box-breathing',
    title: 'Box Breathing',
    subtitle: 'Four counts, four sides',
    narrator: 'Noah Brandt',
    category: 'breathing',
    durationSeconds: 480,
    tone: 'activities',
    image: photos.mountainValley,
    imageAlt: 'A wide mountain valley under clear sky',
    soundscape: 'forest',
    rating: 4.7,
    description:
      'An even four-count square that steadies the nervous system in under ten minutes.',
    breathPattern: boxBreath,
  },
  {
    id: 'deep-rest',
    title: 'Deep Rest',
    subtitle: 'Sleep story',
    narrator: 'Ines Moreau',
    category: 'sleep',
    durationSeconds: 2700,
    tone: 'relaxation',
    image: photos.starfield,
    imageAlt: 'A dense field of stars in deep space',
    soundscape: 'night',
    rating: 4.9,
    isSleep: true,
    description:
      'A slow, low-voiced story written to be half-heard as you fall asleep.',
    breathPattern: calmBreath,
  },
  {
    id: 'night-wind-down',
    title: 'Night Wind Down',
    subtitle: 'Close the day gently',
    narrator: 'Ava Lindqvist',
    category: 'sleep',
    durationSeconds: 1200,
    tone: 'relaxation',
    image: photos.milkyWay,
    imageAlt: 'The Milky Way arcing above a mountain range',
    soundscape: 'drone',
    rating: 4.8,
    isSleep: true,
    description:
      'Put the day down deliberately so it does not follow you into bed.',
    breathPattern: calmBreath,
  },
  {
    id: 'rain-on-glass',
    title: 'Rain On Glass',
    subtitle: 'Ambient soundscape',
    narrator: 'Ambient',
    category: 'sleep',
    durationSeconds: 3600,
    tone: 'relaxation',
    image: photos.nightSky,
    imageAlt: 'A dark night sky above a faint horizon',
    soundscape: 'rain',
    rating: 4.7,
    isSleep: true,
    description: 'An hour of steady rain against a window, with no narration at all.',
    breathPattern: softBreath,
  },
  {
    id: 'midday-reset',
    title: 'Midday Reset',
    subtitle: 'Five minutes back to centre',
    narrator: 'Noah Brandt',
    category: 'focus',
    durationSeconds: 300,
    tone: 'activities',
    image: photos.sunriseHills,
    imageAlt: 'Sun cresting a line of rolling hills',
    soundscape: 'chimes',
    rating: 4.6,
    description: 'A short reset for the middle of a long day.',
    breathPattern: softBreath,
  },
];

export const dailyGoal = meditations.find((item) => item.isDailyGoal) ?? meditations[0];
export const startGoal = meditations.find((item) => item.id === 'free-your-mind') ?? meditations[1];
export const sleepSessions = meditations.filter((item) => item.isSleep);

export function getMeditation(id: string): Meditation | undefined {
  return meditations.find((item) => item.id === id);
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
