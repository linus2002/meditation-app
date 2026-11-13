import Image from 'next/image';
import { PersonStanding } from 'lucide-react';

import { glassStyle, yogaColor } from '@/components/yoga/yoga-glass-tile';
import type { ScheduleItemDetails } from '@/data/schedule-items';
import { cn } from '@/lib/utils';

/**
 * The small square beside a scheduled item. Meditations and stories show their
 * artwork; a yoga session shows its own glass colour, as its tile on the Yoga
 * screen does, so each one is recognisable by colour rather than a photo.
 */
export function ScheduleThumb({ item, className }: { item: ScheduleItemDetails; className?: string }) {
  const shape = cn('relative shrink-0 overflow-hidden rounded-[6px]', className);

  if (item.kind === 'yoga') {
    const color = yogaColor(item.id);
    return (
      <span
        aria-hidden="true"
        className={cn(shape, 'flex items-center justify-center')}
        style={{
          ...glassStyle(color),
          // The tiles' deep outer glow is too much at this size; keep the rim.
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), inset 0 0 0 1px rgba(255,255,255,0.12), inset 0 0 10px 1px ${color}66`,
        }}
      >
        <PersonStanding className="h-1/2 w-1/2 text-ink/80" strokeWidth={1.8} />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={shape}>
      <Image src={item.image} alt="" fill sizes="48px" className="object-cover" />
    </span>
  );
}
