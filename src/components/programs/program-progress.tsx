'use client';

import Link from 'next/link';
import * as React from 'react';

import { ProgramSessionCard } from '@/components/programs/program-session-card';
import { SectionTitle } from '@/components/shared/section-title';
import type { Program } from '@/data/programs';
import { useApp } from '@/providers/app-provider';

/**
 * The part of a programme's page that follows the reader: the button picks up
 * at the first session not yet finished, and each finished session is ticked.
 * Progress comes from the recorded sittings, so only a session sat to the end
 * counts as done.
 */
export function ProgramProgress({ program }: { program: Program }) {
  const { sessions: history } = useApp();

  const done = React.useMemo(() => {
    const finished = new Set(
      history.filter((record) => record.completed).map((record) => record.meditationId),
    );
    return new Set(program.sessions.filter((s) => finished.has(s.id)).map((s) => s.id));
  }, [history, program.sessions]);

  const nextIndex = program.sessions.findIndex((session) => !done.has(session.id));
  const allDone = program.sessions.length > 0 && nextIndex === -1;
  const target = program.sessions[allDone ? 0 : nextIndex];

  const label =
    done.size === 0
      ? 'Start Session 1'
      : allDone
        ? 'Start again from Session 1'
        : `Continue · Session ${nextIndex + 1}`;

  return (
    <>
      {target ? (
        <div className="px-5">
          <Link
            href={`/player/${target.id}`}
            className="mt-5 flex h-12 w-full items-center justify-center solid-button rounded-full text-body-sm font-medium transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            {label}
          </Link>
        </div>
      ) : null}

      <section className="mt-8 px-5">
        <div className="flex items-baseline justify-between">
          <SectionTitle>Sessions</SectionTitle>
          {done.size > 0 ? (
            <span className="text-label leading-none text-ink-faint">
              {done.size} of {program.sessions.length} done
            </span>
          ) : null}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {program.sessions.map((session, index) => (
            <ProgramSessionCard
              key={session.id}
              session={session}
              position={index + 1}
              image={program.image}
              scrim={program.scrim}
              done={done.has(session.id)}
            />
          ))}
        </ul>
      </section>
    </>
  );
}
