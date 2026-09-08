'use client';

import * as React from 'react';

import { DeckCard } from '@/components/home/deck-card';
import type { DeckCard as DeckCardModel } from '@/types';

/**
 * The overlapping stack of gradient cards below the greeting.
 *
 * The stack is a slot machine rather than a static list: `order` holds the card
 * ids from back to front, and each card animates to whichever slot it currently
 * occupies. Tapping a card behind the front swaps the two — the tapped card
 * slides down into the front position and the card that was there slides back
 * to the slot it vacated.
 */
export function CategoryDeck({ cards }: { cards: DeckCardModel[] }) {
  const [order, setOrder] = React.useState(() => cards.map((card) => card.id));

  const bringToFront = React.useCallback((id: string) => {
    setOrder((previous) => {
      const from = previous.indexOf(id);
      const front = previous.length - 1;
      if (from === -1 || from === front) return previous;

      const next = [...previous];
      next[from] = next[front];
      next[front] = id;
      return next;
    });
  }, []);

  return (
    <section
      aria-label="Collections"
      className="mt-7 px-3.5
        [--deck-h:clamp(112px,36.4vw,142px)]
        [--deck-overlap:clamp(33px,10.8vw,42px)]
        [--deck-step:calc(var(--deck-h)-var(--deck-overlap))]"
    >
      {/* Unpadded so the cards' `inset-x-0` lands on the section's content edge. */}
      <div
        className="relative"
        style={{ height: `calc(var(--deck-h) + ${cards.length - 1} * var(--deck-step))` }}
      >
        {/* Rendered in a fixed DOM order so a reorder is purely a transform. */}
        {cards.map((card) => {
          const slot = order.indexOf(card.id);
          return (
            <DeckCard
              key={card.id}
              card={card}
              slot={slot}
              isFront={slot === order.length - 1}
              onBringToFront={() => bringToFront(card.id)}
            />
          );
        })}
      </div>
    </section>
  );
}
