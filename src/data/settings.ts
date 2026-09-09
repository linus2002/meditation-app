import { Bell, Moon, Music, Sun, Vibrate, Volume2 } from 'lucide-react';
import type { SettingToggle } from '@/types';

/**
 * `lightMode` is read by AppProvider, which puts the matching `data-theme` on
 * the document — every other id here is a plain stored flag.
 */
export const settingToggles: SettingToggle[] = [
  {
    id: 'lightMode',
    label: 'Light mode',
    description: 'Swap the dark canvas for a white one across the app',
    icon: Sun,
    defaultOn: false,
  },
  {
    id: 'reminders',
    label: 'Daily reminder',
    description: 'A single nudge at 07:00 to start your session',
    icon: Bell,
    defaultOn: true,
  },
  {
    id: 'bedtime',
    label: 'Bedtime wind down',
    description: 'Dim the app and suggest a sleep story at 22:30',
    icon: Moon,
    defaultOn: true,
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
