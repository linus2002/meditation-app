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
    title: 'Settle and Soften',
    subtitle: 'Your daily sit',
    narrator: 'Ava Lindqvist',
    category: 'focus',
    durationSeconds: 1800,
    tone: 'relaxation',
    image: photos.meditationSunrise,
    imageAlt: 'A person sitting cross-legged on a jetty at sunrise',
    soundscape: 'bowl',
    isDailyGoal: true,
    description:
      'A guided thirty minute sit that settles the breath, softens the jaw and returns attention to the body whenever it drifts.',
    breathPattern: boxBreath,
  },
  {
    id: 'free-your-mind',
    title: 'Free Your Mind',
    subtitle: 'Start here',
    narrator: 'Ava Lindqvist',
    category: 'focus',
    durationSeconds: 600,
    tone: 'activities',
    image: photos.ancientTree,
    imageAlt: 'Sunlight breaking through the canopy of a broad old tree',
    soundscape: 'pad',
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
    cover: photos.recoOneClean,
    coverFocus: '74% 50%',
    soundscape: 'ocean',
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
    cover: photos.recoTwo,
    coverFocus: '50% 30%',
    soundscape: 'night',
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
    image: photos.middayReset,
    imageAlt: 'A woman in a linen shirt, eyes closed, face turned up to a clear blue sky',
    cover: photos.middayResetClean,
    coverFocus: '50% 30%',
    soundscape: 'chimes',
    description: 'A short reset for the middle of a long day.',
    breathPattern: softBreath,
  },
];

/**
 * The sessions inside the free programmes on the home screen, listed in the
 * order each programme plays them. Kept apart from `meditations` so the
 * library and its category counts stay as they were; `getMeditation` and
 * search look through both, so each one plays and saves like any other.
 */
export const programSessions: Meditation[] = [
  {
    id: 'six-phase-connection',
    title: 'Connection',
    subtitle: 'Widen the circle',
    narrator: 'Ava Lindqvist',
    category: 'happiness',
    durationSeconds: 480,
    tone: 'happiness',
    image: photos.openArms,
    imageAlt: 'A person on a hilltop with arms open to the sky',
    soundscape: 'pad',
    description:
      'Begin with the people closest to you and let a sense of warmth spread outward, ring by ring, until it takes in everyone.',
    breathPattern: softBreath,
  },
  {
    id: 'six-phase-gratitude',
    title: 'Gratitude',
    subtitle: 'Three good things',
    narrator: 'Ava Lindqvist',
    category: 'happiness',
    durationSeconds: 480,
    tone: 'happiness',
    image: photos.sunriseHills,
    imageAlt: 'Sun cresting a line of rolling hills',
    soundscape: 'chimes',
    description:
      'Recall three things from the last day you are glad of, and stay with each long enough to actually feel it.',
    breathPattern: softBreath,
  },
  {
    id: 'six-phase-forgiveness',
    title: 'Forgiveness',
    subtitle: 'Setting the weight down',
    narrator: 'Ava Lindqvist',
    category: 'relaxation',
    durationSeconds: 600,
    tone: 'relaxation',
    image: photos.duskRidge,
    imageAlt: 'A ridge line fading into a dusk sky',
    soundscape: 'drone',
    description:
      'Notice a small grievance you are still carrying, against someone else or yourself, and practise loosening your grip on it.',
    breathPattern: calmBreath,
  },
  {
    id: 'six-phase-future-dream',
    title: 'Future Dream',
    subtitle: 'Three years from now',
    narrator: 'Ava Lindqvist',
    category: 'focus',
    durationSeconds: 600,
    tone: 'activities',
    image: photos.mountainValley,
    imageAlt: 'A green valley opening between mountains',
    soundscape: 'forest',
    description:
      'Picture a life three years from now in clear, sensory detail, and let it settle in as something worth walking towards.',
    breathPattern: boxBreath,
  },
  {
    id: 'six-phase-perfect-day',
    title: 'The Perfect Day',
    subtitle: 'Rehearse the hours ahead',
    narrator: 'Ava Lindqvist',
    category: 'focus',
    durationSeconds: 480,
    tone: 'activities',
    image: photos.morningField,
    imageAlt: 'Morning light over an open field',
    soundscape: 'forest',
    description:
      'Walk through the day ahead as you would like it to go, meeting each part of it calm, clear and unhurried.',
    breathPattern: boxBreath,
  },
  {
    id: 'six-phase-blessing',
    title: 'The Blessing',
    subtitle: 'Carried, not alone',
    narrator: 'Ava Lindqvist',
    category: 'relaxation',
    durationSeconds: 360,
    tone: 'relaxation',
    image: photos.starfield,
    imageAlt: 'A dense field of stars in a dark sky',
    soundscape: 'bowl',
    description:
      'Close by feeling supported by something larger than you, however you picture it, and carry that into the rest of the day.',
    breathPattern: softBreath,
  },
  {
    id: 'sleep-mastery-unclench',
    title: 'Unclench the Day',
    subtitle: 'Let the shoulders drop',
    narrator: 'Ines Moreau',
    category: 'sleep',
    durationSeconds: 600,
    tone: 'relaxation',
    image: photos.palmDusk,
    imageAlt: 'Palm trees against a dusk sky',
    soundscape: 'night',
    description:
      'Release the day from the jaw, the hands and the shoulders, one place at a time, before you ask your mind to rest.',
    breathPattern: calmBreath,
  },
  {
    id: 'sleep-mastery-heavy-body',
    title: 'The Heavy Body',
    subtitle: 'Sinking into the mattress',
    narrator: 'Ines Moreau',
    category: 'sleep',
    durationSeconds: 720,
    tone: 'relaxation',
    image: photos.nightSky,
    imageAlt: 'A quiet night sky over dark hills',
    soundscape: 'drone',
    description:
      'A slow scan from the feet upward that lets each part of the body grow heavy and be held.',
    breathPattern: calmBreath,
  },
  {
    id: 'sleep-mastery-counting-down',
    title: 'Counting Down',
    subtitle: 'From fifty to nothing',
    narrator: 'Ines Moreau',
    category: 'sleep',
    durationSeconds: 600,
    tone: 'relaxation',
    image: photos.milkyWay,
    imageAlt: 'The Milky Way arching over a dark horizon',
    soundscape: 'night',
    description:
      'Count slowly down from fifty on the out-breath. If you lose your place, start again from wherever you are.',
    breathPattern: softBreath,
  },
  {
    id: 'sleep-mastery-worry-parking',
    title: 'Worry Parking',
    subtitle: 'Set tomorrow aside',
    narrator: 'Ines Moreau',
    category: 'sleep',
    durationSeconds: 480,
    tone: 'relaxation',
    image: photos.forestBridge,
    imageAlt: 'A wooden bridge leading into a misty forest',
    soundscape: 'rain',
    description:
      'Name each thing still on your mind, place it somewhere safe for the morning, and let it wait there.',
    breathPattern: calmBreath,
  },
  {
    id: 'sleep-mastery-night-breath',
    title: 'Breath of the Night',
    subtitle: 'Four, seven, eight',
    narrator: 'Ines Moreau',
    category: 'sleep',
    durationSeconds: 600,
    tone: 'relaxation',
    image: photos.starfield,
    imageAlt: 'A dense field of stars in a dark sky',
    soundscape: 'night',
    description:
      'The four-seven-eight breath, paced gently, to slow the heart and tell the body it is time to rest.',
    breathPattern: calmBreath,
  },
  {
    id: 'sleep-mastery-long-exhale',
    title: 'The Long Exhale',
    subtitle: 'Let the out-breath lead',
    narrator: 'Ines Moreau',
    category: 'sleep',
    durationSeconds: 720,
    tone: 'relaxation',
    image: photos.oceanWave,
    imageAlt: 'A slow wave rolling towards the shore',
    soundscape: 'ocean',
    description:
      'Lengthen each out-breath a little past the in-breath, and let the rhythm of the sea carry you down.',
    breathPattern: calmBreath,
  },
  {
    id: 'sleep-mastery-drifting-off',
    title: 'Drifting Off',
    subtitle: 'No need to stay awake for the end',
    narrator: 'Ines Moreau',
    category: 'sleep',
    durationSeconds: 900,
    tone: 'relaxation',
    image: photos.aerialSea,
    imageAlt: 'Open sea seen from high above',
    soundscape: 'ocean',
    description:
      'A soft, wandering guided rest with long silences. There is nothing to finish — fall asleep whenever you do.',
    breathPattern: softBreath,
  },
  {
    id: 'steady-mind-name-it',
    title: 'Name What Is Here',
    subtitle: 'Noticing without fixing',
    narrator: 'Noah Brandt',
    category: 'anxiety',
    durationSeconds: 480,
    tone: 'happiness',
    image: photos.forestLight,
    imageAlt: 'Sunlight falling through a quiet forest',
    soundscape: 'forest',
    description:
      'Gently label what you notice — thinking, feeling, sound — so anxious thoughts become things you see rather than things you are.',
    breathPattern: boxBreath,
  },
  {
    id: 'steady-mind-anchor',
    title: 'Anchor in the Feet',
    subtitle: 'Ground through the body',
    narrator: 'Noah Brandt',
    category: 'anxiety',
    durationSeconds: 480,
    tone: 'happiness',
    image: photos.ancientTree,
    imageAlt: 'Sunlight breaking through the canopy of a broad old tree',
    soundscape: 'forest',
    description:
      'Bring attention down into the soles of the feet and the weight of the body whenever the mind starts to race.',
    breathPattern: boxBreath,
  },
  {
    id: 'steady-mind-wave',
    title: 'Riding the Wave',
    subtitle: 'Let the feeling crest and pass',
    narrator: 'Noah Brandt',
    category: 'anxiety',
    durationSeconds: 600,
    tone: 'happiness',
    image: photos.oceanWave,
    imageAlt: 'A slow wave rolling towards the shore',
    soundscape: 'ocean',
    description:
      'Meet a wave of worry with curiosity, track how it rises and peaks, and watch it fall away on its own.',
    breathPattern: calmBreath,
  },
  {
    id: 'steady-mind-observer',
    title: 'The Calm Observer',
    subtitle: 'Watching thoughts go by',
    narrator: 'Noah Brandt',
    category: 'anxiety',
    durationSeconds: 600,
    tone: 'happiness',
    image: photos.duskRidge,
    imageAlt: 'A ridge line fading into a dusk sky',
    soundscape: 'pad',
    description:
      'Sit on the riverbank of your own mind and let thoughts float past without being pulled in after them.',
    breathPattern: softBreath,
  },
  {
    id: 'steady-mind-steady-ground',
    title: 'Steady Ground',
    subtitle: 'Carry the calm with you',
    narrator: 'Noah Brandt',
    category: 'anxiety',
    durationSeconds: 720,
    tone: 'happiness',
    image: photos.mountainValley,
    imageAlt: 'A green valley opening between mountains',
    soundscape: 'bowl',
    description:
      'Bring the whole programme together into one steady practice you can return to whenever you need it.',
    breathPattern: boxBreath,
  },
  {
    id: 'open-water-shoreline',
    title: 'Shoreline',
    subtitle: 'Arriving at the edge',
    narrator: 'Ava Lindqvist',
    category: 'relaxation',
    durationSeconds: 480,
    tone: 'relaxation',
    image: photos.oceanWave,
    imageAlt: 'A slow wave rolling towards the shore',
    soundscape: 'ocean',
    description:
      'Settle in at the water’s edge and let the sound of the waves set the pace of the breath.',
    breathPattern: softBreath,
  },
  {
    id: 'open-water-tidepool',
    title: 'Tidepool',
    subtitle: 'Small and still',
    narrator: 'Ava Lindqvist',
    category: 'relaxation',
    durationSeconds: 600,
    tone: 'relaxation',
    image: photos.palmDusk,
    imageAlt: 'Palm trees against a dusk sky',
    soundscape: 'ocean',
    description:
      'Narrow attention to one small, still place, the way a tidepool holds calm while the sea moves around it.',
    breathPattern: softBreath,
  },
  {
    id: 'open-water-open-sea',
    title: 'Open Sea',
    subtitle: 'Spaciousness',
    narrator: 'Ava Lindqvist',
    category: 'relaxation',
    durationSeconds: 720,
    tone: 'relaxation',
    image: photos.aerialSea,
    imageAlt: 'Open sea seen from high above',
    soundscape: 'ocean',
    description:
      'Let awareness widen out like open water until there is plenty of room for whatever you are feeling.',
    breathPattern: calmBreath,
  },
  {
    id: 'open-water-return',
    title: 'Return to Shore',
    subtitle: 'Bringing the calm back',
    narrator: 'Ava Lindqvist',
    category: 'relaxation',
    durationSeconds: 480,
    tone: 'relaxation',
    image: photos.sunriseHills,
    imageAlt: 'Sun cresting a line of rolling hills',
    soundscape: 'chimes',
    description:
      'Swim slowly back to land, bringing the spaciousness of the open water into the rest of your day.',
    breathPattern: softBreath,
  },
];

/** Every playable session: the library, then the programme sessions. */
export const allSessions: Meditation[] = [...meditations, ...programSessions];

export const dailyGoal = meditations.find((item) => item.isDailyGoal) ?? meditations[0];
export const startGoal = meditations.find((item) => item.id === 'free-your-mind') ?? meditations[1];
export const sleepSessions = meditations.filter((item) => item.isSleep);

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
