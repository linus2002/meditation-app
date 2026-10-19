import { YogaGlassTile } from '@/components/yoga/yoga-glass-tile';
import { yogaSessions } from '@/data/yoga';

/** How many sessions the home overview shows; the rest live in the Yoga tab. */
const HOME_COUNT = 6;

/**
 * A short overview of yoga on the home screen, in the same glass tiles as the
 * Yoga tab so the two read as one place. The next tile peeks in at the edge,
 * which is what tells you the row scrolls.
 */
export function YogaRail() {
  return (
    <ul className="rail flex snap-x snap-mandatory scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-4 pt-1">
      {yogaSessions.slice(0, HOME_COUNT).map((session) => (
        <li key={session.id} className="h-[220px] w-[44vw] max-w-[180px] shrink-0 snap-start">
          <YogaGlassTile session={session} className="h-full" />
        </li>
      ))}
    </ul>
  );
}
