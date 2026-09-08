import type { StaticImageData } from 'next/image';
import type { LucideIcon } from 'lucide-react';

import type { SoundscapeId } from '@/lib/audio/soundscapes';

/** The three gradient treatments used by the deck on the home screen. */
export type DeckTone = 'activities' | 'happiness' | 'relaxation';

export interface DeckCard {
  id: string;
  /** Large, light-weight headline shown on the gradient card. */
  title: string;
  /** Small bold caption directly beneath the headline. */
  caption: string;
  tone: DeckTone;
  href: string;
  /** Photograph washed in behind the gradient at low opacity. */
  image: StaticImageData;
}

export type CategorySlug =
  | 'focus'
  | 'sleep'
  | 'anxiety'
  | 'happiness'
  | 'relaxation'
  | 'breathing';

export interface Category {
  slug: CategorySlug;
  name: string;
  /** Sessions available inside this category, used for the discovery rail. */
  sessionCount: number;
  icon: LucideIcon;
  tone: DeckTone;
  /** Tile artwork for the discovery grid. */
  image: StaticImageData;
}

export interface Meditation {
  id: string;
  title: string;
  /** Short line used under the title on cards and in the player. */
  subtitle: string;
  narrator: string;
  category: CategorySlug;
  /** Duration in seconds — formatted for display at the edges. */
  durationSeconds: number;
  tone: DeckTone;
  /** Session artwork: the list thumbnail and the player backdrop. */
  image: StaticImageData;
  /** Short alt text describing the artwork. */
  imageAlt: string;
  /** The synthesised bed that plays while this session runs. */
  soundscape: SoundscapeId;
  /** Marks the "Daily Goals" entry surfaced on the home screen. */
  isDailyGoal?: boolean;
  /** Sleep-specific sessions surface on the sleep screen. */
  isSleep?: boolean;
  description: string;
  /** Ordered breathing phases driving the session orb animation. */
  breathPattern: BreathPhase[];
}

export interface BreathPhase {
  label: string;
  seconds: number;
}

export interface SessionRecord {
  /** Unique per sitting. */
  id: string;
  meditationId: string;
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  /** Seconds actually listened, not the session's nominal length. */
  seconds: number;
  /** Whether it ran to the end, or was left part-way. */
  completed: boolean;
  startedAt: number;
}

/** Everything the activities screen shows for one day, all derived. */
export interface DaySummary {
  date: string;
  day: number;
  seconds: number;
  minutes: number;
  goalMinutes: number;
  sessions: number;
  /** 0-1 against the daily goal, drives the ring. */
  completion: number;
  /** Clock time of the first sit, or null if there was none. */
  firstSitAt: string | null;
  /** Total time that day as "HH:MM". */
  totalTime: string;
}

export interface SleepNight {
  /** Short weekday label, e.g. "Mon". */
  label: string;
  hours: number;
  quality: number;
  deepSleepHours: number;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  initials: string;
  memberSince: string;
}

export interface SettingToggle {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  defaultOn: boolean;
}

export interface Reflection {
  /** Local calendar date, `YYYY-MM-DD`. One entry per day. */
  date: string;
  promptId: string;
  /** Stored alongside the answer so history still reads if prompts change. */
  prompt: string;
  answer: string;
  /** 1-5: how the reflection sat, not a verdict on the person. */
  weight: number;
  updatedAt: number;
}

export type StoryCategory = 'sleep' | 'relaxation' | 'mindfulness';

export interface Story {
  id: string;
  title: string;
  /** One line, shown on the card. */
  description: string;
  category: StoryCategory;
  /** Narrator persona shown in the reader. */
  voice: string;
  image: StaticImageData;
  imageAlt: string;
  /** Paragraphs of the story itself — read on screen and aloud. */
  paragraphs: string[];
  /** Ambient bed offered under the narration. */
  soundscape: SoundscapeId;
}
