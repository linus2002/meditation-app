'use client';

import * as React from 'react';
import Image, { type StaticImageData } from 'next/image';
import { ChevronsLeft } from 'lucide-react';

import { ResumeNote } from '@/components/session/resume-note';
import { BreathingOrb } from '@/components/player/breathing-orb';
import { PlaybackControls } from '@/components/player/playback-controls';
import { SessionComplete } from '@/components/session/session-complete';
import { SessionScrubber } from '@/components/player/session-scrubber';
import { AddToMixButton } from '@/components/mixes/add-to-mix-button';
import { DownloadButton } from '@/components/shared/download-button';
import { FavoriteButton } from '@/components/shared/favorite-button';
import { useBack } from '@/hooks/use-back';
import { useLoop } from '@/hooks/use-loop';
import { useBreath } from '@/hooks/use-breath';
import { useListened } from '@/hooks/use-listened';
import { useSessionRecorder } from '@/hooks/use-session-recorder';
import { usePlayer } from '@/hooks/use-player';
import { useSessionTrack } from '@/hooks/use-session-track';
import { suggestNext } from '@/data/meditations';
import { recommended } from '@/data/recommended';
import { MIN_RECORDED_SECONDS } from '@/data/stats';
import { formatClock, formatMinutesLabel } from '@/lib/format';
import { finishedProperly } from '@/lib/listening';
import { clearResume, readResume, saveResume } from '@/lib/resume';
import { useApp } from '@/providers/app-provider';
import { useBackgroundHold } from '@/hooks/use-background-hold';
import { useLockScreen } from '@/hooks/use-lock-screen';
import { soundscapes } from '@/lib/audio/soundscapes';
import { useAudio, useOnAudioInterrupted } from '@/providers/audio-provider';
import type { Meditation } from '@/types';

export interface PlayerMixMode {
  /** Start as soon as the screen opens (the mix's play tap unlocked audio). */
  autoStart: boolean;
  /** The session ran to its end: the mix moves on instead of showing "Sit again". */
  onFinished: () => void;
}

export function PlayerView({
  meditation,
  backdrop,
  programNext,
  mix,
}: {
  meditation: Meditation;
  /** Replaces the session's own art, e.g. a programme's cover for its sessions. */
  backdrop?: StaticImageData;
  /** The next session in this session's programme, offered ahead of any suggestion. */
  programNext?: Meditation;
  /** Set when playing as part of a mix. */
  mix?: PlayerMixMode;
}) {
  const mixRef = React.useRef(mix);
  mixRef.current = mix;
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

  // Only time heard counts: dragging to the end is not sitting through it.
  const listened = useListened();
  /** What the end of this sitting is credited with, for the completion panel. */
  const [credited, setCredited] = React.useState({ seconds: 0, skipped: false });

  /** Logs reaching the end: finished if most of it was heard, otherwise as far as it went. */
  const creditEnd = React.useCallback(() => {
    const heard = listened.heardRef.current;
    const finished = finishedProperly(heard, meditation.durationSeconds - offsetRef.current);
    recorder.elapsedRef.current = heard;
    if (finished) recorder.markFinished();
    recorder.commit(finished);
    setCredited({ seconds: heard, skipped: !finished });
  }, [listened.heardRef, meditation.durationSeconds, recorder]);

  const handleComplete = React.useCallback(() => {
    // In a mix the next item takes over; no "Sit again" panel in between.
    if (!mixRef.current) setCompleted(true);
    completedRef.current = true;
    clearResume(meditation.id);
    markPlayed(meditation.id);
    creditEnd();
    // Anything played after this (Space on the panel) starts a fresh count.
    listened.reset(meditation.durationSeconds);
    // A single struck bell to close the session, then let the bed fall away.
    bell();
    stopAudio(4);
    mixRef.current?.onFinished();
  }, [markPlayed, meditation.id, meditation.durationSeconds, creditEnd, listened, bell, stopAudio]);

  // With loop on, each time round counts as a finished sitting, marked with a
  // bell, and the next one begins straight away with the sound still playing.
  const [savedLoop, toggleLoop] = useLoop('meditation');
  // In a mix, the mix decides what comes next, so a single session never repeats.
  const loop = mix ? false : savedLoop;
  const handleLoop = React.useCallback(() => {
    clearResume(meditation.id);
    markPlayed(meditation.id);
    creditEnd();
    recorder.restart();
    listened.reset(0);
    offsetRef.current = 0;
    bell();
  }, [markPlayed, meditation.id, creditEnd, recorder, listened, bell]);

  // While a recording loads the clock holds, so nothing is skipped and the
  // time is not counted as listened.
  const [trackState, setTrackState] = React.useState<'ok' | 'loading' | 'failed'>('ok');

  const player = usePlayer({
    durationSeconds: meditation.durationSeconds,
    onComplete: handleComplete,
    loop,
    onLoop: handleLoop,
    held: trackState === 'loading',
  });
  listened.follow(player.elapsed, player.isPlaying && trackState !== 'loading');
  const breath = useBreath(meditation.breathPattern, player.elapsed);

  const { isPlaying, toggle: toggleTransport } = player;
  const { prime } = audio;

  // Sound cut off by a call or the like: hold the place rather than sit on in silence.
  useOnAudioInterrupted(() => {
    if (isPlaying) player.pause();
  });

  // A session with a recording plays it, following the session clock.
  const { start: startTrack } = useSessionTrack(meditation.track, {
    isPlaying,
    elapsed: player.elapsed,
    onInterrupted: player.pause,
    // Played from the lock screen or a headset: the session goes with it.
    onExternalPlay: player.play,
    onStallChange: (stalled) => setTrackState((current) => (stalled ? 'loading' : current === 'loading' ? 'ok' : current)),
    onFailed: () => {
      player.pause();
      setTrackState('failed');
    },
  });

  // A session keeps going with the screen off, even a silent one, and ends with its bell.
  useBackgroundHold(isPlaying);

  // Browsers — iOS and installed PWAs above all — only let audio start inside
  // the tap itself. The bed is started later, from an effect, so the context
  // has to be unlocked here, synchronously, while the gesture is still live.
  const toggle = React.useCallback(() => {
    if (!isPlaying) {
      setTrackState('ok');
      void prime();
      startTrack();
    }
    toggleTransport();
  }, [isPlaying, prime, startTrack, toggleTransport]);

  // The lock-screen player card, from the first press of play until the session ends.
  const startedRef = React.useRef(false);
  if (isPlaying) startedRef.current = true;
  useLockScreen(
    startedRef.current && !completed
      ? {
          title: meditation.title,
          subtitle: meditation.track
            ? 'Guided meditation'
            : `${soundscapes[meditation.soundscape].name} · Breath-paced meditation`,
          artwork: (backdrop ?? meditation.cover ?? meditation.image).src,
          duration: meditation.durationSeconds,
          position: player.elapsed,
          playing: isPlaying,
          canSeek: true,
        }
      : null,
    {
      onPlay: () => {
        if (!isPlaying) toggle();
      },
      onPause: () => player.pause(),
      onSeek: (seconds) => player.seek(seconds),
    },
  );

  // Space and K start or stop the session from anywhere on the screen.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // A focused control answers its own keys (Space presses a button, moves a
      // slider, picks a star); an open dialog owns the keyboard; and a finished
      // session is not restarted by a stray Space under a new record.
      const ownsKeys =
        target?.isContentEditable === true ||
        target?.closest('input, textarea, select, button, a, [role="slider"], [role="radio"], [role="switch"]') !== null;
      if (ownsKeys || completedRef.current || document.querySelector('[aria-modal="true"]')) return;

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
  // A recording carries its own sound, so the synthesised bed stays out of it.
  const hasTrack = Boolean(meditation.track);

  React.useEffect(() => {
    if (isPlaying && ambientOn && !hasTrack) {
      void playAudio(scape);
    } else {
      stopAudio(1.2);
    }
  }, [isPlaying, ambientOn, hasTrack, scape, playAudio, stopAudio]);

  React.useEffect(() => () => stopAudio(0.4), [stopAudio]);

  recorder.elapsedRef.current = listened.heardRef.current;

  // Open where the reader left off, if they left part-way through.
  const [resumedAt, setResumedAt] = React.useState<number | null>(null);
  const { seek } = player;
  const inMix = mix !== undefined;
  React.useEffect(() => {
    // A mix always plays each session from the top.
    if (inMix) return;
    const point = readResume(meditation.id, meditation.durationSeconds);
    if (point === null) return;
    offsetRef.current = point;
    seek(point);
    setResumedAt(point);
  }, [meditation.id, meditation.durationSeconds, seek, inMix]);

  // In a mix, the session starts by itself.
  const autoStartedRef = React.useRef(false);
  const autoStart = mix?.autoStart ?? false;
  const { play: playTransport } = player;
  React.useEffect(() => {
    if (!autoStart || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void prime();
    startTrack();
    playTransport();
  }, [autoStart, prime, startTrack, playTransport]);

  const startFromBeginning = () => {
    offsetRef.current = 0;
    listened.reset(0);
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
    if (listened.heardRef.current >= MIN_RECORDED_SECONDS) {
      markedRef.current = true;
      markPlayed(meditation.id);
    }
  }, [player.elapsed, markPlayed, meditation.id, listened.heardRef]);


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
    () => programNext ?? suggestNext(meditation.id, meditation.category),
    [programNext, meditation.id, meditation.category],
  );

  // Starting over from the completion panel opens a fresh record and rewinds.
  // Defined during render so it always holds the current transport handlers.
  const sitAgain = () => {
    void prime();
    startTrack(0);
    offsetRef.current = 0;
    completedRef.current = false;
    recorder.restart();
    listened.reset(0);
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
          src={backdrop ?? meditation.cover ?? meditation.image}
          alt={meditation.imageAlt}
          fill
          sizes="430px"
          placeholder="blur"
          priority
          className="object-cover"
          style={{ objectPosition: backdrop ? '50% 50%' : (meditation.coverFocus ?? '50% 50%') }}
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
        {/* Finished: the minutes and the rating sit where the art was, so it steps back. */}
        {completed ? (
          <div aria-hidden="true" className="absolute inset-0 bg-[rgb(var(--canvas)/0.86)]" />
        ) : null}
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
            <AddToMixButton item={{ kind: 'meditation', id: meditation.id }} title={meditation.title} />
          </span>
          <span className="flex rounded-full bg-black/25 backdrop-blur-md">
            <FavoriteButton meditationId={meditation.id} title={meditation.title} size="md" />
          </span>
        </div>
      </header>

      {completed ? (
        <div className="relative flex-1 px-7 pb-[clamp(18px,3.8vh,32px)] pt-4">
          <SessionComplete
            seconds={credited.seconds}
            skipped={credited.skipped}
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
          {/* Without a recording, playback is breath cues over ambience. */}
          {hasTrack ? 'Guided audio, breath-paced' : 'Breath-paced, with ambient sound'}
          <br />
          {cycleLabels.join(' · ')}
        </p>
      </div>

      <div className="relative px-7 pb-[clamp(18px,3.8vh,32px)]">
        {resumedAt !== null ? (
          <ResumeNote
            label={formatClock(resumedAt)}
            onStartOver={startFromBeginning}
            className="mb-3"
          />
        ) : null}

        {trackState !== 'ok' ? (
          <p role="status" className="mb-3 text-center text-label leading-relaxed text-ink-soft">
            {trackState === 'loading'
              ? 'Loading the recording…'
              : 'The recording couldn’t load. Check your connection, then press play to try again.'}
          </p>
        ) : null}

        <SessionScrubber
          elapsed={player.elapsed}
          duration={meditation.durationSeconds}
          onSeek={player.seek}
        />

        <PlaybackControls
          isPlaying={player.isPlaying}
          onToggle={toggle}
          onSkip={player.skip}
          loop={loop}
          onToggleLoop={mix ? undefined : toggleLoop}
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
