import Image, { type StaticImageData } from 'next/image';
import { Check } from 'lucide-react';
import Link from 'next/link';

import type { Meditation } from '@/types';

interface ProgramSessionCardProps {
  session: Meditation;
  /** 1-based place in the programme, shown under the title. */
  position: number;
  /** The programme's cover, so every card wears the same picture as the banner. */
  image: StaticImageData;
  /** The banner's tint over that picture, keeping white text readable. */
  scrim: string;
  /** Sat to the end at least once; shows a tick in the corner. */
  done?: boolean;
}

/**
 * One session in a programme, as a card on the programme's own cover: the
 * title at the foot with its place in the programme beneath it. Same picture and tint as the banner above, so the
 * grid reads as one set.
 */
export function ProgramSessionCard({ session, position, image, scrim, done = false }: ProgramSessionCardProps) {
  return (
    <li className="relative flex h-[88px] flex-col overflow-hidden rounded-[10px] p-3 transition-transform duration-200 hover:-translate-y-0.5">
      <Image
        src={image}
        alt=""
        fill
        sizes="(max-width: 430px) 45vw, 195px"
        placeholder="blur"
        className="object-cover"
      />
      <span aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: scrim }} />
      {/* A little extra shade at the foot, where the title sits. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_40%,rgba(0,0,0,0.35)_100%)]"
      />

      {done ? (
        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-black">
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
        </span>
      ) : null}

      <Link
        href={`/player/${session.id}`}
        className="mt-auto before:absolute before:inset-0 before:rounded-[10px] before:content-[''] focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-inset focus-visible:before:ring-focus/70"
      >
        <span className="relative line-clamp-2 text-[0.9375rem] font-semibold leading-tight text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
          {session.title}
        </span>
        <span className="relative mt-1 block text-label leading-none text-white/80">
          {`Session ${position}`}
          {done ? <span className="sr-only"> (done)</span> : null}
        </span>
      </Link>
    </li>
  );
}
