"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  ListMusic,
  Play,
  Plus,
  Repeat,
  Search,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";

import { ScreenHeader } from "@/components/layout/screen-header";
import { useUndo } from "@/components/layout/undo-toast";
import { SkeletonList } from "@/components/shared/skeleton";
import {
  mixCatalogue,
  mixItemDetails,
  type MixItemDetails,
} from "@/data/mix-items";
import { useMixes } from "@/hooks/use-mixes";
import { formatMinutesLabel } from "@/lib/format";
import {
  MAX_MIX_ITEMS,
  MAX_MIX_NAME,
  sameItem,
  type Mix,
  type MixItemKind,
} from "@/lib/mixes";
import { cn } from "@/lib/utils";
import { useAudio } from "@/providers/audio-provider";

const iconButton =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70";

function details(mix: Mix): MixItemDetails[] {
  return mix.items
    .map(mixItemDetails)
    .filter((d): d is MixItemDetails => d !== null);
}

function totalLabel(items: MixItemDetails[]): string {
  const seconds = items.reduce((sum, item) => sum + item.seconds, 0);
  const count = `${items.length} ${items.length === 1 ? "item" : "items"}`;
  return items.length > 0 ? `${count} · ${formatMinutesLabel(seconds)}` : count;
}

/** /mixes lists the reader's mixes; /mixes?id=… opens one to edit and play. */
export function MixesView() {
  const id = useSearchParams().get("id");
  return id ? <MixDetail id={id} /> : <MixList />;
}

function MixList() {
  const router = useRouter();
  const { mixes, ready, create } = useMixes();
  const [name, setName] = React.useState("");

  const createMix = (event: React.FormEvent) => {
    event.preventDefault();
    const mix = create(name || `Mix ${mixes.length + 1}`);
    setName("");
    router.push(`/mixes?id=${mix.id}`);
  };

  return (
    <div className="pb-6">
      <ScreenHeader
        eyebrow="Meditations and stories, back to back"
        title="Your mixes"
      />

      <form onSubmit={createMix} className="mt-6 flex items-center gap-2 px-5">
        <label htmlFor="mix-name" className="sr-only">
          New mix name
        </label>
        <input
          id="mix-name"
          value={name}
          maxLength={MAX_MIX_NAME}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name a new mix, e.g. Night wind-down"
          className="h-11 min-w-0 flex-1 rounded-2xl bg-surface px-4 text-body-sm text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        />
        <button
          type="submit"
          className="solid-button flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-caption font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Create
        </button>
      </form>

      <div className="mt-6 px-5">
        {!ready ? (
          <SkeletonList count={2} />
        ) : mixes.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-overlay/[0.06]">
              <ListMusic className="h-6 w-6 text-ink-muted" strokeWidth={1.5} />
            </span>
            <p className="mt-4 text-[0.9375rem] font-medium text-ink">
              No mixes yet
            </p>
            <p className="mt-1.5 max-w-[270px] text-caption leading-relaxed text-ink-muted">
              Put meditations and stories together and they’ll play one after
              another — shuffled or on repeat if you like.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {mixes.map((mix) => {
              const items = details(mix);
              return (
                <li key={mix.id}>
                  <Link
                    href={`/mixes?id=${mix.id}`}
                    className="flex items-center gap-3 rounded-2xl bg-surface p-3 transition-colors hover:bg-overlay/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                  >
                    <MixArtwork items={items} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm font-medium text-ink">
                        {mix.name}
                      </span>
                      <span className="mt-0.5 block text-label text-ink-muted">
                        {totalLabel(items)}
                      </span>
                    </span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-ink-faint"
                      strokeWidth={1.8}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Up to four covers in a square, like a playlist's artwork. */
function MixArtwork({
  items,
  size = "h-14 w-14",
}: {
  items: MixItemDetails[];
  size?: string;
}) {
  const covers = items.slice(0, 4);
  if (covers.length === 0) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-overlay/[0.06]",
          size,
        )}
      >
        <ListMusic className="h-5 w-5 text-ink-muted" strokeWidth={1.6} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "grid shrink-0 overflow-hidden rounded-xl",
        size,
        covers.length > 1 && "grid-cols-2",
        covers.length > 2 && "grid-rows-2",
      )}
    >
      {covers.map((item) => (
        <span key={`${item.item.kind}-${item.item.id}`} className="relative">
          <Image
            src={item.image}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
          />
        </span>
      ))}
    </span>
  );
}

function MixDetail({ id }: { id: string }) {
  const router = useRouter();
  const offerUndo = useUndo();
  const { prime } = useAudio();
  const { ready, getMix, rename, remove, restore, removeItem, moveItem } =
    useMixes();
  const mix = getMix(id);
  const [shuffle, setShuffle] = React.useState(false);
  const [loop, setLoop] = React.useState(false);
  const [adding, setAdding] = React.useState(false);

  if (!ready) {
    return (
      <div className="px-5 pt-24">
        <SkeletonList count={3} />
      </div>
    );
  }

  if (!mix) {
    return (
      <div className="pb-6">
        <ScreenHeader title="Mix not found" />
        <p className="mt-6 px-5 text-center text-body-sm text-ink-muted">
          This mix may have been deleted.{" "}
          <Link
            href="/mixes"
            className="font-medium text-ink underline underline-offset-2"
          >
            See your mixes
          </Link>
        </p>
      </div>
    );
  }

  const items = details(mix);

  const play = () => {
    // Unlock audio inside this tap, so the first item can start by itself.
    void prime();
    const query = new URLSearchParams({ id: mix.id });
    if (shuffle) query.set("shuffle", "1");
    if (loop) query.set("loop", "1");
    router.push(`/mix-play?${query.toString()}`);
  };

  const deleteMix = () => {
    const kept = mix;
    remove(mix.id);
    router.replace("/mixes");
    offerUndo({ message: `${kept.name} deleted`, undo: () => restore(kept) });
  };

  return (
    <div className="pb-6">
      <ScreenHeader
        eyebrow={totalLabel(items)}
        title="Mix"
        action={
          <button
            type="button"
            onClick={deleteMix}
            aria-label={`Delete ${mix.name}`}
            className={cn(iconButton, "-mt-1.5")}
          >
            <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </button>
        }
      />

      <div className="mt-5 flex items-center gap-4 px-5">
        <MixArtwork items={items} size="h-20 w-20" />
        <div className="min-w-0 flex-1">
          <label htmlFor="mix-title" className="sr-only">
            Mix name
          </label>
          <input
            id="mix-title"
            key={mix.name}
            defaultValue={mix.name}
            maxLength={MAX_MIX_NAME}
            onBlur={(event) => rename(mix.id, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="w-full rounded-lg bg-transparent text-[1.25rem] font-semibold leading-tight text-ink focus-visible:bg-surface focus-visible:px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          />
          <p className="mt-1 text-label text-ink-muted">
            Tap the name to rename it
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 px-5">
        <button
          type="button"
          onClick={play}
          disabled={items.length === 0}
          className="solid-button flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-body-sm font-medium transition-transform active:scale-[0.99] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <Play className="h-4 w-4 fill-current" />
          Play mix
        </button>
        <ToggleIcon
          on={shuffle}
          onToggle={() => setShuffle((v) => !v)}
          label="Shuffle"
        >
          <Shuffle className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </ToggleIcon>
        <ToggleIcon
          on={loop}
          onToggle={() => setLoop((v) => !v)}
          label="Loop mix"
        >
          <Repeat className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </ToggleIcon>
      </div>

      <section className="mt-7 px-5">
        <div className="flex items-center justify-between">
          <h2 className="text-body-sm font-semibold text-ink">In this mix</h2>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            aria-expanded={adding}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-caption font-medium text-ink-soft transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {adding ? "Done adding" : "Add sessions"}
          </button>
        </div>

        {adding ? <Picker mix={mix} /> : null}

        {items.length === 0 && !adding ? (
          <p className="mt-4 rounded-2xl bg-surface px-4 py-5 text-center text-caption leading-relaxed text-ink-muted">
            Nothing here yet. Tap{" "}
            <span className="font-medium text-ink">Add sessions</span>, or use
            the <span className="font-medium text-ink">add to mix</span> button
            on any meditation or story.
          </p>
        ) : null}

        <ol className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li
              key={`${item.item.kind}-${item.item.id}`}
              className="flex items-center gap-2 rounded-2xl bg-surface p-2 pl-2.5"
            >
              <span className="w-4 shrink-0 text-center text-label tabular-nums text-ink-faint">
                {index + 1}
              </span>
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </span>
              <span className="min-w-0 flex-1 pl-1">
                <span className="block truncate text-body-sm font-medium text-ink">
                  {item.title}
                </span>
                <span className="mt-0.5 block truncate text-label text-ink-muted">
                  {item.item.kind === "story" ? "Story" : "Meditation"} ·{" "}
                  {formatMinutesLabel(item.seconds)}
                </span>
              </span>
              <span className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => moveItem(mix.id, index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${item.title} up`}
                  className={iconButton}
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(mix.id, index, 1)}
                  disabled={index === items.length - 1}
                  aria-label={`Move ${item.title} down`}
                  className={iconButton}
                >
                  <ArrowDown className="h-4 w-4" strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    removeItem(
                      mix.id,
                      mix.items.findIndex((it) => sameItem(it, item.item)),
                    )
                  }
                  aria-label={`Remove ${item.title} from the mix`}
                  className={iconButton}
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function ToggleIcon({
  on,
  onToggle,
  label,
  children,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70",
        on
          ? "bg-aurora-blue text-white"
          : "border border-overlay/15 text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Meditations and stories to add, with a search box. */
function Picker({ mix }: { mix: Mix }) {
  const { addItem, removeItem } = useMixes();
  const [kind, setKind] = React.useState<MixItemKind>("meditation");
  const [query, setQuery] = React.useState("");
  const catalogue = React.useMemo(() => mixCatalogue(kind), [kind]);
  const q = query.trim().toLowerCase();
  const shown = q
    ? catalogue.filter((item) =>
        `${item.title} ${item.label}`.toLowerCase().includes(q),
      )
    : catalogue;
  const full = mix.items.length >= MAX_MIX_ITEMS;

  return (
    <div className="mt-3 rounded-2xl border border-overlay/10 p-3">
      <div role="tablist" aria-label="What to add" className="flex gap-2">
        {(["meditation", "story"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={kind === value}
            onClick={() => setKind(value)}
            className={cn(
              "rounded-full px-3.5 py-2 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70",
              kind === value
                ? "bg-aurora-blue text-white"
                : "bg-overlay/[0.06] text-ink-muted hover:text-ink",
            )}
          >
            {value === "meditation" ? "Meditations" : "Stories"}
          </button>
        ))}
      </div>

      <label className="mt-3 flex h-10 items-center gap-2 rounded-xl bg-surface px-3">
        <Search
          className="h-4 w-4 text-ink-faint"
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <span className="sr-only">
          Search {kind === "meditation" ? "meditations" : "stories"}
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            kind === "meditation" ? "Search meditations" : "Search stories"
          }
          className="min-w-0 flex-1 bg-transparent text-body-sm text-ink placeholder:text-ink-faint focus-visible:outline-none"
        />
      </label>

      {full ? (
        <p className="mt-2 text-label text-ink-muted">
          This mix is full ({MAX_MIX_ITEMS} items).
        </p>
      ) : null}

      <ul className="mt-2 max-h-[340px] space-y-1 overflow-y-auto">
        {shown.map((item) => {
          const index = mix.items.findIndex((it) => sameItem(it, item.item));
          const inMix = index >= 0;
          return (
            <li key={item.item.id}>
              <button
                type="button"
                onClick={() =>
                  inMix ? removeItem(mix.id, index) : addItem(mix.id, item.item)
                }
                disabled={!inMix && full}
                aria-pressed={inMix}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-overlay/[0.06] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
              >
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm text-ink">
                    {item.title}
                  </span>
                  <span className="block truncate text-label text-ink-muted">
                    {item.label} · {formatMinutesLabel(item.seconds)}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    inMix
                      ? "bg-aurora-blue text-white"
                      : "border border-overlay/20 text-ink-muted",
                  )}
                  aria-hidden="true"
                >
                  {inMix ? (
                    <Check className="h-4 w-4" strokeWidth={2.2} />
                  ) : (
                    <Plus className="h-4 w-4" strokeWidth={2} />
                  )}
                </span>
                <span className="sr-only">
                  {inMix ? "In the mix, tap to remove" : "Tap to add"}
                </span>
              </button>
            </li>
          );
        })}
        {shown.length === 0 ? (
          <li className="px-2 py-4 text-center text-caption text-ink-muted">
            Nothing matches “{query}”.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
