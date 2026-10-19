import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Play } from 'lucide-react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { ProgramSessionCard } from '@/components/programs/program-session-card';
import { SectionTitle } from '@/components/shared/section-title';
import { freePrograms, getProgram } from '@/data/programs';
import { formatDuration } from '@/lib/format';

export function generateStaticParams() {
  return freePrograms.map((program) => ({ id: program.id }));
}

/**
 * A free programme on a page of its own: its cover, what it is for, a button
 * that starts the first session, and every session as a card in a two-column
 * grid, in the order they are meant to be played.
 */
export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = getProgram(id);

  if (!program) {
    notFound();
  }

  const totalMinutes = Math.round(
    program.sessions.reduce((total, session) => total + session.durationSeconds, 0) / 60,
  );
  const first = program.sessions[0];

  return (
    <div className="pb-6">
      <ScreenHeader eyebrow="Free program" title={program.title} />

      <div className="mt-5 px-5">
        <div className="relative aspect-[16/9] overflow-hidden rounded-[20px]">
          <Image
            src={program.image}
            alt=""
            fill
            priority
            sizes="(max-width: 430px) 100vw, 390px"
            placeholder="blur"
            className="object-cover"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0"
            style={{ backgroundColor: program.scrim }}
          />
          <span className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <span className="text-[clamp(1.375rem,6.5vw,1.75rem)] font-bold uppercase leading-[1.05] tracking-[0.01em] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)]">
              {program.title}
            </span>
            <span className="mt-2 text-label font-semibold uppercase tracking-[0.28em] text-white/80">
              {program.author}
            </span>
          </span>
        </div>

        <p className="mt-4 text-label leading-none text-ink-faint">
          {program.sessions.length} sessions · {formatDuration(totalMinutes)} · {program.level}
        </p>
        <p className="mt-2.5 text-body-sm leading-relaxed text-ink-muted">{program.description}</p>

        {first ? (
          <Link
            href={`/player/${first.id}`}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-action-pill text-body-sm font-semibold text-white transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            <Play className="h-4 w-4 fill-white" strokeWidth={0} />
            Start session 1
          </Link>
        ) : null}
      </div>

      <section className="mt-8 px-5">
        <SectionTitle>Sessions</SectionTitle>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-5">
          {program.sessions.map((session, index) => (
            <ProgramSessionCard
              key={session.id}
              session={session}
              position={index + 1}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
