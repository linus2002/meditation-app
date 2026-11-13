/**
 * The background music tracks, shared by stories and yoga. Files live in
 * public/audio/music. They were loudness-normalised (to -16 LUFS) so they sit
 * just under a voice rather than 10 dB below it, which phone speakers lost
 * entirely; the version tag makes phones fetch them afresh rather than keep a
 * cached quiet copy.
 */

export type MusicTrack = 'sleep' | 'relaxation' | 'mindfulness';

const MUSIC_VERSION = 2;

export function musicSrc(track: MusicTrack): string {
  return `/audio/music/${track}.mp3?v=${MUSIC_VERSION}`;
}

/** Each yoga session's track: sleepy ones wind down, calm ones soften, the rest stay bright. */
const YOGA_TRACKS: Record<string, MusicTrack> = {
  'bedtime-yoga': 'sleep',
  'evening-unwind': 'sleep',
  'restorative-rest': 'sleep',
  'calm-the-nerves': 'relaxation',
  'back-release': 'relaxation',
  'neck-shoulders': 'relaxation',
  'hip-opener': 'relaxation',
  'tired-legs': 'relaxation',
  'wall-yoga': 'relaxation',
};

export function yogaMusic(sessionId: string): string {
  return musicSrc(YOGA_TRACKS[sessionId] ?? 'mindfulness');
}
