/**
 * Short portrait videos for the home screen's video rail.
 *
 * The files live in `public/videos/` (Next does not import video), and each has
 * a still taken from the clip so the card shows something before it loads.
 * Portrait 9:16, encoded so playback can start before the download finishes.
 */
export interface HomeVideo {
  id: string;
  title: string;
  /** The small line above the title. */
  eyebrow: string;
  src: string;
  poster: string;
}

export const homeVideos: HomeVideo[] = [
  {
    id: 'overthinking',
    title: 'Overthinking',
    eyebrow: '2 min watch',
    src: '/videos/overthinking.mp4',
    poster: '/videos/overthinking-poster.jpg',
  },
  {
    id: 'autopilot',
    title: 'Autopilot',
    eyebrow: '2 min watch',
    src: '/videos/videotwo.mp4',
    poster: '/videos/videotwo-poster.jpg',
  },
  {
    id: 'connection',
    title: 'Connection',
    eyebrow: '2 min watch',
    src: '/videos/connection.mp4',
    poster: '/videos/connection-poster.jpg',
  },
  {
    id: 'forgiveness',
    title: 'Forgiveness',
    eyebrow: '2 min watch',
    src: '/videos/forgiveness.mp4',
    poster: '/videos/forgiveness-poster.jpg',
  },
];
