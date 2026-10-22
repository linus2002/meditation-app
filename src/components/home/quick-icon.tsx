import Image, { type StaticImageData } from 'next/image';

import calendarBase from '@/assets/images/quick/daily-activities-base.png';
import calendarTick from '@/assets/images/quick/daily-activities-tick.png';
import cloudLeft from '@/assets/images/quick/happiness-cloud-left.png';
import cloudRight from '@/assets/images/quick/happiness-cloud-right.png';
import sun from '@/assets/images/quick/happiness-sun.png';
import stones from '@/assets/images/quick/relaxation-base.png';
import leaf from '@/assets/images/quick/relaxation-leaf.png';
import { cn } from '@/lib/utils';

/**
 * Each icon is its artwork split into layers on the same square canvas, so
 * they stack back into the original picture and only the moving part moves.
 * The motion (in globals.css) is slow and small, and stops entirely for
 * anyone who has asked their device for reduced motion.
 */
const LAYERS: Record<string, { src: StaticImageData; motion?: string }[][]> = {
  // The calendar floats, and its tick pops now and then.
  'daily-activities': [
    [
      { src: calendarBase },
      { src: calendarTick, motion: 'quick-tick' },
    ],
  ],
  // The sun breathes while the clouds drift past it.
  happiness: [
    [{ src: sun, motion: 'quick-sun' }],
    [{ src: cloudLeft, motion: 'quick-cloud-left' }],
    [{ src: cloudRight, motion: 'quick-cloud-right' }],
  ],
  // The leaf sways from its stem, as if in a breeze.
  relaxation: [[{ src: stones }, { src: leaf, motion: 'quick-leaf' }]],
};

/** Groups that move together; the calendar's tick rides along with its float. */
const GROUP_MOTION: Record<string, string> = {
  'daily-activities': 'quick-float',
};

export function QuickIcon({ id, className }: { id: string; className?: string }) {
  const groups = LAYERS[id];
  if (!groups) return null;

  return (
    <span aria-hidden="true" className={cn('relative block select-none', className)}>
      {groups.map((layers, index) => (
        <span key={index} className={cn('absolute inset-0', GROUP_MOTION[id])}>
          {layers.map(({ src, motion }) => (
            <Image
              key={src.src}
              src={src}
              alt=""
              fill
              sizes="48px"
              className={cn('object-contain', motion)}
            />
          ))}
        </span>
      ))}
    </span>
  );
}
