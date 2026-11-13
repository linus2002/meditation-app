import type { StaticImageData } from 'next/image';

import { mixCatalogue, mixItemDetails } from '@/data/mix-items';
import { getYogaSession, yogaSessions } from '@/data/yoga';
import { totalSeconds } from '@/lib/yoga';
import type { ScheduleKind } from '@/lib/schedule';

/** What the calendar shows for a scheduled item, whichever kind it is. */
export interface ScheduleItemDetails {
  kind: ScheduleKind;
  id: string;
  title: string;
  seconds: number;
  image: StaticImageData;
}

export const scheduleKindLabel: Record<ScheduleKind, string> = {
  meditation: 'Meditation',
  story: 'Story',
  yoga: 'Yoga',
};

/** Null when the item is no longer in the catalogue. */
export function scheduleItemDetails(kind: ScheduleKind, id: string): ScheduleItemDetails | null {
  if (kind === 'yoga') {
    const session = getYogaSession(id);
    if (!session) return null;
    return { kind, id, title: session.title, seconds: totalSeconds(session.poses), image: session.image };
  }
  const details = mixItemDetails({ kind, id });
  return details ? { kind, id, title: details.title, seconds: details.seconds, image: details.image } : null;
}

/** Everything that can be scheduled, for the picker. */
export function scheduleCatalogue(kind: ScheduleKind): ScheduleItemDetails[] {
  if (kind === 'yoga') {
    return yogaSessions.map((session) => ({
      kind,
      id: session.id,
      title: session.title,
      seconds: totalSeconds(session.poses),
      image: session.image,
    }));
  }
  return mixCatalogue(kind).map((item) => ({
    kind,
    id: item.item.id,
    title: item.title,
    seconds: item.seconds,
    image: item.image,
  }));
}
