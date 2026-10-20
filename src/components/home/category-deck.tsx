import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import type { DeckCard } from '@/types';

/**
 * The collection shortcuts on the home screen.
 *
 * Each is a plain outlined button on the canvas — title and caption on the
 * left, a small arrow on the right — rather than artwork, so the screen stays
 * quiet. They are laid out landscape and stacked like a menu, so all three are
 * in view at once and nothing has to be swiped to be found.
 */
export function CategoryDeck({ cards }: { cards: DeckCard[] }) {
  return (
    <section aria-label="Collections" className="mt-6 px-5">
      <ul className="space-y-2">
        {cards.map((card) => (
          <li key={card.id}>
            <Link
              href={card.href}
              className="flex items-center justify-between gap-3 rounded-[18px] border border-overlay/25 px-4 py-2.5 transition-colors duration-150 hover:border-overlay/45 hover:bg-overlay/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              <div className="min-w-0">
                <h2 className="text-[0.9375rem] font-semibold leading-[1.2] text-ink">
                  {card.title}
                </h2>
                <p className="mt-0.5 truncate text-caption leading-snug text-ink-muted">
                  {card.caption}
                </p>
              </div>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink" strokeWidth={1.8} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
