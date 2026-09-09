import Image from 'next/image';
import Link from 'next/link';

import { freePrograms } from '@/data/programs';

/**
 * Rail of free multi-session programmes.
 *
 * Wider and taller than the other rails, with the programme title set over the
 * artwork the way the cover art would carry it. The title repeats beneath the
 * card so it survives being scrolled half out of view.
 */
export function ProgramRail() {
  return (
    <ul className="rail flex snap-x snap-mandatory scroll-px-5 gap-3.5 overflow-x-auto px-5 pb-1">
      {freePrograms.map((program) => (
        <li key={program.id} className="w-[82vw] max-w-[330px] shrink-0 snap-start">
          <Link href={program.href} className="group block focus-visible:outline-none">
            <span className="relative block aspect-[16/10] overflow-hidden rounded-[16px]">
              <Image
                src={program.image}
                alt=""
                fill
                sizes="(max-width: 430px) 82vw, 330px"
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
                <span className="text-[clamp(20px,6vw,26px)] font-bold uppercase leading-[1.05] tracking-[0.01em] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)]">
                  {program.title}
                </span>
                <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/80">
                  {program.author}
                </span>
              </span>

              <span className="absolute left-3 top-3 rounded-full bg-canvas-deep/85 px-3 py-1.5 text-[10.5px] font-semibold leading-none text-white backdrop-blur-sm">
                Free
              </span>
            </span>

            <span className="mt-3 block truncate text-[15px] font-semibold leading-tight text-ink">
              {program.title}
            </span>
          </Link>

          <p className="mt-1 truncate text-[12.5px] leading-tight text-ink-muted">
            {program.author} · {program.sessions} sessions
          </p>
        </li>
      ))}
    </ul>
  );
}
