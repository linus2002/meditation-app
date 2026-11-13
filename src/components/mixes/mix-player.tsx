'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ListMusic, Repeat, Shuffle, SkipBack, SkipForward, X } from 'lucide-react';

import { PlayerView } from '@/components/player/player-view';
import { StoryReader } from '@/components/stories/story-reader';
import { getMeditation } from '@/data/meditations';
import { mixItemDetails, type MixItemDetails } from '@/data/mix-items';
import { getStory } from '@/data/stories';
import { useMixes } from '@/hooks/use-mixes';
import { nextPosition, playOrder, previousPosition } from '@/lib/mixes';

const barButton =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-overlay/[0.08] hover:text-ink disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70';

/**
 * Plays a mix: each meditation or story in turn, in the screen it normally
 * plays in, moving on by itself when one finishes. Everything happens on this
 * one page, so the audio unlocked by the "Play mix" tap stays unlocked and
 * each next item can start without another tap.
 */
export function MixPlayer() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get('id') ?? '';
  const shuffle = params.get('shuffle') === '1';
  const loop = params.get('loop') === '1';
  const { ready, getMix } = useMixes();
  const mix = getMix(id);

  // The items as they were when play started; edits elsewhere don't reshuffle mid-play.
  const [items, setItems] = React.useState<MixItemDetails[] | null>(null);
  const [order, setOrder] = React.useState<number[]>([]);
  const [position, setPosition] = React.useState(0);
  // Bumped on every move, so even the same item played again remounts fresh.
  const [turn, setTurn] = React.useState(0);
  const [finished, setFinished] = React.useState(false);

  React.useEffect(() => {
    if (!ready || items) return;
    const list = (mix?.items ?? []).map(mixItemDetails).filter((d): d is MixItemDetails => d !== null);
    setItems(list);
    setOrder(playOrder(list.length, shuffle));
  }, [ready, mix, items, shuffle]);

  const goTo = React.useCallback((next: number) => {
    setPosition(next);
    setTurn((value) => value + 1);
  }, []);

  const advance = React.useCallback(() => {
    if (!items) return;
    const next = nextPosition(position, items.length, loop);
    if (next === null) {
      setFinished(true);
      return;
    }
    // A shuffled mix on repeat is dealt afresh each time round.
    if (next === 0 && shuffle) setOrder(playOrder(items.length, true));
    goTo(next);
  }, [items, position, loop, shuffle, goTo]);

  const back = () => goTo(previousPosition(position, items?.length ?? 0, loop));
  const close = () => router.push(id ? `/mixes?id=${id}` : '/mixes');

  if (!ready || !items) return <div className="min-h-full bg-canvas" aria-hidden="true" />;

  if (!mix || items.length === 0) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-canvas px-8 text-center">
        <ListMusic className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
        <p className="mt-4 text-body-sm text-ink">{mix ? 'This mix is empty.' : 'Mix not found.'}</p>
        <Link href="/mixes" className="mt-3 text-caption font-medium text-ink underline underline-offset-2">
          Back to your mixes
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-canvas px-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-overlay/[0.06]">
          <ListMusic className="h-7 w-7 text-ink" strokeWidth={1.5} />
        </span>
        <h1 className="mt-5 text-[1.375rem] font-semibold text-ink">Mix finished</h1>
        <p className="mt-1.5 text-body-sm text-ink-muted">
          {mix.name} · {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
        <div className="mt-7 flex w-full max-w-[300px] flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (shuffle) setOrder(playOrder(items.length, true));
              setFinished(false);
              goTo(0);
            }}
            className="solid-button h-12 rounded-full text-body-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            Play again
          </button>
          <button
            type="button"
            onClick={close}
            className="h-12 rounded-full border border-overlay/15 text-body-sm font-medium text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            Back to mix
          </button>
        </div>
      </div>
    );
  }

  const current = items[order[position]];
  const upcomingPosition = nextPosition(position, items.length, loop);
  const upcoming = upcomingPosition === null ? null : items[order[upcomingPosition]];
  const mixMode = { autoStart: true, onFinished: advance };
  const key = `${turn}-${current.item.kind}-${current.item.id}`;

  let screen: React.ReactNode = null;
  if (current.item.kind === 'meditation') {
    const meditation = getMeditation(current.item.id);
    if (meditation) screen = <PlayerView key={key} meditation={meditation} mix={mixMode} />;
  } else {
    const story = getStory(current.item.id);
    if (story) screen = <StoryReader key={key} story={story} mix={mixMode} />;
  }

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <div className="flex-1">{screen}</div>

      <div className="sticky bottom-0 z-20 border-t border-overlay/10 bg-canvas/95 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-2.5 backdrop-blur-md">
        <div className="flex items-center gap-1">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-overlay/[0.06]">
            <ListMusic className="h-[18px] w-[18px] text-ink-soft" strokeWidth={1.7} />
          </span>
          <div className="min-w-0 flex-1 px-1.5">
            <p className="flex items-center gap-1.5 truncate text-label font-medium text-ink">
              <span className="truncate">{mix.name}</span>
              <span className="shrink-0 tabular-nums text-ink-muted">
                {position + 1}/{items.length}
              </span>
              {shuffle ? <Shuffle className="h-3 w-3 shrink-0 text-ink-muted" aria-label="Shuffled" /> : null}
              {loop ? <Repeat className="h-3 w-3 shrink-0 text-ink-muted" aria-label="On repeat" /> : null}
            </p>
            <p className="mt-0.5 truncate text-label text-ink-muted">
              {upcoming ? `Next: ${upcoming.title}` : 'Last in the mix'}
            </p>
          </div>
          <button
            type="button"
            onClick={back}
            disabled={position === 0 && !loop}
            aria-label="Previous in mix"
            className={barButton}
          >
            <SkipBack className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
          <button type="button" onClick={advance} aria-label="Next in mix" className={barButton}>
            <SkipForward className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
          <button type="button" onClick={close} aria-label="Stop the mix" className={barButton}>
            <X className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  );
}
