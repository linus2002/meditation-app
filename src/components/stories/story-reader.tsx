'use client';

import * as React from 'react';
import Image from 'next/image';
import { ChevronsLeft, Moon } from 'lucide-react';

import { AddToMixButton } from '@/components/mixes/add-to-mix-button';
import { NarrationControls } from '@/components/stories/narration-controls';
import { StoryFavoriteButton } from '@/components/stories/story-favorite-button';
import { ResumeNote } from '@/components/session/resume-note';
import { EdgeCurves, WaveLines } from '@/components/shared/decor';
import { useBack } from '@/hooks/use-back';
import { useKeepPlace } from '@/hooks/use-keep-place';
import { useLoop } from '@/hooks/use-loop';
import { useStoryPlayer } from '@/hooks/use-story-player';
import { formatClock } from '@/lib/format';
import { clearResume, FINISHED_FRACTION, readResume, resumeKey } from '@/lib/resume';
import { estimatedMinutes } from '@/lib/story';
import { handleRovingKey } from '@/lib/roving';
import { cn } from '@/lib/utils';
import { useBackgroundHold } from '@/hooks/use-background-hold';
import { useAudio } from '@/providers/audio-provider';
import { musicSrc } from '@/lib/audio/music';
import type { Story } from '@/types';

/**
 * Wind-down lengths offered while a story is playing. Stories run a minute or
 * two, so a timer keeps the music going after the last line until it is up.
 */
const SLEEP_TIMER_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 10, label: '10 min' },
  { value: 20, label: '20 min' },
  { value: 45, label: '45 min' },
] as const;

/** Composed for the app by scripts/music/compose.mjs, one per story mood. */
const musicFor = (story: Story) => musicSrc(story.category);

/**
 * Under the voice but present enough to carry it. With the default master
 * volume (0.7) this sits about 5 dB below the narration, which plays at full.
 */
const MUSIC_LEVEL = 0.8;

export interface StoryMixMode {
  /** Start reading as soon as the screen opens (the mix's play tap unlocked audio). */
  autoStart: boolean;
  /** The story was heard to its end: the mix moves on. */
  onFinished: () => void;
}

export function StoryReader({ story, mix }: { story: Story; mix?: StoryMixMode }) {
  const goBack = useBack('/stories');
  const { playMusic, pauseMusic, stopMusic, prime } = useAudio();

  const [savedLoop, toggleLoop] = useLoop('story');
  // In a mix, the mix decides what comes next, so a single story never repeats.
  const loop = mix ? false : savedLoop;
  const finishedRef = React.useRef(mix?.onFinished);
  finishedRef.current = mix?.onFinished;
  const onEnded = React.useCallback(() => finishedRef.current?.(), []);
  const narration = useStoryPlayer(story, loop, onEnded);

  const [music, setMusic] = React.useState(true);
  const [timerMinutes, setTimerMinutes] = React.useState(0);
  const [timerEndsAt, setTimerEndsAt] = React.useState<number | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  // How long the music takes to leave next time it stops: a slow fade when the
  // sleep timer runs out, a short one when the story simply ends.
  const fadeOutRef = React.useRef(4);

  const activeParagraph = narration.activeParagraph;

  /*
   * Where the story was left. A recording keeps its place in seconds, the
   * device's voice in sentences, so each has its own key: a place kept by one
   * never sends the other to the wrong spot.
   */
  const unit = narration.exact ? 'seconds' : 'sentence';
  const placeKey = resumeKey('story', story.id, unit);
  const seekMax = narration.seek.max;
  const [resumeAt, setResumeAt] = React.useState<number | null>(null);
  const { seekTo } = narration;
  const inMix = mix !== undefined;
  React.useEffect(() => {
    // A mix always plays each story from the top.
    if (seekMax <= 0 || inMix) return;
    const point = readResume(placeKey, seekMax, unit === 'seconds' ? undefined : 2);
    setResumeAt(point);
    if (point !== null) seekTo(point);
    // Read once per kind of reader; seekTo changes identity as it plays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey, seekMax, inMix]);

  const startOver = () => {
    clearResume(placeKey);
    seekTo(0);
    setResumeAt(null);
  };

  const listening = narration.speaking && !narration.paused;
  useKeepPlace(placeKey, narration.seek.value, listening, narration.speaking);

  // A story heard to the end starts from the top next time.
  const furthestRef = React.useRef(0);
  if (narration.speaking) furthestRef.current = narration.seek.value;
  const wasSpeakingRef = React.useRef(false);
  React.useEffect(() => {
    if (narration.speaking) {
      setResumeAt(null);
    } else if (wasSpeakingRef.current && furthestRef.current >= seekMax * FINISHED_FRACTION - 1) {
      clearResume(placeKey);
    }
    wasSpeakingRef.current = narration.speaking;
  }, [narration.speaking, seekMax, placeKey]);

  const { speaking, paused, stop: stopNarration } = narration;
  const musicSrc = musicFor(story);
  const timerRunning = timerEndsAt !== null;

  // A sleep story is listened to with the screen off, music fading out or not.
  useBackgroundHold((speaking && !paused) || timerRunning);

  // The sleep timer: ticks the countdown, and when it runs out stops the
  // reading and lets the music fall away slowly.
  React.useEffect(() => {
    if (!timerEndsAt) return undefined;
    const tick = () => {
      const at = Date.now();
      setNow(at);
      if (at < timerEndsAt) return;
      fadeOutRef.current = 12;
      setTimerEndsAt(null);
      stopNarration();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [timerEndsAt, stopNarration]);

  // The music follows the voice: in as it starts, down for a pause. Once the
  // last line has been read it carries on while a sleep timer is running, and
  // otherwise leaves gently.
  React.useEffect(() => {
    if (!music) return;
    if (speaking && !paused) playMusic(musicSrc, MUSIC_LEVEL);
    else if (speaking) pauseMusic(0.8);
    else if (!timerRunning) {
      stopMusic(fadeOutRef.current);
      fadeOutRef.current = 4;
    }
  }, [music, speaking, paused, timerRunning, musicSrc, playMusic, pauseMusic, stopMusic]);

  // Arm the timer when narration starts. With the music off there is nothing
  // left to wind down once the story ends, so the timer goes with it.
  React.useEffect(() => {
    if (speaking && timerMinutes > 0) {
      setTimerEndsAt((current) => current ?? Date.now() + timerMinutes * 60_000);
    }
    if (!speaking && !music) setTimerEndsAt(null);
  }, [speaking, timerMinutes, music]);

  const chooseTimer = (minutes: number) => {
    setTimerMinutes(minutes);
    const listening = narration.speaking || timerRunning;
    setTimerEndsAt(minutes > 0 && listening ? Date.now() + minutes * 60_000 : null);
  };

  // Nothing keeps sounding once the screen is gone.
  React.useEffect(() => () => stopMusic(1), [stopMusic]);

  // Started from the tap itself, so mobile browsers allow the music to play.
  const startNarration = async () => {
    await prime();
    if (music) playMusic(musicSrc, MUSIC_LEVEL);
    narration.play();
  };

  // In a mix, the story starts by itself once its reader is ready.
  const autoStartedRef = React.useRef(false);
  const autoStart = mix?.autoStart ?? false;
  React.useEffect(() => {
    if (!autoStart || autoStartedRef.current || !narration.supported) return;
    autoStartedRef.current = true;
    void startNarration();
    // startNarration is recreated each render; this runs once per story.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, narration.supported]);

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

  const minutesLeft = timerEndsAt ? Math.max(1, Math.ceil((timerEndsAt - now) / 60_000)) : 0;

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
        <div className="-mr-1 flex items-center">
          <AddToMixButton
            item={{ kind: 'story', id: story.id }}
            title={story.title}
            className="text-ink-muted hover:text-ink"
          />
          <StoryFavoriteButton storyId={story.id} title={story.title} size="md" />
        </div>
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
            {resumeAt !== null ? (
              <ResumeNote
                label={unit === 'seconds' ? formatClock(resumeAt) : `sentence ${resumeAt + 1}`}
                onStartOver={startOver}
                className="mb-3"
              />
            ) : null}
            <NarrationControls
              player={narration}
              onStart={startNarration}
              loop={loop}
              onToggleLoop={mix ? undefined : toggleLoop}
            />
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
                  music ? 'bg-aurora-blue' : 'bg-overlay/12',
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
                          ? 'bg-aurora-blue text-white'
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
                  {speaking
                    ? `Stopping in about ${minutesLeft} min`
                    : `Story finished. Music fades out in about ${minutesLeft} min`}
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
