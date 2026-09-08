import type { SleepNight } from '@/types';

export const sleepWeek: SleepNight[] = [
  { label: 'Mon', hours: 6.4, quality: 0.72, deepSleepHours: 1.4 },
  { label: 'Tue', hours: 7.1, quality: 0.81, deepSleepHours: 1.8 },
  { label: 'Wed', hours: 5.8, quality: 0.61, deepSleepHours: 1.1 },
  { label: 'Thu', hours: 7.6, quality: 0.88, deepSleepHours: 2.2 },
  { label: 'Fri', hours: 6.9, quality: 0.76, deepSleepHours: 1.6 },
  { label: 'Sat', hours: 8.2, quality: 0.93, deepSleepHours: 2.5 },
  { label: 'Sun', hours: 7.4, quality: 0.84, deepSleepHours: 2.0 },
];

export const sleepSummary = {
  averageHours: 7.06,
  averageQuality: 0.79,
  bedtime: '22:48',
  wakeTime: '05:36',
  deepSleepShare: 0.25,
};
