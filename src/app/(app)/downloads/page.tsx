'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CloudOff, Loader2, Smartphone, Trash2 } from 'lucide-react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { useUndo } from '@/components/layout/undo-toast';
import { GradientButton } from '@/components/shared/gradient-button';
import { SectionTitle } from '@/components/shared/section-title';
import { SkeletonList } from '@/components/shared/skeleton';
import { useDownloads } from '@/hooks/use-downloads';
import { getMeditation } from '@/data/meditations';
import { formatBytes } from '@/lib/offline-downloads';

export default function DownloadsPage() {
  const { support, loaded, sessions, totalLabel, error, isBusy, remove } = useDownloads();
  const offerUndo = useUndo();

  // An offline copy may be the only way to play in a hospital with no signal,
  // and cannot be fetched back without one. So the row goes at once, but the
  // copy itself is only deleted once the chance to undo has passed.
  const [leaving, setLeaving] = React.useState<string[]>([]);
  const removeCopy = (id: string, title: string) => {
    setLeaving((current) => [...current, id]);
    offerUndo({
      message: `${title} removed from this device`,
      undo: () => setLeaving((current) => current.filter((entry) => entry !== id)),
      commit: () => void remove(id),
    });
  };

  const saved = sessions
    .filter((entry) => !leaving.includes(entry.id))
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
         * The native case: the app ships its pages, code and soundscapes, but
         * session recordings stream from Sanity and there is no worker here to
         * save them, so it says so rather than promise offline play.
         */}
        {support === 'bundled' ? (
          <EmptyState
            icon={<Smartphone className="h-6 w-6 text-ink-muted" strokeWidth={1.5} />}
            title="Built into the app"
            body="Session screens, the timer and the soundscapes work without a connection. Recorded sessions stream, so they need one; saving them for offline isn’t available in the app yet."
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
                    <p className="truncate text-body-sm font-semibold leading-tight text-ink">
                      {meditation.title}
                    </p>
                  </Link>
                  <p className="mt-0.5 truncate text-label leading-tight text-ink-muted">
                    {meditation.subtitle}
                  </p>
                  <p className="mt-1 text-label leading-none text-ink-faint">
                    Ready offline · {formatBytes(entry.bytes)}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isBusy(entry.id)}
                  onClick={() => removeCopy(entry.id, meditation.title)}
                  aria-label={`Remove the offline copy of ${meditation.title}`}
                  className="relative z-10 tap-target flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
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
              <GradientButton asChild className="mt-6 h-11 px-7 text-body-sm">
                <Link href="/meditations">Browse sessions</Link>
              </GradientButton>
            }
          />
        )}

        {error ? (
          <p className="mt-4 rounded-tile bg-surface px-4 py-3 text-label leading-relaxed text-ink-muted">
            {error}
          </p>
        ) : null}
      </div>

      {support === 'bundled' ? (
        <div className="mt-7 px-5">
          <SectionTitle>How offline works</SectionTitle>
          <p className="mt-3 rounded-tile bg-surface px-4 py-3.5 text-caption leading-relaxed text-ink-muted">
            Session screens and code are built into the app, and the soundscapes are made on your
            device as they play, so those work anywhere. Recorded sessions stream from the internet
            and need a connection.
          </p>
          <p className="mt-2.5 px-1 text-label leading-relaxed text-ink-faint">
            To keep the app size small, artwork streams the first time you open a session and is
            kept on your device. Opened with no connection before that, it shows a soft blur
            preview instead.
          </p>
        </div>
      ) : support === 'available' ? (
        <div className="mt-7 px-5">
          <SectionTitle>What a download holds</SectionTitle>
          <p className="mt-3 rounded-tile bg-surface px-4 py-3.5 text-caption leading-relaxed text-ink-muted">
            A download saves the session’s recording, its screen and its artwork, so it plays on a
            plane, on the underground, or anywhere with nothing to connect to. The soundscapes
            underneath are made on your device and need nothing.
          </p>
          <p className="mt-2.5 px-1 text-label leading-relaxed text-ink-faint">
            Most of a download is its recording, a few megabytes each. Downloads survive app
            updates, and stay until you remove them.
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
      <p className="mt-4 text-[0.9375rem] font-medium text-ink">{title}</p>
      <p className="mt-1.5 max-w-[260px] text-caption leading-relaxed text-ink-muted">{body}</p>
      {action}
    </div>
  );
}
