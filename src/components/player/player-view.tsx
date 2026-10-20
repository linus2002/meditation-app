'use client';

import * as React from 'react';
import Image from 'next/image';
import { ChevronsLeft } from 'lucide-react';

import { BreathingOrb } from '@/components/player/breathing-orb';
import { PlaybackControls } from '@/components/player/playback-controls';
import { SessionComplete } from '@/components/session/session-complete';
import { SessionScrubber } from '@/components/player/session-scrubber';
import { VolumeControl } from '@/components/player/volume-control';
import { DownloadButton } from '@/components/shared/download-button';
import { FavoriteButton } from '@/components/shared/favorite-button';
import { useBack } from '@/hooks/use-back';
import { useBreath } from '@/hooks/use-breath';
import { useSessionRecorder } from '@/hooks/use-session-recorder';
import { usePlayer } from '@/hooks/use-player';
import { suggestNext } from '@/data/meditations';
import { recommended } from '@/data/recommended';
import { MIN_RECORDED_SECONDS } from '@/data/stats';
import { formatClock, formatMinutesLabel } from '@/lib/format';
import { clearResume, readResume, saveResume } from '@/lib/resume';
import { useApp } from '@/providers/app-provider';
import { useAudio } from '@/providers/audio-provider';
import type { Meditation } from '@/types';

export function PlayerView({ meditation }: { meditation: Meditation }) {
  const goBack = useBack();
  const { markPlayed, settings } = useApp();
  const audio = useAudio();
  const [completed, setCompleted] = React.useState(false);

  const ambientOn = settings.ambient ?? true;
  const cuesOn = settings.breathCues ?? true;
  const hapticsOn = settings.haptics ?? false;

  const { bell, stop: stopAudio } = audio;

  const recorder = useSessionRecorder(meditation.id);

  // Where this visit picked the session up. Time before it was logged on the
  // earlier visit, so only what is sat from here on counts now.
  const offsetRef = React.useRef(0);
  const completedRef = React.useRef(false);

  const handleComplete = React.useCallback(() => {
    setCompleted(true);
    completedRef.current = true;
    clearResume(meditation.id);
    markPlayed(meditation.id);
    // The ref trails the last render by one tick, so a finished session is
    // logged at its full length rather than a fraction short.
    recorder.elapsedRef.current = meditation.durationSeconds - offsetRef.current;
    recorder.markFinished();
    recorder.commit(true);
    // A single struck bell to close the session, then let the bed fall away.
    bell();
    stopAudio(4);
  }, [markPlayed, meditation.id, meditation.durationSeconds, recorder, bell, stopAudio]);

  const player = usePlayer({
    durationSeconds: meditation.durationSeconds,
    onComplete: handleComplete,
  });
  const breath = useBreath(meditation.breathPattern, player.elapsed);

  const { isPlaying, toggle: toggleTransport } = player;
  const { prime } = audio;

  // Browsers — iOS and installed PWAs above all — only let audio start inside
  // the tap itself. The bed is started later, from an effect, so the context
  // has to be unlocked here, synchronously, while the gesture is still live.
  const toggle = React.useCallback(() => {
    if (!isPlaying) void prime();
    toggleTransport();
  }, [isPlaying, prime, toggleTransport]);

  // Space and K start or stop the session from anywhere on the screen.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true;
      if (typing) return;

      if (event.code === 'Space' || event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  React.useEffect(() => {
    if (isPlaying) setCompleted(false);
  }, [isPlaying]);

  // The ambient bed follows the transport, and never outlives the screen.
  const { play: playAudio } = audio;
  const scape = meditation.soundscape;

  React.useEffect(() => {
    if (isPlaying && ambientOn) {
      void playAudio(scape);
    } else {
      stopAudio(1.2);
    }
  }, [isPlaying, ambientOn, scape, playAudio, stopAudio]);

  React.useEffect(() => () => stopAudio(0.4), [stopAudio]);

  recorder.elapsedRef.current = Math.max(0, player.elapsed - offsetRef.current);

  // Open where the reader left off, if they left part-way through.
  const [resumedAt, setResumedAt] = React.useState<number | null>(null);
  const { seek } = player;
  React.useEffect(() => {
    const point = readResume(meditation.id, meditation.durationSeconds);
    if (point === null) return;
    offsetRef.current = point;
    seek(point);
    setResumedAt(point);
  }, [meditation.id, meditation.durationSeconds, seek]);

  const startFromBeginning = () => {
    offsetRef.current = 0;
    clearResume(meditation.id);
    seek(0);
    setResumedAt(null);
  };

  // The note about picking up only matters until the session is running again.
  React.useEffect(() => {
    if (isPlaying) setResumedAt(null);
  }, [isPlaying]);

  // Keep the place: every few seconds while playing, on pause, when the app
  // goes to the background, and on leaving. Nothing is kept once finished.
  const elapsedRef = React.useRef(0);
  elapsedRef.current = player.elapsed;
  const keepPlace = React.useCallback(() => {
    if (completedRef.current || elapsedRef.current <= 0) return;
    saveResume(meditation.id, elapsedRef.current);
  }, [meditation.id]);

  React.useEffect(() => {
    if (!isPlaying) {
      keepPlace();
      return undefined;
    }
    const id = window.setInterval(keepPlace, 5000);
    return () => window.clearInterval(id);
  }, [isPlaying, keepPlace]);

  React.useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') keepPlace();
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', keepPlace);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', keepPlace);
      keepPlace();
    };
  }, [keepPlace]);

  // Counts as played once a minute has been sat, not only when finished, so a
  // session left part-way still shows under Recently Played.
  const markedRef = React.useRef(false);
  React.useEffect(() => {
    if (markedRef.current) return;
    if (player.elapsed - offsetRef.current >= MIN_RECORDED_SECONDS) {
      markedRef.current = true;
      markPlayed(meditation.id);
    }
  }, [player.elapsed, markPlayed, meditation.id]);


  // Cue tones and a haptic pulse at the top of each inhale and exhale.
  const { breathCue } = audio;
  const phaseIndex = breath.phaseIndex;
  const phaseLabel = breath.phase.label;

  React.useEffect(() => {
    if (!isPlaying) return;

    const direction = phaseLabel.toLowerCase().includes('in')
      ? 'in'
      : phaseLabel.toLowerCase().includes('out')
        ? 'out'
        : null;
    if (!direction) return;

    if (cuesOn) breathCue(direction);
    if (hapticsOn && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(direction === 'in' ? 18 : 30);
    }
    // Keyed on the phase index so each phase fires exactly once.
  }, [phaseIndex, isPlaying, cuesOn, hapticsOn, breathCue, phaseLabel]);

  const cycleLabels = meditation.breathPattern.map((phase) => `${phase.label} ${phase.seconds}`);

  // Sessions picked for the home screen carry a collection name; it joins the
  // pills under the title, like the ones on the home card.
  const collection = recommended.find((item) => item.meditation.id === meditation.id)?.collection;

  const nextUp = React.useMemo(
    () => suggestNext(meditation.id, meditation.category),
    [meditation.id, meditation.category],
  );

  // Starting over from the completion panel opens a fresh record and rewinds.
  // Defined during render so it always holds the current transport handlers.
  const sitAgain = () => {
    void prime();
    offsetRef.current = 0;
    completedRef.current = false;
    recorder.restart();
    setCompleted(false);
    player.seek(0);
    player.play();
  };

  return (
    <div className="relative flex min-h-full flex-col">
      {/*
       * The artwork runs full-bleed across the top half and fades into the
       * page, with the title set over it rather than printed in the image.
       * A purpose-made cover is used where the session has one.
       */}
      <div className="absolute inset-x-0 top-0 h-[min(66vh,580px)] overflow-hidden">
        <Image
          src={meditation.cover ?? meditation.image}
          alt={meditation.imageAlt}
          fill
          sizes="430px"
          placeholder="blur"
          priority
          className="object-cover"
          style={{ objectPosition: meditation.coverFocus ?? '50% 50%' }}
        />
        {/* Shade under the header controls, so they read over bright art. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.42)_0%,rgba(0,0,0,0)_24%)]"
        />
        {/* Then the art settles into the page, where the title sits. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgb(var(--canvas)/0)_38%,rgb(var(--canvas)/0.55)_62%,rgb(var(--canvas)/0.94)_86%,rgb(var(--canvas))_100%)]"
        />
      </div>

      <header className="relative flex items-center justify-between px-4 pt-[calc(var(--header-gap)-10px)] text-white">
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="tap-target flex h-9 w-9 items-center justify-center rounded-full bg-black/25 backdrop-blur-md transition-colors hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <ChevronsLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <div className="flex items-center gap-1.5">
          <span className="flex rounded-full bg-black/25 backdrop-blur-md">
            <DownloadButton meditationId={meditation.id} title={meditation.title} size="md" />
          </span>
          <span className="flex rounded-full bg-black/25 backdrop-blur-md">
            <FavoriteButton meditationId={meditation.id} title={meditation.title} size="md" />
          </span>
        </div>
      </header>

      {completed ? (
        <div className="relative flex-1 px-7 pb-[clamp(18px,3.8vh,32px)] pt-4">
          <SessionComplete
            minutes={Math.round(meditation.durationSeconds / 60)}
            againLabel="Sit again"
            onAgain={sitAgain}
            nextUp={nextUp}
            rated={meditation}
          />
        </div>
      ) : (
        <>
      <div className="relative flex flex-1 flex-col items-center justify-end px-6 pb-[clamp(16px,3vh,28px)] pt-[clamp(8px,2vh,20px)]">
        <BreathingOrb
          breath={breath}
          isPlaying={player.isPlaying}
          className="h-[min(46vw,24vh,180px)] w-[min(46vw,24vh,180px)]"
        />

        {/* The title floats over the foot of the artwork, poster-style. */}
        <div className="mt-[clamp(10px,1.8vh,16px)] text-center">
          <p className="text-caption font-medium leading-none text-ink-soft">{meditation.subtitle}</p>
          <h1 className="mt-2 text-[clamp(1.625rem,8.4vw,2.125rem)] font-medium leading-[1.08] tracking-[-0.02em] text-ink drop-shadow-[0_2px_16px_rgba(0,0,0,0.25)]">
            {meditation.title}
          </h1>
        </div>

        <ul className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {[
            ...(collection ? [collection] : []),
            formatMinutesLabel(meditation.durationSeconds),
            meditation.narrator,
          ].map((label) => (
            <li
              key={label}
              className="rounded-full border border-overlay/15 bg-overlay/[0.08] px-3 py-1.5 text-label font-medium leading-none text-ink-soft backdrop-blur-md"
            >
              {label}
            </li>
          ))}
        </ul>

        <p className="mt-3 text-center text-label leading-relaxed text-ink-faint">
          {/* No recorded voice yet: playback is breath cues over ambience. */}
          Breath-paced, with ambient sound
          <br />
          {cycleLabels.join(' · ')}
        </p>
      </div>

      <div className="relative px-7 pb-[clamp(18px,3.8vh,32px)]">
        {resumedAt !== null ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-overlay/[0.06] py-1 pl-4 pr-1">
            <p className="text-body-sm text-ink-soft">
              Picking up at {formatClock(resumedAt)}
            </p>
            <button
              type="button"
              onClick={startFromBeginning}
              className="h-11 rounded-xl px-3 text-body-sm font-medium text-ink transition-colors hover:bg-overlay/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              Start from the beginning
            </button>
          </div>
        ) : null}

        <SessionScrubber
          elapsed={player.elapsed}
          duration={meditation.durationSeconds}
          onSeek={player.seek}
        />

        <VolumeControl className="mt-4" />

        <PlaybackControls
          isPlaying={player.isPlaying}
          onToggle={toggle}
          onSkip={player.skip}
          className="mt-[clamp(16px,2.8vh,24px)]"
        />

        <p className="mt-[clamp(16px,2.8vh,24px)] text-center text-label leading-relaxed text-ink-muted">
          {meditation.description}
        </p>
      </div>
        </>
      )}
    </div>
  );
}
