'use client';

import { YogaGlassTile } from '@/components/yoga/yoga-glass-tile';
import type { YogaSession } from '@/data/yoga';
import { useAssessmentRanking } from '@/hooks/use-assessment-picks';
import { prioritise } from '@/lib/assessment';

/*
 * Tile heights, cycled through in order. Sessions are dealt into two columns
 * alternately, so neighbouring tiles never match and the columns interlock,
 * Pinterest-style. The first pair matches so the screen opens on a level row.
 */
const HEIGHTS = [232, 232, 184, 280, 264, 200, 248, 216];

/**
 * The Yoga screen's sessions as a two-column mosaic of glass tiles of uneven
 * heights, so the screen reads as a collection rather than a list. Whatever the
 * assessment suggested comes first.
 */
export function YogaMosaic({ sessions }: { sessions: YogaSession[] }) {
  const suggested = useAssessmentRanking()?.yoga;
  const columns: [YogaSession, number][][] = [[], []];
  prioritise(sessions, suggested).forEach((session, index) => {
    columns[index % 2].push([session, HEIGHTS[index % HEIGHTS.length]]);
  });

  return (
    <div className="grid grid-cols-2 gap-2">
      {columns.map((column, columnIndex) => (
        <ul key={columnIndex} className="flex flex-col gap-2">
          {column.map(([session, height]) => (
            <li key={session.id} style={{ height }}>
              <YogaGlassTile session={session} className="h-full" />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
