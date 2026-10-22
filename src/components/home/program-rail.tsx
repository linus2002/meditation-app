import { ProgramCard } from '@/components/programs/program-card';
import type { Program } from '@/data/programs';

/**
 * Rail of free multi-session programmes. Wider and taller than the other
 * rails, so the title over the artwork stays legible.
 */
export function ProgramRail({ programs }: { programs: Program[] }) {
  return (
    <ul className="rail flex snap-x snap-mandatory scroll-px-5 gap-3.5 overflow-x-auto px-5 pb-1">
      {programs.map((program) => (
        <li key={program.id} className="w-[82vw] max-w-[330px] shrink-0 snap-start">
          <ProgramCard program={program} sizes="(max-width: 430px) 82vw, 330px" />
        </li>
      ))}
    </ul>
  );
}
