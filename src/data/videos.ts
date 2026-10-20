import { content } from '@/content';

/**
 * Short portrait videos for the home screen's video rail.
 *
 * Edited in Sanity (Studio → Videos). The clips stream from Sanity's CDN rather
 * than shipping in the app; each has a still, downloaded with the rest of the
 * content, so the card shows something before the clip loads.
 */
export interface HomeVideo {
  id: string;
  title: string;
  /** The small line above the title. */
  eyebrow: string;
  src: string;
  poster: string;
}

export const homeVideos: HomeVideo[] = content.videos;
