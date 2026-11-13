/**
 * Mixes: the reader's own playlists of meditations and stories, played one
 * after another. Pure functions only, so the rules are tested directly; the
 * store lives in `hooks/use-mixes` and the player in `components/mixes`.
 */

export type MixItemKind = 'meditation' | 'story';

export interface MixItem {
  kind: MixItemKind;
  id: string;
}

export interface Mix {
  id: string;
  name: string;
  items: MixItem[];
  createdAt: number;
  updatedAt: number;
}

/** Long enough for an evening; short enough that the list stays usable. */
export const MAX_MIX_ITEMS = 30;
export const MAX_MIX_NAME = 40;

export function sameItem(a: MixItem, b: MixItem): boolean {
  return a.kind === b.kind && a.id === b.id;
}

export function cleanName(name: string, fallback = 'My mix'): string {
  const trimmed = name.replace(/\s+/g, ' ').trim().slice(0, MAX_MIX_NAME);
  return trimmed || fallback;
}

export function createMix(name: string, now: number, id: string, items: MixItem[] = []): Mix {
  return { id, name: cleanName(name), items: items.slice(0, MAX_MIX_ITEMS), createdAt: now, updatedAt: now };
}

/** Adds to the end. A mix holds each session once, so adding again is a no-op. */
export function addItem(mix: Mix, item: MixItem, now: number): Mix {
  if (mix.items.some((existing) => sameItem(existing, item))) return mix;
  if (mix.items.length >= MAX_MIX_ITEMS) return mix;
  return { ...mix, items: [...mix.items, item], updatedAt: now };
}

export function removeItem(mix: Mix, index: number, now: number): Mix {
  if (index < 0 || index >= mix.items.length) return mix;
  return { ...mix, items: mix.items.filter((_, i) => i !== index), updatedAt: now };
}

/** Moves the item at `from` by `delta` places (-1 up, +1 down), clamped. */
export function moveItem(mix: Mix, from: number, delta: number, now: number): Mix {
  const to = Math.min(Math.max(0, from + delta), mix.items.length - 1);
  if (from < 0 || from >= mix.items.length || to === from) return mix;
  const items = [...mix.items];
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  return { ...mix, items, updatedAt: now };
}

/**
 * The order to play a mix in: as listed, or shuffled (Fisher–Yates). `random`
 * is injectable so tests are deterministic.
 */
export function playOrder(length: number, shuffle: boolean, random: () => number = Math.random): number[] {
  const order = Array.from({ length }, (_, i) => i);
  if (!shuffle) return order;
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Where to go after position `at` in the play order: the next one, back to the
 * start when looping, or null when the mix is over.
 */
export function nextPosition(at: number, length: number, loop: boolean): number | null {
  if (length === 0) return null;
  if (at + 1 < length) return at + 1;
  return loop ? 0 : null;
}

/** The previous position, or the first one if already at the start. */
export function previousPosition(at: number, length: number, loop: boolean): number {
  if (at > 0) return at - 1;
  return loop && length > 0 ? length - 1 : 0;
}

/** Reads stored mixes defensively: anything malformed is dropped, not thrown. */
export function parseMixes(raw: string | null): Mix[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.flatMap((value): Mix[] => {
      if (!value || typeof value !== 'object') return [];
      const mix = value as Partial<Mix>;
      if (typeof mix.id !== 'string' || typeof mix.name !== 'string' || !Array.isArray(mix.items)) {
        return [];
      }
      const items = mix.items.filter(
        (item): item is MixItem =>
          !!item &&
          (item.kind === 'meditation' || item.kind === 'story') &&
          typeof item.id === 'string',
      );
      return [
        {
          id: mix.id,
          name: cleanName(mix.name),
          items: items.slice(0, MAX_MIX_ITEMS),
          createdAt: typeof mix.createdAt === 'number' ? mix.createdAt : 0,
          updatedAt: typeof mix.updatedAt === 'number' ? mix.updatedAt : 0,
        },
      ];
    });
  } catch {
    return [];
  }
}
