'use client';

import * as React from 'react';

import { claimLockScreen, type NowPlaying, type NowPlayingControls } from '@/lib/audio/background';

/** The background soundscape's rank; anything a screen plays outranks it. */
export const SOUNDSCAPE_PRIORITY = 1;
/** A session, story, yoga class, timer or support track. */
export const SCREEN_PRIORITY = 2;

/** How far the card's progress may drift from the player before it's corrected. */
const DRIFT_SECONDS = 2;

/**
 * Shows `info` as the player card on the Android lock screen and in the
 * notification shade, with its buttons calling `controls`. Pass null to show
 * nothing. Android moves the progress bar on its own while playing, so the
 * position is only sent again when the player jumps or drifts.
 */
export function useLockScreen(
  info: NowPlaying | null,
  controls: NowPlayingControls,
  priority: number = SCREEN_PRIORITY,
): void {
  const controlsRef = React.useRef(controls);
  controlsRef.current = controls;
  const positionRef = React.useRef(info?.position ?? 0);
  positionRef.current = info?.position ?? 0;

  const claimRef = React.useRef<ReturnType<typeof claimLockScreen> | null>(null);
  const sentRef = React.useRef<(NowPlaying & { at: number }) | null>(null);

  React.useEffect(() => {
    const claim = claimLockScreen(priority, {
      onPlay: () => controlsRef.current.onPlay(),
      onPause: () => controlsRef.current.onPause(),
      onSeek: (seconds) => controlsRef.current.onSeek?.(seconds),
      position: () => positionRef.current,
    });
    claimRef.current = claim;
    sentRef.current = null;
    return () => {
      claim.release();
      claimRef.current = null;
    };
  }, [priority]);

  // Runs after every render, and only talks to Android when something changed.
  React.useEffect(() => {
    const claim = claimRef.current;
    if (!claim) return;
    const sent = sentRef.current;
    if (!info) {
      if (sent) {
        sentRef.current = null;
        claim.show(null);
      }
      return;
    }
    const now = Date.now();
    const expected = sent
      ? sent.position + (sent.playing ? (now - sent.at) / 1000 : 0)
      : Number.NaN;
    const changed =
      !sent ||
      sent.title !== info.title ||
      sent.subtitle !== info.subtitle ||
      sent.artwork !== info.artwork ||
      sent.duration !== info.duration ||
      sent.playing !== info.playing ||
      sent.canSeek !== info.canSeek ||
      !(Math.abs(info.position - expected) <= DRIFT_SECONDS);
    if (!changed) return;
    sentRef.current = { ...info, at: now };
    claim.show({
      ...info,
      // Android fetches the image itself, so it needs the full address.
      artwork: info.artwork ? new URL(info.artwork, window.location.href).href : undefined,
      position: Math.max(0, info.position),
    });
  });
}
