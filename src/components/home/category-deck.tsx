import { DeckCard } from '@/components/home/deck-card';
import type { DeckCard as DeckCardModel } from '@/types';

/** The overlapping stack of gradient cards below the greeting. */
export function CategoryDeck({ cards }: { cards: DeckCardModel[] }) {
  return (
    <section aria-label="Collections" className="mt-7 flex flex-col px-3.5">
      {cards.map((card, index) => (
        <DeckCard key={card.id} card={card} index={index} />
      ))}
    </section>
  );
}
