import { Brain, CloudMoon, HeartPulse, Sparkles, Waves, Wind, type LucideIcon } from 'lucide-react';

import { content, toImage } from '@/content';
import type { Category, DeckCard } from '@/types';

/** Lucide icons a category can use; the Studio offers exactly these names. */
const ICONS: Record<string, LucideIcon> = { Brain, CloudMoon, HeartPulse, Sparkles, Waves, Wind };

/** The collection shortcuts on the home screen (Studio → Home shortcuts). */
export const deckCards: DeckCard[] = content.deckCards.map(({ image, ...card }) => ({
  ...card,
  image: toImage(image),
}));

/** The mood categories (Studio → Categories). The set of slugs is fixed by the app. */
export const categories: Category[] = content.categories.map(({ image, icon, ...category }) => ({
  ...category,
  icon: ICONS[icon] ?? Sparkles,
  image: toImage(image),
}));

export function getCategory(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}
