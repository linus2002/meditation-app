import {
  ArrowDownToLine,
  Bell,
  BookOpen,
  Flame,
  Heart,
  HeartHandshake,
  NotebookPen,
  Timer,
  TimerReset,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { supportTrackEnabled } from '@/lib/support-track';

export interface Shortcut {
  href: string;
  label: string;
  /** One line under the label saying what is there, as on the Preferences rows. */
  description: string;
  icon: LucideIcon;
}

/**
 * Every screen that has no tab of its own, in one list shared by the home
 * screen's menu and the Shortcuts section of Profile, so the two never drift.
 */
export const appShortcuts: Shortcut[] = [
  {
    href: '/timer',
    label: 'Unguided timer',
    description: 'Sit for your own length, with bells at the start and end',
    icon: TimerReset,
  },
  {
    href: '/stories',
    label: 'Read-aloud stories',
    description: 'Calm stories, read to you or read yourself',
    icon: BookOpen,
  },
  {
    href: '/favorites',
    label: 'Saved sessions',
    description: 'Everything you’ve saved, in one place',
    icon: Heart,
  },
  {
    href: '/downloads',
    label: 'Downloads',
    description: 'Sessions kept on this phone to play offline',
    icon: ArrowDownToLine,
  },
  {
    href: '/activities',
    label: 'Daily activities',
    description: 'Your streak, minutes and progress over time',
    icon: Flame,
  },
  {
    href: '/reflections',
    label: 'Reflections',
    description: 'Each day’s prompt and what you wrote',
    icon: NotebookPen,
  },
  {
    href: '/circles',
    label: 'Circles',
    description: 'Sit with a small group at the same time each day',
    icon: Users,
  },
  {
    href: '/sleep',
    label: 'Sleep and timers',
    description: 'Wind-downs, sleep sounds and your nights',
    icon: Timer,
  },
  {
    href: '/notifications',
    label: 'Notifications',
    description: 'Reminders and your daily inspiration',
    icon: Bell,
  },
  // Only once the track has passed clinical review and been switched on.
  ...(supportTrackEnabled
    ? [
        {
          href: '/support',
          label: 'Support during cancer',
          description: 'Gentle sessions for treatment days and after',
          icon: HeartHandshake,
        },
      ]
    : []),
];
