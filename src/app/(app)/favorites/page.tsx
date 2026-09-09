'use client';

import Link from 'next/link';
import { HeartOff } from 'lucide-react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { GradientButton } from '@/components/shared/gradient-button';
import { MeditationCard } from '@/components/shared/meditation-card';
import { SectionTitle } from '@/components/shared/section-title';
import { getMeditation, meditations } from '@/data/meditations';
import { useApp } from '@/providers/app-provider';

export default function FavoritesPage() {
  const { favorites, recents, hydrated } = useApp();

  const saved = favorites
    .map((id) => getMeditation(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const recent = recents
    .map((id) => getMeditation(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="pb-4">
      <ScreenHeader eyebrow={`${saved.length} sessions`} title="Saved" />

      <div className="mt-6 px-5">
        {!hydrated ? (
          <ul className="space-y-2.5" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <li key={index} className="h-[80px] animate-pulse rounded-tile bg-overlay/[0.05]" />
            ))}
          </ul>
        ) : saved.length > 0 ? (
          <ul className="space-y-2.5">
            {saved.map((meditation) => (
              <MeditationCard key={meditation.id} meditation={meditation} />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-overlay/[0.06]">
              <HeartOff className="h-6 w-6 text-ink-muted" strokeWidth={1.5} />
            </span>
            <p className="mt-4 text-[15px] font-medium text-ink">Nothing saved yet</p>
            <p className="mt-1.5 max-w-[250px] text-[12.5px] leading-relaxed text-ink-muted">
              Tap the heart on any session and it will wait for you here.
            </p>
            <GradientButton asChild className="mt-6 h-11 px-7 text-[13px]">
              <Link href="/discover">Browse sessions</Link>
            </GradientButton>
          </div>
        )}
      </div>

      {recent.length > 0 ? (
        <div className="mt-7 px-5">
          <SectionTitle>Recently Played</SectionTitle>
          <ul className="mt-3 space-y-2.5">
            {recent.map((meditation) => (
              <MeditationCard key={meditation.id} meditation={meditation} />
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-7 px-5">
        <SectionTitle actionHref="/discover" actionLabel="See all">
          You Might Like
        </SectionTitle>
        <ul className="mt-3 space-y-2.5">
          {meditations
            .filter((item) => !favorites.includes(item.id))
            .slice(0, 3)
            .map((meditation) => (
              <MeditationCard key={meditation.id} meditation={meditation} />
            ))}
        </ul>
      </div>
    </div>
  );
}
