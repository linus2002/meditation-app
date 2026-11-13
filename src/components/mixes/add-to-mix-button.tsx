'use client';

import * as React from 'react';
import Link from 'next/link';
import { Check, ListPlus, Plus } from 'lucide-react';

import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useMixes } from '@/hooks/use-mixes';
import { MAX_MIX_ITEMS, MAX_MIX_NAME, sameItem, type MixItem } from '@/lib/mixes';
import { cn } from '@/lib/utils';

/**
 * "Add to mix" for a meditation or story: opens a sheet listing the reader's
 * mixes. Tapping a mix adds this item (or takes it out, if it's already
 * there), and a new mix can be started with it in one step.
 */
export function AddToMixButton({
  item,
  title,
  className,
}: {
  item: MixItem;
  title: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const { mixes, create, addItem, removeItem } = useMixes();
  const [name, setName] = React.useState('');
  const inAny = mixes.some((mix) => mix.items.some((existing) => sameItem(existing, item)));

  const toggleIn = (mixId: string) => {
    const mix = mixes.find((m) => m.id === mixId);
    if (!mix) return;
    const index = mix.items.findIndex((existing) => sameItem(existing, item));
    if (index >= 0) removeItem(mixId, index);
    else addItem(mixId, item);
  };

  const createWithItem = (event: React.FormEvent) => {
    event.preventDefault();
    create(name || 'My mix', [item]);
    setName('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Add ${title} to a mix`}
        aria-haspopup="dialog"
        className={cn(
          'tap-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
          className,
        )}
      >
        {inAny ? (
          <Check className="h-[18px] w-[18px]" strokeWidth={2} />
        ) : (
          <ListPlus className="h-[18px] w-[18px]" strokeWidth={1.8} />
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[85dvh] max-w-[430px] overflow-y-auto border-none bg-canvas px-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-3 text-ink"
        >
          <div aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-overlay/30" />
          <SheetTitle className="mt-5 text-[1.25rem] font-semibold leading-tight">Add to mix</SheetTitle>
          <SheetDescription className="mt-1 text-caption leading-relaxed text-ink-muted">
            {title} · tap a mix to add or remove it.
          </SheetDescription>

          {mixes.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {mixes.map((mix) => {
                const inMix = mix.items.some((existing) => sameItem(existing, item));
                const full = !inMix && mix.items.length >= MAX_MIX_ITEMS;
                return (
                  <li key={mix.id}>
                    <button
                      type="button"
                      onClick={() => toggleIn(mix.id)}
                      disabled={full}
                      aria-pressed={inMix}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 text-left transition-colors hover:bg-overlay/[0.08] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-body-sm font-medium text-ink">{mix.name}</span>
                        <span className="mt-0.5 block text-label text-ink-muted">
                          {full ? 'Full' : `${mix.items.length} ${mix.items.length === 1 ? 'item' : 'items'}`}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                          inMix ? 'bg-aurora-blue text-white' : 'border border-overlay/20 text-ink-muted',
                        )}
                      >
                        {inMix ? <Check className="h-4 w-4" strokeWidth={2.2} /> : <Plus className="h-4 w-4" strokeWidth={2} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <form onSubmit={createWithItem} className="mt-4 flex items-center gap-2">
            <label htmlFor="new-mix-name" className="sr-only">
              New mix name
            </label>
            <input
              id="new-mix-name"
              value={name}
              maxLength={MAX_MIX_NAME}
              onChange={(event) => setName(event.target.value)}
              placeholder={mixes.length > 0 ? 'Or start a new mix…' : 'Name your first mix'}
              className="h-11 min-w-0 flex-1 rounded-2xl bg-surface px-4 text-body-sm text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            />
            <button
              type="submit"
              className="solid-button h-11 shrink-0 rounded-full px-4 text-caption font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              Create
            </button>
          </form>

          <Link
            href="/mixes"
            onClick={() => setOpen(false)}
            className="mt-4 block text-center text-caption font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            See all your mixes
          </Link>
        </SheetContent>
      </Sheet>
    </>
  );
}
