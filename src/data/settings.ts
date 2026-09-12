import { Bell, Moon, Music, Sparkles, Sun, Vibrate, Volume2 } from 'lucide-react';

import { getReminder } from '@/lib/reminders';
import type { SettingToggle } from '@/types';

/**
 * `lightMode` is read by AppProvider, which puts the matching `data-theme` on
 * the document. `reminders` and `bedtime` drive the notification schedule in
 * `lib/notifications` — and take their times from the definitions there, so the
 * hour promised in the description is always the hour that gets scheduled.
 * Every other id here is a plain stored flag.
 */
const reminderTime = getReminder('reminders')?.time ?? '07:00';
const bedtimeTime = getReminder('bedtime')?.time ?? '22:30';
const inspirationTime = getReminder('inspiration')?.time ?? '08:00';
export const settingToggles: SettingToggle[] = [
  {
    id: 'lightMode',
    label: 'Light mode',
    description: 'Swap the dark canvas for a white one across the app',
    icon: Sun,
    defaultOn: false,
  },
  // Both start off. They need notification permission to mean anything, and a
  // toggle that reads "on" before anyone has been asked is a promise the app
  // cannot keep.
  {
    id: 'reminders',
    label: 'Daily reminder',
    description: `A single nudge at ${reminderTime} to start your session`,
    icon: Bell,
    defaultOn: false,
  },
  {
    id: 'bedtime',
    label: 'Bedtime wind down',
    description: `A nudge at ${bedtimeTime} to put the day down and pick something for sleep`,
    icon: Moon,
    defaultOn: false,
  },
  {
    id: 'inspiration',
    label: 'Daily inspiration',
    description: `A short, uplifting message each day at ${inspirationTime}`,
    icon: Sparkles,
    defaultOn: false,
  },
  {
    id: 'haptics',
    label: 'Breathing haptics',
    description: 'A soft pulse on each inhale and exhale',
    icon: Vibrate,
    defaultOn: false,
  },
  {
    id: 'breathCues',
    label: 'Breath cue tones',
    description: 'A soft tone at the top of each inhale and exhale',
    icon: Music,
    defaultOn: true,
  },
  {
    id: 'ambient',
    label: 'Ambient background',
    description: 'Play the ambient bed behind guided sessions',
    icon: Volume2,
    defaultOn: true,
  },
];
