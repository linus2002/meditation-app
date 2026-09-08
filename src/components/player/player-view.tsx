'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronsLeft } from 'lucide-react';

import { BreathingOrb } from '@/components/player/breathing-orb';
import { PlaybackControls } from '@/components/player/playback-controls';
import { SessionComplete } from '@/components/session/session-complete';
import { SessionScrubber } from '@/components/player/session-scrubber';
import { VolumeControl } from '@/components/player/volume-control';
import { EdgeCurves, WaveLines } from '@/components/shared/decor';
import { FavoriteButton } from '@/components/shared/favorite-button';
import { useBreath } from '@/hooks/use-breath';
import { useSessionRecorder } from '@/hooks/use-session-recorder';
import { usePlayer } from '@/hooks/use-player';
import { suggestNext } from '@/data/meditations';
import { formatMinutesLabel } from '@/lib/format';
import { useApp } from '@/providers/app-provider';
import { useAudio } from '@/providers/audio-provider';
import type { Meditation } from '@/types';

export function PlayerView({ meditation }: { meditation: Meditation }) {
  const router = useRouter();
  const { markPlayed, settings } = useApp();
  const audio = useAudio();
  const [completed, setCompleted] = React.useState(false);

  const ambientOn = settings.ambient ?? true;
  const cuesOn = settings.breathCues ?? true;
  const hapticsOn = settings.haptics ?? false;

  const { bell, stop: stopAudio } = audio;

  const recorder = useSessionRecorder(meditation.id);

  const handleComplete = React.useCallback(() => {
    setCompleted(true);
    markPlayed(meditation.id);
    // The ref trails the last render by one tick, so a finished session is
    // logged at its full length rather than a fraction short.
    recorder.elapsedRef.current = meditation.durationSeconds;
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

  const { isPlaying, toggle } = player;

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

  recorder.elapsedRef.current = player.elapsed;


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

  const nextUp = React.useMemo(
    () => suggestNext(meditation.id, meditation.category),
    [meditation.id, meditation.category],
  );

  // Starting over from the completion panel opens a fresh record and rewinds.
  // Defined during render so it always holds the current transport handlers.
  const sitAgain = () => {
    recorder.restart();
    setCompleted(false);
    player.seek(0);
    player.play();
  };

  return (
    <div className="relative flex min-h-full flex-col">
      {/* Session artwork, dimmed hard so the controls keep their contrast. */}
      <div className="absolute inset-0">
        <Image
          src={meditation.image}
          alt={meditation.imageAlt}
          fill
          sizes="430px"
          placeholder="blur"
          priority
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,16,48,0.74)_0%,rgba(14,16,48,0.9)_42%,rgba(14,16,48,0.97)_72%,#0E1030_100%)]"
        />
      </div>

      <WaveLines className="left-0 top-0 h-[280px] w-full" />
      <EdgeCurves className="-right-4 top-[30%] h-[320px] w-[110px]" />

      <header className="relative flex items-center justify-between px-4 pt-[clamp(12px,2.4vh,20px)]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <ChevronsLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <p className="text-[12px] font-normal leading-none text-ink-muted">
          {formatMinutesLabel(meditation.durationSeconds)}
        </p>

        <FavoriteButton
          meditationId={meditation.id}
          title={meditation.title}
          size="md"
          className="-mr-1"
        />
      </header>

      {completed ? (
        <div className="relative flex-1 px-7 pb-[clamp(18px,3.8vh,32px)] pt-4">
          <SessionComplete
            minutes={Math.round(meditation.durationSeconds / 60)}
            againLabel="Sit again"
            onAgain={sitAgain}
            nextUp={nextUp}
          />
        </div>
      ) : (
        <>
      <div className="relative flex flex-1 flex-col items-center justify-center px-7 py-[clamp(10px,2.4vh,24px)]">
        <BreathingOrb
          breath={breath}
          isPlaying={player.isPlaying}
          className="h-[min(64vw,33vh,248px)] w-[min(64vw,33vh,248px)]"
        />

        <div className="mt-[clamp(14px,3.8vh,32px)] text-center">
          <p className="text-[12px] leading-none text-ink-muted">{meditation.subtitle}</p>
          <h1 className="mt-2 text-[clamp(21px,6.7vw,26px)] font-bold leading-tight tracking-[-0.02em] text-ink">
            {meditation.title}
          </h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
            with {meditation.narrator}
          </p>
        </div>

        <p className="mt-[clamp(12px,2.4vh,20px)] text-center text-[11.5px] leading-none text-ink-faint">
          {cycleLabels.join(' · ')}
        </p>
      </div>

      <div className="relative px-7 pb-[clamp(18px,3.8vh,32px)]">
        <SessionScrubber
          elapsed={player.elapsed}
          duration={meditation.durationSeconds}
          onSeek={player.seek}
        />

        <VolumeControl className="mt-4" />

        <PlaybackControls
          isPlaying={player.isPlaying}
          onToggle={player.toggle}
          onSkip={player.skip}
          className="mt-[clamp(16px,2.8vh,24px)]"
        />

        <p className="mt-[clamp(16px,2.8vh,24px)] text-center text-[11.5px] leading-relaxed text-ink-muted">
          {meditation.description}
        </p>
      </div>
        </>
      )}
    </div>
  );
}
