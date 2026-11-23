'use client';

import Link from 'next/link';

import { PlayerView } from '@/components/player/player-view';
import { ProgramScreen } from '@/components/programs/program-screen';
import { StoryReader } from '@/components/stories/story-reader';
import { YogaPlayer } from '@/components/yoga/yoga-player';
import { getMeditation } from '@/data/meditations';
import { getProgram, programs } from '@/data/programs';
import { getStory } from '@/data/stories';
import { getYogaSession } from '@/data/yoga';

/*
 * The detail screens, looked up by id in the browser.
 *
 * The pages under src/app stay server components so they can list every id for
 * the static build, but they hand over only the id: looking the item up here,
 * at render, is what lets an edit made in Sanity (title, artwork, recording)
 * show without a new build. See src/content/live.ts.
 */

/** Shown when an item was removed in Sanity after this build was made. */
function Gone({ what }: { what: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-8 py-24 text-center">
      <p className="text-body-sm text-ink-muted">This {what} is no longer available.</p>
      <Link
        href="/home"
        className="rounded-full bg-overlay/[0.08] px-5 py-2.5 text-body-sm font-medium text-ink transition-colors hover:bg-overlay/[0.12]"
      >
        Back to home
      </Link>
    </div>
  );
}

export function PlayerScreen({ id }: { id: string }) {
  const meditation = getMeditation(id);
  if (!meditation) return <Gone what="session" />;

  // A programme's sessions wear the programme's cover, as on its page...
  const program = programs.find((item) => item.sessions.some((session) => session.id === id));
  // ...and lead on to the programme's next session, wearing the same cover.
  const following = program?.sessions[program.sessions.findIndex((session) => session.id === id) + 1];
  const programNext = following && program ? { ...following, image: program.image } : undefined;

  return <PlayerView meditation={meditation} backdrop={program?.image} programNext={programNext} />;
}

export function ProgramPageScreen({ id }: { id: string }) {
  const program = getProgram(id);
  if (!program) return <Gone what="program" />;
  return <ProgramScreen program={program} />;
}

export function StoryScreen({ id }: { id: string }) {
  const story = getStory(id);
  if (!story) return <Gone what="story" />;
  return <StoryReader story={story} />;
}

export function YogaScreen({ id }: { id: string }) {
  const session = getYogaSession(id);
  if (!session) return <Gone what="yoga session" />;
  return <YogaPlayer session={session} />;
}
