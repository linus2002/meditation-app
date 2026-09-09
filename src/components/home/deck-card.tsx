'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { DeckCard as DeckCardModel, DeckTone } from '@/types';

const toneBackground: Record<DeckTone, string> = {
  activities: 'bg-deck-activities',
  happiness: 'bg-deck-happiness',
  relaxation: 'bg-deck-relaxation',
};

/** Soft light blooms that sit on top of each gradient in the artwork. */
const toneBloom: Record<DeckTone, string> = {
  activities:
    'radial-gradient(70% 120% at 88% 18%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 62%), radial-gradient(55% 90% at 96% 78%, rgba(4,60,58,0.45) 0%, rgba(4,60,58,0) 70%)',
  happiness:
    'radial-gradient(65% 110% at 78% 22%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0) 60%), radial-gradient(60% 100% at 100% 86%, rgba(214,112,214,0.4) 0%, rgba(214,112,214,0) 72%)',
  relaxation:
    'radial-gradient(60% 100% at 82% 16%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 58%), radial-gradient(62% 105% at 96% 88%, rgba(88,110,224,0.55) 0%, rgba(88,110,224,0) 74%)',
};

interface DeckCardProps {
  card: DeckCardModel;
  /** Position in the stack: 0 is the back of the deck, the highest is the front. */
  slot: number;
  /** The front card is the fully revealed one at the bottom of the stack. */
  isFront: boolean;
  /** Promotes this card to the front slot. Only called for cards behind the front. */
  onBringToFront: () => void;
}

/**
 * One gradient card in the home deck.
 *
 * Cards are absolutely stacked and offset with `translateY`, so a reorder is a
 * transform change the browser can animate — the DOM order never moves.
 *
 * Tapping a card behind the front slides it forward; the front card is the only
 * one that opens its destination, since that is the card you can actually read.
 */
export function DeckCard({ card, slot, isFront, onBringToFront }: DeckCardProps) {
  const surfaceClassName =
    'absolute inset-0 z-10 rounded-card transition-colors duration-200 hover:bg-overlay/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white';

  return (
    <article
      className={cn(
        'absolute inset-x-0 top-0 h-[var(--deck-h)] overflow-hidden rounded-card shadow-deck',
        'transition-transform duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        toneBackground[card.tone],
      )}
      style={{ transform: `translateY(calc(var(--deck-step) * ${slot}))`, zIndex: slot + 1 }}
    >
      <Image
        src={card.image}
        alt=""
        fill
        sizes="(max-width: 430px) 100vw, 430px"
        placeholder="blur"
        className="pointer-events-none select-none object-cover opacity-[0.34] mix-blend-overlay"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ backgroundImage: toneBloom[card.tone] }}
      />

      {/* Keeps the headline readable where the photograph runs light. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.22)_0%,rgba(0,0,0,0)_58%)]"
      />

      {/* Full-card target sits above the artwork but below the overflow menu. */}
      {isFront ? (
        <Link href={card.href} className={surfaceClassName}>
          <span className="sr-only">{`${card.title} — ${card.caption}`}</span>
        </Link>
      ) : (
        <button type="button" onClick={onBringToFront} className={surfaceClassName}>
          <span className="sr-only">{`Bring ${card.title} to the front of the deck`}</span>
        </button>
      )}

      <div className="pointer-events-none relative z-0 px-5 pt-3">
        <h2 className="text-[clamp(21px,6.9vw,27px)] font-normal leading-[1.16] tracking-[-0.015em] text-white drop-shadow-[0_1px_10px_rgba(0,0,0,0.18)]">
          {card.title}
        </h2>
        <p className="mt-0.5 text-[clamp(10.5px,3.1vw,12px)] font-semibold leading-none text-white/95">{card.caption}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`${card.title} options`}
          className="absolute right-2.5 top-3 z-20 flex h-7 w-6 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-overlay/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <MoreVertical className="h-[18px] w-[18px]" strokeWidth={2} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={card.href}>Open</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/discover">Browse sessions</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/favorites">Saved sessions</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  );
}
