import type { SoundscapeId } from '@/lib/audio/soundscapes';

/** Lengths offered as one-tap presets, in minutes. */
export const TIMER_PRESETS = [3, 5, 10, 15, 20, 30, 45, 60] as const;

export const DEFAULT_TIMER_MINUTES = 15;

/** Bells struck at a fixed cadence through the sit. */
export const INTERVAL_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
] as const;

/** A pause before the opening bell, to settle. */
export const WARMUP_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
] as const;

/** Ambient beds offered alongside a plain sit. */
export const TIMER_SOUNDSCAPES: (SoundscapeId | null)[] = [
  null,
  'rain',
  'ocean',
  'forest',
  'night',
  'bowl',
  'pad',
  'drone',
  'chimes',
];

/** The id recorded against an unguided sit. */
export const UNGUIDED_ID = 'unguided-timer';
