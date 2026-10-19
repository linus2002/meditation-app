import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import type { DeckCard } from '@/types';

/**
 * The row of collection tiles below the greeting.
 *
 * Each tile is a plain outlined card on the canvas — title at the top, a small
 * arrow in the corner — rather than artwork, so the home screen opens quietly.
 * The row swipes sideways: tiles start on the page gutter, in line with the
 * search bar, and are sized so two fit with the next one peeking in, which is
 * what tells you the row scrolls.
 */
export function CategoryDeck({ cards }: { cards: DeckCard[] }) {
  return (
    <section aria-label="Collections" className="mt-6">
      <div className="rail flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className="flex aspect-[1.05] w-[48vw] max-w-[200px] shrink-0 snap-start flex-col justify-between rounded-[22px] border border-overlay/25 p-4 transition-colors duration-150 hover:border-overlay/45 hover:bg-overlay/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            <div>
              <h2 className="text-[clamp(1rem,4.6vw,1.125rem)] font-semibold leading-[1.2] text-ink">
                {card.title}
              </h2>
              <p className="mt-1 text-[0.8125rem] leading-snug text-ink-muted">{card.caption}</p>
            </div>
            <ArrowUpRight aria-hidden="true" className="h-5 w-5 self-end text-ink" strokeWidth={1.8} />
          </Link>
        ))}
      </div>
    </section>
  );
}
