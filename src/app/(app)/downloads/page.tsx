'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CloudOff, Loader2, Smartphone, Trash2 } from 'lucide-react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { GradientButton } from '@/components/shared/gradient-button';
import { SectionTitle } from '@/components/shared/section-title';
import { SkeletonList } from '@/components/shared/skeleton';
import { useDownloads } from '@/hooks/use-downloads';
import { getMeditation } from '@/data/meditations';
import { formatBytes } from '@/lib/offline-downloads';

export default function DownloadsPage() {
  const { support, loaded, sessions, totalLabel, error, isBusy, remove } = useDownloads();

  const saved = sessions
    .map((entry) => ({ entry, meditation: getMeditation(entry.id) }))
    .filter((row): row is { entry: typeof row.entry; meditation: NonNullable<typeof row.meditation> } =>
      Boolean(row.meditation),
    )
    .sort((a, b) => b.entry.savedAt - a.entry.savedAt);

  const eyebrow =
    support === 'available' && saved.length > 0
      ? `${saved.length} ${saved.length === 1 ? 'session' : 'sessions'} · ${totalLabel}`
      : 'On this device';

  return (
    <div className="pb-4">
      <ScreenHeader eyebrow={eyebrow} title="Downloads" />

      <div className="mt-6 px-5">
        {/*
         * The native case needs no list at all: the app already carries every
         * file it will ever need, so there is nothing to save and nothing that
         * could go missing on a flight.
         */}
        {support === 'bundled' ? (
          <EmptyState
            icon={<Smartphone className="h-6 w-6 text-ink-muted" strokeWidth={1.5} />}
            title="Already on your device"
            body="You installed Serenity as an app, so every session is stored locally. Nothing here needs downloading."
          />
        ) : support === 'unavailable' ? (
          <EmptyState
            icon={<CloudOff className="h-6 w-6 text-ink-muted" strokeWidth={1.5} />}
            title="Not available here"
            body="This browser cannot store sessions for offline use. Adding Serenity to your home screen usually enables it."
          />
        ) : !loaded ? (
          <SkeletonList count={2} />
        ) : saved.length > 0 ? (
          <ul className="space-y-2.5">
            {saved.map(({ entry, meditation }) => (
              <li
                key={entry.id}
                className="relative flex items-center gap-3.5 rounded-tile bg-surface p-3"
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                  <Image
                    src={meditation.image}
                    alt=""
                    fill
                    sizes="56px"
                    placeholder="blur"
                    className="object-cover"
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/player/${meditation.id}`}
                    className="static before:absolute before:inset-0 before:rounded-tile before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                  >
                    <p className="truncate text-[14px] font-semibold leading-tight text-ink">
                      {meditation.title}
                    </p>
                  </Link>
                  <p className="mt-0.5 truncate text-[11.5px] leading-tight text-ink-muted">
                    {meditation.subtitle}
                  </p>
                  <p className="mt-1 text-[11px] leading-none text-ink-faint">
                    Ready offline · {formatBytes(entry.bytes)}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isBusy(entry.id)}
                  onClick={() => void remove(entry.id)}
                  aria-label={`Remove the offline copy of ${meditation.title}`}
                  className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                >
                  {isBusy(entry.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                  ) : (
                    <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<CloudOff className="h-6 w-6 text-ink-muted" strokeWidth={1.5} />}
            title="Nothing downloaded yet"
            body="Open a session and tap the download arrow. It will then open with no connection at all."
            action={
              <GradientButton asChild className="mt-6 h-11 px-7 text-[13px]">
                <Link href="/meditations">Browse sessions</Link>
              </GradientButton>
            }
          />
        )}

        {error ? (
          <p className="mt-4 rounded-tile bg-surface px-4 py-3 text-[11.5px] leading-relaxed text-ink-muted">
            {error}
          </p>
        ) : null}
      </div>

      {support === 'available' ? (
        <div className="mt-7 px-5">
          <SectionTitle>What a download holds</SectionTitle>
          {/*
           * Said plainly, because "download" usually means an audio file and
           * here it does not. Every sound in Serenity is generated on the
           * device as it plays, so the sound was never the part at risk.
           */}
          <p className="mt-3 rounded-tile bg-surface px-4 py-3.5 text-[12px] leading-relaxed text-ink-muted">
            Serenity makes every sound on your device as it plays, so the audio needs no
            downloading and already works with no signal. A download saves the parts that do come
            over the network — the session screen and its artwork — so the whole thing opens on a
            plane, on the underground, or anywhere with nothing to connect to.
          </p>
          <p className="mt-2.5 px-1 text-[11.5px] leading-relaxed text-ink-faint">
            Sessions share most of what they need, so the first download is the expensive one and
            each session after it costs far less than its own size suggests. Downloads survive
            app updates, and stay until you remove them.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-overlay/[0.06]">
        {icon}
      </span>
      <p className="mt-4 text-[15px] font-medium text-ink">{title}</p>
      <p className="mt-1.5 max-w-[260px] text-[12.5px] leading-relaxed text-ink-muted">{body}</p>
      {action}
    </div>
  );
}
