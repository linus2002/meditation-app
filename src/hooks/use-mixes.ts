'use client';

import * as React from 'react';

import {
  addItem as addToMix,
  cleanName,
  createMix,
  moveItem as moveInMix,
  parseMixes,
  removeItem as removeFromMix,
  type Mix,
  type MixItem,
} from '@/lib/mixes';

/**
 * The reader's mixes, kept on this device. One shared store, so every screen
 * that shows a mix (the list, the editor, the "Add to mix" sheet) updates
 * together the moment one of them changes it.
 */

const STORAGE_KEY = 'serenity.mixes.v1';
const EMPTY: Mix[] = [];

let cache: Mix[] | null = null;
const listeners = new Set<() => void>();

function load(): Mix[] {
  if (cache) return cache;
  try {
    cache = parseMixes(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    cache = [];
  }
  return cache;
}

function save(next: Mix[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Kept for this visit even if storage is blocked.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed them.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function update(id: string, change: (mix: Mix, now: number) => Mix) {
  const now = Date.now();
  save(load().map((mix) => (mix.id === id ? change(mix, now) : mix)));
}

function newId(): string {
  return `mix-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface MixesApi {
  mixes: Mix[];
  /** False until read from storage, so screens can avoid flashing "no mixes". */
  ready: boolean;
  getMix: (id: string) => Mix | undefined;
  create: (name: string, items?: MixItem[]) => Mix;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  restore: (mix: Mix) => void;
  addItem: (id: string, item: MixItem) => void;
  removeItem: (id: string, index: number) => void;
  moveItem: (id: string, index: number, delta: number) => void;
}

export function useMixes(): MixesApi {
  const mixes = React.useSyncExternalStore(subscribe, load, () => EMPTY);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => setReady(true), []);

  return React.useMemo<MixesApi>(
    () => ({
      mixes,
      ready,
      getMix: (id) => mixes.find((mix) => mix.id === id),
      create: (name, items = []) => {
        const mix = createMix(name, Date.now(), newId(), items);
        save([mix, ...load()]);
        return mix;
      },
      rename: (id, name) => update(id, (mix, now) => ({ ...mix, name: cleanName(name, mix.name), updatedAt: now })),
      remove: (id) => save(load().filter((mix) => mix.id !== id)),
      restore: (mix) => save([mix, ...load().filter((existing) => existing.id !== mix.id)]),
      addItem: (id, item) => update(id, (mix, now) => addToMix(mix, item, now)),
      removeItem: (id, index) => update(id, (mix, now) => removeFromMix(mix, index, now)),
      moveItem: (id, index, delta) => update(id, (mix, now) => moveInMix(mix, index, delta, now)),
    }),
    [mixes, ready],
  );
}
