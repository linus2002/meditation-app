import { Brain, CloudMoon, HeartPulse, Sparkles, Waves, Wind, type LucideIcon } from 'lucide-react';

import { content, toImage } from '@/content';
import { getMeditationsByCategory } from '@/data/meditations';
import type { Category, DeckCard } from '@/types';

/** Lucide icons a category can use; the Studio offers exactly these names. */
const ICONS: Record<string, LucideIcon> = { Brain, CloudMoon, HeartPulse, Sparkles, Waves, Wind };

/**
 * A mood card opens the Meditations tab on that mood, where sessions are
 * grouped by category, rather than Discover's filtered list. The Studio still
 * stores the older `/discover?category=…` links, so they are mapped here.
 */
export function deckHref(href: string): string {
  const match = /^\/discover\?category=([a-z-]+)$/.exec(href);
  return match ? `/meditations?category=${match[1]}` : href;
}

/** The collection shortcuts on the home screen (Studio → Home shortcuts). */
export const deckCards: DeckCard[] = content.deckCards.map(({ image, ...card }) => ({
  ...card,
  href: deckHref(card.href),
  image: toImage(image),
}));

/**
 * The mood categories (Studio → Categories). The set of slugs is fixed by the app.
 * The session count is worked out from the library rather than taken from the
 * Studio, so it always matches what the Meditation tab shows for the category.
 */
export const categories: Category[] = content.categories.map(({ image, icon, ...category }) => ({
  ...category,
  sessionCount: getMeditationsByCategory(category.slug).length,
  icon: ICONS[icon] ?? Sparkles,
  image: toImage(image),
}));

export function getCategory(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}
