import { Brain, CloudMoon, HeartPulse, Sparkles, Waves, Wind } from 'lucide-react';
import { photos } from '@/data/images';
import type { Category, DeckCard } from '@/types';

/** The three overlapping gradient cards at the top of the home screen. */
export const deckCards: DeckCard[] = [
  {
    id: 'daily-activities',
    title: 'Daily Activities',
    caption: 'Watch your progress',
    tone: 'activities',
    href: '/activities',
    image: photos.morningField,
  },
  {
    id: 'happiness',
    title: 'Happiness',
    caption: 'Watch Complete sessions',
    tone: 'happiness',
    href: '/discover?category=happiness',
    image: photos.openArms,
  },
  {
    id: 'relaxation',
    title: 'Relaxation',
    caption: 'Watch Complete sessions',
    tone: 'relaxation',
    href: '/discover?category=relaxation',
    image: photos.aerialSea,
  },
];

export const categories: Category[] = [
  { slug: 'focus', name: 'Focus', sessionCount: 14, icon: Brain, tone: 'activities' , image: photos.forestLight },
  { slug: 'sleep', name: 'Sleep', sessionCount: 11, icon: CloudMoon, tone: 'relaxation' , image: photos.milkyWay },
  { slug: 'anxiety', name: 'Anxiety', sessionCount: 9, icon: HeartPulse, tone: 'happiness' , image: photos.duskRidge },
  { slug: 'happiness', name: 'Happiness', sessionCount: 12, icon: Sparkles, tone: 'happiness' , image: photos.palmDusk },
  { slug: 'relaxation', name: 'Relaxation', sessionCount: 16, icon: Waves, tone: 'relaxation' , image: photos.aerialSea },
  { slug: 'breathing', name: 'Breathing', sessionCount: 8, icon: Wind, tone: 'activities' , image: photos.mountainValley },
];

export function getCategory(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}
