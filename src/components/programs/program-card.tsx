import Image from 'next/image';
import Link from 'next/link';

import type { Program } from '@/data/programs';

interface ProgramCardProps {
  program: Program;
  /** Passed to next/image; the card fills whatever width its parent gives it. */
  sizes: string;
}

/**
 * One free programme, with its title set over the artwork the way the cover
 * art would carry it. The title repeats beneath the card so it survives being
 * scrolled half out of view.
 */
export function ProgramCard({ program, sizes }: ProgramCardProps) {
  return (
    <>
      <Link href={program.href} className="group block focus-visible:outline-none">
        <span className="relative block aspect-[16/10] overflow-hidden rounded-[16px]">
          <Image
            src={program.image}
            alt=""
            fill
            sizes={sizes}
            placeholder="blur"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0"
            style={{ backgroundColor: program.scrim }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-[16px] ring-1 ring-inset ring-focus/10 group-focus-visible:ring-2 group-focus-visible:ring-focus"
          />

          <span
            aria-hidden="true"
            className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
          >
            <span className="text-[clamp(1.25rem,6vw,1.625rem)] font-bold uppercase leading-[1.05] tracking-[0.01em] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)]">
              {program.title}
            </span>
            <span className="mt-2 text-label font-semibold uppercase tracking-[0.28em] text-white/80">
              {program.author}
            </span>
          </span>
        </span>

        <span className="mt-3 block truncate text-[0.9375rem] font-semibold leading-tight text-ink">
          {program.title}
        </span>
      </Link>

      <p className="mt-1 truncate text-caption leading-tight text-ink-muted">
        {program.author} · {program.sessions.length} sessions · {program.level}
      </p>
    </>
  );
}
