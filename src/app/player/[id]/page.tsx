import { notFound } from 'next/navigation';

import { PlayerView } from '@/components/player/player-view';
import { allSessions, getMeditation } from '@/data/meditations';
import { programs } from '@/data/programs';

export function generateStaticParams() {
  return allSessions.map((meditation) => ({ id: meditation.id }));
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meditation = getMeditation(id);

  if (!meditation) {
    notFound();
  }

  // A programme's sessions wear the programme's cover, as on its page.
  const program = programs.find((item) => item.sessions.some((session) => session.id === id));

  // ...and lead on to the programme's next session, wearing the same cover.
  const following = program?.sessions[program.sessions.findIndex((session) => session.id === id) + 1];
  const programNext = following && program ? { ...following, image: program.image } : undefined;

  return <PlayerView meditation={meditation} backdrop={program?.image} programNext={programNext} />;
}
