'use client';

import * as React from 'react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { MeditationCard } from '@/components/shared/meditation-card';
import { SectionTitle } from '@/components/shared/section-title';
import { SleepChart } from '@/components/sleep/sleep-chart';
import { SleepMixer } from '@/components/sleep/sleep-mixer';
import { SleepTimer } from '@/components/sleep/sleep-timer';
import { StoryCard } from '@/components/stories/story-card';
import { sleepSessions } from '@/data/meditations';
import { sleepSummary, sleepWeek } from '@/data/sleep';
import { sleepStories } from '@/data/stories';
import { formatPercent } from '@/lib/format';
import { useAudio } from '@/providers/audio-provider';

const summaryTiles = [
  { label: 'Avg. sleep', value: `${sleepSummary.averageHours.toFixed(1)}h` },
  { label: 'Bedtime', value: sleepSummary.bedtime },
  { label: 'Wake Time', value: sleepSummary.wakeTime },
  { label: 'Deep sleep', value: formatPercent(sleepSummary.deepSleepShare) },
];

/** How long the ambience takes to fall away once the wind-down timer ends. */
const WIND_DOWN_FADE_SECONDS = 20;

export default function SleepPage() {
  const { playing, fadeOut, stop } = useAudio();

  // The timer ends by fading the sound out rather than cutting it, and never
  // rings a bell — the point is to be asleep by then.
  const handleTimerComplete = React.useCallback(() => {
    if (!playing) return;
    fadeOut(WIND_DOWN_FADE_SECONDS);
    window.setTimeout(() => stop(0.5), (WIND_DOWN_FADE_SECONDS + 1) * 1000);
  }, [playing, fadeOut, stop]);

  // Ambience should not follow you off the screen.
  React.useEffect(() => () => stop(1.5), [stop]);

  return (
    <div className="pb-4">
      <ScreenHeader eyebrow="Last 7 nights" title="Sleep Analytics" />

      <div className="mt-6 grid grid-cols-2 gap-2.5 px-5">
        {summaryTiles.map((tile) => (
          <div key={tile.label} className="rounded-tile bg-[#141733] px-4 py-3.5">
            <p className="text-[11px] leading-none text-ink-muted">{tile.label}</p>
            <p className="mt-2 text-[24px] font-light leading-none tracking-[-0.02em] text-ink">
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 px-5">
        <SectionTitle>Hours Per Night</SectionTitle>
        <div className="mt-3">
          <SleepChart nights={sleepWeek} />
        </div>
      </div>

      <div className="mt-6 px-5">
        <SectionTitle>Sleep Sounds</SectionTitle>
        <div className="mt-3">
          <SleepMixer />
        </div>
      </div>

      <div className="mt-6 px-5">
        <SectionTitle>Set A Timer</SectionTitle>
        <div className="mt-3">
          <SleepTimer onComplete={handleTimerComplete} />
        </div>
      </div>

      <div className="mt-6 px-5">
        <SectionTitle actionHref="/stories" actionLabel="All stories">
          Sleep Stories
        </SectionTitle>
        <ul className="mt-3 space-y-2.5">
          {sleepStories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </ul>
      </div>

      <div className="mt-6 px-5">
        <SectionTitle actionHref="/discover?category=sleep" actionLabel="See all">
          Sleep Sessions
        </SectionTitle>
        <ul className="mt-3 space-y-2.5">
          {sleepSessions.map((meditation) => (
            <MeditationCard key={meditation.id} meditation={meditation} />
          ))}
        </ul>
      </div>
    </div>
  );
}
