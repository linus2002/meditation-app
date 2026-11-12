'use client';

import * as React from 'react';

import { saveResume } from '@/lib/resume';

/**
 * Keeps a player's place, so leaving part-way picks up there next time:
 * every few seconds while playing, on pausing, when the app goes to the
 * background, and on leaving the screen.
 *
 * `position` is in whatever unit the player keeps (seconds, or sentences for a
 * story read by the device). Nothing is kept while `enabled` is false, which a
 * player uses once a session has finished, or before it has begun.
 */
export function useKeepPlace(key: string, position: number, playing: boolean, enabled: boolean) {
  const positionRef = React.useRef(position);
  positionRef.current = position;
  const enabledRef = React.useRef(enabled);
  enabledRef.current = enabled;

  const keep = React.useCallback(() => {
    if (!enabledRef.current || positionRef.current <= 0) return;
    saveResume(key, positionRef.current);
  }, [key]);

  React.useEffect(() => {
    if (!playing) {
      keep();
      return undefined;
    }
    const id = window.setInterval(keep, 5000);
    return () => window.clearInterval(id);
  }, [playing, keep]);

  React.useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') keep();
    };
    window.addEventListener('pagehide', keep);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pagehide', keep);
      document.removeEventListener('visibilitychange', onHidden);
      keep();
    };
  }, [keep]);

  return keep;
}
