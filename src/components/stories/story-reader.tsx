'use client';

import * as React from 'react';
import Image from 'next/image';
import { ChevronsLeft, Moon } from 'lucide-react';

import { NarrationControls } from '@/components/stories/narration-controls';
import { StoryFavoriteButton } from '@/components/stories/story-favorite-button';
import { EdgeCurves, WaveLines } from '@/components/shared/decor';
import { useBack } from '@/hooks/use-back';
import { useStoryPlayer } from '@/hooks/use-story-player';
import { estimatedMinutes } from '@/lib/story';
import { handleRovingKey } from '@/lib/roving';
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

/** Composed for the app by scripts/music/compose.mjs, one per story mood. */
const musicFor = (story: Story) => `/audio/music/${story.category}.mp3`;

/** Under the voice, not beside it: about 10 dB quieter than the narration. */
const MUSIC_LEVEL = 0.55;

export function StoryReader({ story }: { story: Story }) {
  const goBack = useBack('/stories');
  const { playMusic, pauseMusic, stopMusic, prime } = useAudio();

  const narration = useStoryPlayer(story);

  const [music, setMusic] = React.useState(true);
  const [timerMinutes, setTimerMinutes] = React.useState(0);
  const [timerEndsAt, setTimerEndsAt] = React.useState<number | null>(null);

  const activeParagraph = narration.activeParagraph;

  const { speaking, paused, stop: stopNarration } = narration;
  const musicSrc = musicFor(story);

  // The sleep timer stops the reading and lets the bed fall away.
  React.useEffect(() => {
    if (!timerEndsAt) return undefined;
    const id = window.setInterval(() => {
      if (Date.now() < timerEndsAt) return;
      window.clearInterval(id);
      setTimerEndsAt(null);
      stopNarration();
      stopMusic(12);
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerEndsAt, stopNarration, stopMusic]);

  // The music follows the voice: in as it starts, down for a pause, and out
  // gently once the last line has been read.
  React.useEffect(() => {
    if (!music) return;
    if (speaking && !paused) playMusic(musicSrc, MUSIC_LEVEL);
    else if (speaking) pauseMusic(0.8);
    else stopMusic(4);
  }, [music, speaking, paused, musicSrc, playMusic, pauseMusic, stopMusic]);

  // Arm the timer when narration starts, clear it when the reading stops.
  React.useEffect(() => {
    if (speaking && timerMinutes > 0) {
      setTimerEndsAt((current) => current ?? Date.now() + timerMinutes * 60_000);
    }
    if (!speaking) setTimerEndsAt(null);
  }, [speaking, timerMinutes]);

  const chooseTimer = (minutes: number) => {
    setTimerMinutes(minutes);
    setTimerEndsAt(minutes > 0 && narration.speaking ? Date.now() + minutes * 60_000 : null);
  };

  // Nothing keeps sounding once the screen is gone.
  React.useEffect(() => () => stopMusic(1), [stopMusic]);

  // Started from the tap itself, so mobile browsers allow the music to play.
  const startNarration = async () => {
    await prime();
    if (music) playMusic(musicSrc, MUSIC_LEVEL);
    narration.play();
  };

  const toggleMusic = async () => {
    if (music) {
      setMusic(false);
      stopMusic(1.5);
      return;
    }
    setMusic(true);
    await prime();
    if (narration.speaking && !narration.paused) playMusic(musicSrc, MUSIC_LEVEL);
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
          className="absolute inset-0 bg-[linear-gradient(180deg,rgb(var(--canvas)/0.78)_0%,rgb(var(--canvas)/0.93)_38%,rgb(var(--canvas))_68%)]"
        />
      </div>

      <WaveLines className="left-0 top-0 h-[240px] w-full" />
      <EdgeCurves className="-right-4 top-[26%] h-[300px] w-[110px]" />

      <header className="relative flex items-center justify-between px-4 pt-[calc(var(--header-gap)-10px)]">
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="tap-target flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <ChevronsLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <p className="text-caption leading-none text-ink-muted">
          {estimatedMinutes(story)} Min. {story.narration ? 'listen' : 'read'}
        </p>
        <StoryFavoriteButton storyId={story.id} title={story.title} size="md" className="-mr-1" />
      </header>

      <div className="relative px-6 pt-5 text-center">
        <div className="relative mx-auto aspect-square w-[52vw] max-w-[200px] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-focus/10">
          <Image
            src={story.cover ?? story.image}
            alt=""
            fill
            sizes="200px"
            placeholder="blur"
            priority
            className="object-cover"
          />
        </div>
        <h1 className="mt-5 text-[clamp(1.25rem,6vw,1.4375rem)] font-semibold leading-tight tracking-[-0.01em] text-ink">
          {story.title}
        </h1>
        <p className="mt-2 text-caption leading-relaxed text-ink-muted">{story.description}</p>
        <p className="mt-1.5 text-label leading-none text-ink-faint">
          Read by {story.voice}
        </p>
      </div>

      {/* Controls sit above the text: this is a listening screen first. */}
      <div className="relative mt-6 px-6">
        {narration.supported ? (
          <>
            <NarrationControls player={narration} onStart={startNarration} />
          </>
        ) : (
          <p className="rounded-tile bg-surface px-4 py-3.5 text-caption leading-relaxed text-ink-muted">
            This browser cannot read aloud, so the story is here to read yourself.
          </p>
        )}
      </div>

      {/* Ambience and wind-down */}
      {narration.supported ? (
        <div className="relative mt-6 px-6">
          <div className="rounded-tile bg-surface p-4">
            <button
              type="button"
              onClick={toggleMusic}
              aria-pressed={music}
              className="flex w-full items-center justify-between gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              <span className="min-w-0">
                <span className="block text-body-sm font-medium leading-tight text-ink">
                  Background music
                </span>
                <span className="mt-0.5 block text-label leading-tight text-ink-muted">
                  Soft music under the voice
                </span>
              </span>
              <span
                className={cn(
                  'flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors',
                  music ? 'bg-action-pill' : 'bg-overlay/12',
                )}
              >
                <span
                  className={cn(
                    'block h-5 w-5 rounded-full bg-ink transition-transform',
                    music ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </span>
            </button>

            <div className="mt-4">
              <p id="story-sleep-timer" className="text-label leading-none text-ink-muted">
                Stop after
              </p>
              <div
                role="radiogroup"
                aria-labelledby="story-sleep-timer"
                className="mt-2.5 flex flex-wrap gap-2"
              >
                {SLEEP_TIMER_OPTIONS.map((option, index) => {
                  const selected = timerMinutes === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => chooseTimer(option.value)}
                      onKeyDown={(event) =>
                        handleRovingKey(event, index, SLEEP_TIMER_OPTIONS.length, (next) =>
                          chooseTimer(SLEEP_TIMER_OPTIONS[next].value),
                        )
                      }
                      className={cn(
                        'rounded-full px-3.5 py-2 text-caption font-medium transition-colors duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                        selected
                          ? 'bg-action-pill text-white'
                          : 'bg-overlay/[0.06] text-ink-muted hover:text-ink',
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {timerEndsAt ? (
                <p className="mt-3 flex items-center gap-1.5 text-label leading-none text-ink-soft">
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
              'text-[0.90625rem] leading-[1.85] transition-colors duration-300',
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
