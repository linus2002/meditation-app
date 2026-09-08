'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronsLeft, Moon } from 'lucide-react';

import { NarrationControls } from '@/components/stories/narration-controls';
import { StoryFavoriteButton } from '@/components/stories/story-favorite-button';
import { EdgeCurves, WaveLines } from '@/components/shared/decor';
import { useNarration } from '@/hooks/use-narration';
import { estimatedMinutes, estimatedSeconds, segmentStory } from '@/lib/story';
import { cn } from '@/lib/utils';
import { useAudio } from '@/providers/audio-provider';
import type { Story } from '@/types';

/** Wind-down lengths offered while a story is playing. */
const SLEEP_TIMER_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 10, label: '10 min' },
  { value: 20, label: '20 min' },
  { value: 45, label: '45 min' },
] as const;

export function StoryReader({ story }: { story: Story }) {
  const router = useRouter();
  const { play: playBed, stop: stopBed, prime } = useAudio();

  const segments = React.useMemo(() => segmentStory(story), [story]);
  const narration = useNarration(segments);

  const [ambient, setAmbient] = React.useState(false);
  const [timerMinutes, setTimerMinutes] = React.useState(0);
  const [timerEndsAt, setTimerEndsAt] = React.useState<number | null>(null);

  const totalSeconds = estimatedSeconds(story, narration.rate);
  const activeParagraph = segments[narration.index]?.paragraph ?? -1;

  const { speaking, stop: stopNarration } = narration;

  // The sleep timer stops the reading and lets the bed fall away.
  React.useEffect(() => {
    if (!timerEndsAt) return undefined;
    const id = window.setInterval(() => {
      if (Date.now() < timerEndsAt) return;
      window.clearInterval(id);
      setTimerEndsAt(null);
      stopNarration();
      stopBed(12);
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerEndsAt, stopNarration, stopBed]);

  // Arm the timer when narration starts, clear it when the reading stops.
  React.useEffect(() => {
    if (speaking && timerMinutes > 0) {
      setTimerEndsAt((current) => current ?? Date.now() + timerMinutes * 60_000);
    }
    if (!speaking) setTimerEndsAt(null);
  }, [speaking, timerMinutes]);

  // Nothing keeps sounding once the screen is gone.
  React.useEffect(() => () => stopBed(1), [stopBed]);

  const startNarration = async () => {
    await prime();
    if (ambient) void playBed(story.soundscape);
    narration.play();
  };

  const toggleAmbient = async () => {
    if (ambient) {
      setAmbient(false);
      stopBed(1.5);
      return;
    }
    setAmbient(true);
    await prime();
    if (narration.speaking) void playBed(story.soundscape);
  };

  const minutesLeft = timerEndsAt ? Math.ceil((timerEndsAt - Date.now()) / 60_000) : 0;

  return (
    <div className="relative flex min-h-full flex-col">
      <div className="absolute inset-0">
        <Image
          src={story.image}
          alt={story.imageAlt}
          fill
          sizes="430px"
          placeholder="blur"
          priority
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,16,48,0.78)_0%,rgba(14,16,48,0.93)_38%,#0E1030_68%)]"
        />
      </div>

      <WaveLines className="left-0 top-0 h-[240px] w-full" />
      <EdgeCurves className="-right-4 top-[26%] h-[300px] w-[110px]" />

      <header className="relative flex items-center justify-between px-4 pt-[clamp(12px,2.4vh,20px)]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <ChevronsLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <p className="text-[12px] leading-none text-ink-muted">
          {estimatedMinutes(story)} Min. read
        </p>
        <StoryFavoriteButton storyId={story.id} title={story.title} size="md" className="-mr-1" />
      </header>

      <div className="relative px-6 pt-5">
        <h1 className="text-[clamp(24px,7.4vw,29px)] font-bold leading-tight tracking-[-0.02em] text-ink">
          {story.title}
        </h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{story.description}</p>
        <p className="mt-1.5 text-[11.5px] leading-none text-ink-faint">
          Read by {story.voice}
        </p>
      </div>

      {/* Controls sit above the text: this is a listening screen first. */}
      <div className="relative mt-6 px-6">
        {narration.supported ? (
          <>
            <NarrationControls
              narration={narration}
              segments={segments}
              totalSeconds={totalSeconds}
              onStart={startNarration}
            />
          </>
        ) : (
          <p className="rounded-tile bg-[#141733] px-4 py-3.5 text-[12px] leading-relaxed text-ink-muted">
            This browser cannot read aloud, so the story is here to read yourself. Narration works
            in Safari, Chrome and Edge.
          </p>
        )}
      </div>

      {/* Ambience and wind-down */}
      {narration.supported ? (
        <div className="relative mt-6 px-6">
          <div className="rounded-tile bg-[#141733] p-4">
            <button
              type="button"
              onClick={toggleAmbient}
              aria-pressed={ambient}
              className="flex w-full items-center justify-between gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-medium leading-tight text-ink">
                  Sound underneath
                </span>
                <span className="mt-0.5 block text-[11px] leading-tight text-ink-muted">
                  A quiet bed behind the voice
                </span>
              </span>
              <span
                className={cn(
                  'flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors',
                  ambient ? 'bg-action-pill' : 'bg-white/12',
                )}
              >
                <span
                  className={cn(
                    'block h-5 w-5 rounded-full bg-white transition-transform',
                    ambient ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </span>
            </button>

            <div className="mt-4">
              <p id="story-sleep-timer" className="text-[11.5px] leading-none text-ink-muted">
                Stop after
              </p>
              <div
                role="radiogroup"
                aria-labelledby="story-sleep-timer"
                className="mt-2.5 flex flex-wrap gap-2"
              >
                {SLEEP_TIMER_OPTIONS.map((option) => {
                  const selected = timerMinutes === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => {
                        setTimerMinutes(option.value);
                        setTimerEndsAt(
                          option.value > 0 && narration.speaking
                            ? Date.now() + option.value * 60_000
                            : null,
                        );
                      }}
                      className={cn(
                        'rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                        selected
                          ? 'bg-action-pill text-white'
                          : 'bg-white/[0.06] text-ink-muted hover:text-ink',
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {timerEndsAt ? (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] leading-none text-ink-soft">
                  <Moon className="h-3.5 w-3.5 text-aurora-violet" strokeWidth={1.9} />
                  Stopping in about {minutesLeft} min
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* The story itself, with the spoken sentence lifted out of the page. */}
      <article className="relative mt-7 px-6 pb-[clamp(24px,5vh,44px)]">
        {story.paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className={cn(
              'text-[14.5px] leading-[1.85] transition-colors duration-300',
              index > 0 && 'mt-4',
              narration.speaking && index === activeParagraph
                ? 'text-ink'
                : 'text-ink-muted/85',
            )}
          >
            {paragraph}
          </p>
        ))}
      </article>
    </div>
  );
}
