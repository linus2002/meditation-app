/**
 * Fixed choices the app understands. Each list mirrors a type in the app
 * (named beside it), so the Studio can only offer values the app can show.
 * Adding one here means adding it there too.
 */

/** `CategorySlug` in src/types. */
export const CATEGORIES = [
  { title: 'Focus', value: 'focus' },
  { title: 'Sleep', value: 'sleep' },
  { title: 'Anxiety', value: 'anxiety' },
  { title: 'Happiness', value: 'happiness' },
  { title: 'Relaxation', value: 'relaxation' },
  { title: 'Breathing', value: 'breathing' },
];

/** `DeckTone` in src/types: the colour treatment on cards. */
export const TONES = [
  { title: 'Activities (blue)', value: 'activities' },
  { title: 'Happiness (warm)', value: 'happiness' },
  { title: 'Relaxation (green)', value: 'relaxation' },
];

/** `SoundscapeId` in src/lib/audio/soundscapes: generated in the app, not files. */
export const SOUNDSCAPES = [
  { title: 'Rain', value: 'rain' },
  { title: 'Ocean', value: 'ocean' },
  { title: 'Forest', value: 'forest' },
  { title: 'Night', value: 'night' },
  { title: 'Singing Bowl', value: 'bowl' },
  { title: 'Warm Pad', value: 'pad' },
  { title: 'Deep Drone', value: 'drone' },
  { title: 'Chimes', value: 'chimes' },
];

/** `StoryCategory` in src/types. */
export const STORY_CATEGORIES = [
  { title: 'Sleep', value: 'sleep' },
  { title: 'Relaxation', value: 'relaxation' },
  { title: 'Mindfulness', value: 'mindfulness' },
];

/** `YogaLevel` in src/data/yoga. */
export const YOGA_LEVELS = [
  { title: 'Gentle', value: 'Gentle' },
  { title: 'Beginner', value: 'Beginner' },
  { title: 'All levels', value: 'All levels' },
];

/** `InspirationTag` in src/data/inspirations. */
export const INSPIRATION_TAGS = [
  { title: 'Calm', value: 'calm' },
  { title: 'Sleep', value: 'sleep' },
  { title: 'Focus', value: 'focus' },
  { title: 'Self-kindness', value: 'self-kindness' },
  { title: 'Hard day', value: 'hard-day' },
  { title: 'New start', value: 'new-start' },
  { title: 'Momentum', value: 'momentum' },
];

/** Icons the app has for categories (lucide-react names). */
export const CATEGORY_ICONS = [
  { title: 'Brain', value: 'Brain' },
  { title: 'Moon and cloud', value: 'CloudMoon' },
  { title: 'Heart pulse', value: 'HeartPulse' },
  { title: 'Sparkles', value: 'Sparkles' },
  { title: 'Waves', value: 'Waves' },
  { title: 'Wind', value: 'Wind' },
];

/** Ids appear in links (/player/<id>) and in readers' saved history. */
export const ID_DESCRIPTION =
  'Used in the app’s links and in what readers have saved. Never change it once published.';
